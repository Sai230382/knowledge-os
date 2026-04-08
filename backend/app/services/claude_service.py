import json
import re
import logging
import asyncio
import time
import anthropic
from json_repair import repair_json
from app.config import settings
from app.schemas.claude_schemas import AnalysisOutput

logger = logging.getLogger(__name__)

# Max chars per chunk sent to Claude (~120K chars ≈ 30K tokens)
# Larger chunks = fewer API calls = lower cost
CHUNK_SIZE = 120000
# Max tables per chunk
TABLES_PER_CHUNK = 20

SYSTEM_PROMPT = """You are a Knowledge Extraction Specialist. Extract knowledge in 4 LAYERS — each layer builds on the previous.

APPROACH:
- Be DESCRIPTIVE: only report what you can directly support with evidence from the text.
- Surface hidden connections that people working in silos would miss.
- If a category has nothing genuine, return an empty list. Never fabricate.
- Think in LAYERS: foundation first, then intelligence, then gaps, then action.

═══ LAYER 1: FOUNDATION — What formally exists ═══

1. KNOWLEDGE GRAPH: The FORMAL entity map — every important person/role, process, technology, and concept, with their official documented relationships. This is the backbone everything else connects to. Max 25 nodes, 35 edges.
   - Edges = formal relationships: "uses", "manages", "requires", "feeds_into", "reports_to", "produces"
   - Be SELECTIVE: only the most important entities, not everything mentioned

2. INDUSTRY PATTERNS: External market trends, regulatory forces, industry dynamics that shape the organization. Max 5. Empty if none found in the text.

═══ LAYER 2: INTELLIGENCE — What's hidden ═══

3. CONTEXT INTELLIGENCE: ALL hidden knowledge in ONE unified list — tribal knowledge, exceptions, workarounds, process variations, hidden patterns. Each item has an intel_type. Max 10.
   - tribal_knowledge: Undocumented know-how only experienced people know
   - exception: Edge cases requiring special handling
   - workaround: Unofficial fixes for known problems
   - process_variation: Different inputs/scenarios triggering different paths
   - hidden_pattern: Unseen trends or dependencies across silos

4. CONTEXT GRAPH: The HIDDEN intelligence layer — uses the SAME nodes as the knowledge graph but adds edges representing undocumented dependencies. Every edge should represent knowledge NOT in any manual. Max 20 edges.
   - CRITICAL: Context graph nodes MUST reuse the same node IDs from the knowledge graph. Do NOT create new nodes — reference existing ones.
   - Each edge must have a context_type: tribal_knowledge|exception|hidden_pattern|workaround
   - Edge labels should be SHORT (5-10 words max)

═══ LAYER 3: GAPS — What's missing ═══

5. GAP ANALYSIS: Where the organization falls short — missing documentation, ownership gaps, process gaps, technology gaps, single points of failure. Max 5. Reference specific knowledge graph entities.

═══ LAYER 4: ACTION — What to do ═══

6. RECOMMENDATIONS: Actionable improvements that address specific gaps and leverage context intelligence. Each recommendation should reference the gap or intelligence it addresses. Max 5.

ENTITY TYPES — use ONLY these 4: person, process, technology, concept
- person: People, roles, teams, departments, organizations
- process: Workflows, procedures, operations, business rules, pipelines
- technology: Software, systems, tools, platforms, data sources, integrations
- concept: Regulations, metrics, standards, strategies, risks, business concepts

JSON Schema:
{"industry_patterns":[{"title":"str","description":"str","confidence":"high|medium|low","evidence":["str"]}],"context_intelligence":[{"title":"str","description":"str","intel_type":"tribal_knowledge|exception|workaround|process_variation|hidden_pattern","trigger":"str","impact":"str","risk_level":"high|medium|low","formalization_action":"str","related_entities":["id"]}],"gap_analysis":[{"title":"str","description":"str","gap_type":"process_gap|knowledge_gap|technology_gap|ownership_gap","risk_level":"high|medium|low","recommendation":"str"}],"recommendations":[{"title":"str","description":"str","priority":"high|medium|low","effort":"str","related_entities":["id"]}],"knowledge_graph":{"nodes":[{"id":"slug","label":"Name","type":"person|process|technology|concept","description":"str"}],"edges":[{"source":"id","target":"id","label":"str","strength":0.8}]},"context_graph":{"nodes":[],"edges":[{"source":"id","target":"id","label":"short label","context_type":"tribal_knowledge|exception|hidden_pattern|workaround","strength":0.7}]}}

IMPORTANT — CONTEXT GRAPH:
- context_graph.nodes should be an EMPTY array (it reuses knowledge_graph nodes)
- context_graph.edges reference node IDs from knowledge_graph
- Edge labels must be SHORT (5-10 words). Full explanation goes in context_intelligence items.

RULES:
- Keep it focused: only the MOST important entities, not everything
- Keep descriptions to 1-2 sentences
- All entity IDs: unique lowercase slugs
- All edges must reference valid node IDs from the knowledge graph
- related_entities in context_intelligence must reference knowledge_graph node IDs
- Every node needs a description
- Respond ONLY with valid JSON, no markdown, no code blocks"""


MERGE_SYSTEM_PROMPT = """You are a Knowledge Synthesis Specialist. Merge multiple partial analyses into one unified result.

Your job:
1. MERGE all sections — deduplicate similar items, combine evidence, keep the best version.
2. MERGE knowledge graphs — deduplicate nodes by ID or similar names, merge edges.
3. MERGE context graphs — preserve context_type on edges, deduplicate.
4. MERGE context_intelligence — deduplicate, preserve intel_type.
5. Where multiple chunks found the same pattern/entity, INCREASE confidence and merge evidence.
6. Create cross-chunk connections in both graphs.
7. MERGE gap_analysis and recommendations — deduplicate, keep highest priority.

ENTITY TYPES — use ONLY these 4: person, process, technology, concept

IMPORTANT:
- context_graph.nodes should be EMPTY (reuses knowledge_graph nodes)
- context_graph.edges reference knowledge_graph node IDs, each with context_type
- Context graph edge labels must be SHORT (5-10 words)
- All entity IDs: unique lowercase slugs
- Every edge must reference valid node IDs
- Deduplicate aggressively
- Every node MUST have a description field
- Respond ONLY with valid JSON"""


def _repair_json(text: str) -> str:
    """Attempt to fix common JSON issues from LLM output."""
    # Remove trailing commas before } or ]
    text = re.sub(r',\s*([}\]])', r'\1', text)

    # Fix missing commas between objects/arrays (}\n{  or ]\n[  or "\n")
    text = re.sub(r'(\})\s*\n\s*(\{)', r'\1,\n\2', text)
    text = re.sub(r'(\])\s*\n\s*(\[)', r'\1,\n\2', text)
    text = re.sub(r'(")\s*\n\s*(")', r'\1,\n\2', text)

    # Fix missing commas between key-value pairs ("value"\n  "key":)
    text = re.sub(r'(")\s*\n(\s*"[^"]+":)', r'\1,\n\2', text)

    return text


def _close_truncated_json(text: str) -> str:
    """Try to close truncated JSON by adding missing brackets/braces.
    When Claude hits max_tokens, the JSON gets cut off mid-stream.
    This function tries to salvage what we have by closing open structures.
    """
    # Strip any trailing incomplete string value (cut mid-string)
    # Look for the last complete key-value or array item
    text = text.rstrip()

    # If it ends mid-string, close the string
    # Count unescaped quotes to check if we're inside a string
    in_string = False
    for i, c in enumerate(text):
        if c == '"' and (i == 0 or text[i - 1] != '\\'):
            in_string = not in_string

    if in_string:
        text += '"'

    # Remove any trailing comma
    text = text.rstrip().rstrip(',')

    # Track what brackets/braces are still open
    stack = []
    in_str = False
    for i, c in enumerate(text):
        if c == '"' and (i == 0 or text[i - 1] != '\\'):
            in_str = not in_str
        if in_str:
            continue
        if c in ('{', '['):
            stack.append(c)
        elif c == '}' and stack and stack[-1] == '{':
            stack.pop()
        elif c == ']' and stack and stack[-1] == '[':
            stack.pop()

    # Close all open brackets/braces in reverse order
    for opener in reversed(stack):
        text += ']' if opener == '[' else '}'

    return text


def _parse_claude_json(raw_text: str) -> dict:
    """Parse JSON from Claude's response using json-repair for bulletproof handling."""
    raw_text = raw_text.strip()

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        raw_text = "\n".join(lines[1:])
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3].strip()

    # Try to extract JSON object if there's surrounding text
    json_match = re.search(r'\{[\s\S]*\}', raw_text)
    if json_match:
        raw_text = json_match.group(0)

    # First try: parse as-is (fastest path)
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        pass

    # Second try: json-repair handles unescaped quotes, trailing commas,
    # missing commas, truncated JSON, and many other LLM JSON issues
    logger.warning("json.loads failed, using json-repair...")
    fixed = repair_json(raw_text, return_objects=True)
    if isinstance(fixed, dict):
        logger.info("json-repair returned dict directly")
        return fixed

    # repair_json returned a string, parse it
    return json.loads(str(fixed))


async def _call_claude(client: anthropic.AsyncAnthropic, system: str, user_prompt: str, max_tokens: int = 12000) -> str:
    """Call Claude API asynchronously and return raw text response.
    Uses prompt caching on the system prompt to reduce cost by ~90% on repeated calls.
    Retries automatically on rate limit (429) errors with backoff.
    """
    max_retries = 3
    for retry in range(max_retries):
        try:
            t0 = time.time()
            response = await client.messages.create(
                model=settings.claude_model,
                max_tokens=max_tokens,
                system=[{
                    "type": "text",
                    "text": system,
                    "cache_control": {"type": "ephemeral"},
                }],
                messages=[{"role": "user", "content": user_prompt}],
            )
            logger.info(
                f"Claude API call: {time.time() - t0:.1f}s, "
                f"in={response.usage.input_tokens} out={response.usage.output_tokens} "
                f"stop={response.stop_reason}"
            )
            if response.stop_reason == "max_tokens":
                logger.warning(f"Response truncated at {max_tokens} tokens! Output may be incomplete.")
            return response.content[0].text.strip()
        except anthropic.RateLimitError as e:
            wait_time = 30 * (retry + 1)  # 30s, 60s, 90s
            logger.warning(f"Rate limit hit, waiting {wait_time}s before retry {retry + 1}/{max_retries}...")
            await asyncio.sleep(wait_time)
            if retry == max_retries - 1:
                raise


async def _call_and_parse(client: anthropic.AsyncAnthropic, system: str, user_prompt: str, max_tokens: int = 12000) -> dict:
    """Call Claude and parse JSON response using json-repair for bulletproof parsing."""
    raw = await _call_claude(client, system, user_prompt, max_tokens)
    return _parse_claude_json(raw)


def _split_text_into_chunks(text: str, chunk_size: int = CHUNK_SIZE) -> list[str]:
    """
    Split text into chunks, trying to break at natural boundaries (sheet dividers, paragraphs).
    """
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    remaining = text

    while remaining:
        if len(remaining) <= chunk_size:
            chunks.append(remaining)
            break

        # Try to find a natural break point near the chunk_size limit
        candidate = remaining[:chunk_size]

        # Prefer breaking at sheet/file boundaries (--- filename ---)
        sheet_break = candidate.rfind("\n--- ")
        if sheet_break > chunk_size * 0.3:
            chunks.append(remaining[:sheet_break].rstrip())
            remaining = remaining[sheet_break:].lstrip()
            continue

        # Next preference: double newline (paragraph boundary)
        para_break = candidate.rfind("\n\n")
        if para_break > chunk_size * 0.3:
            chunks.append(remaining[:para_break].rstrip())
            remaining = remaining[para_break:].lstrip()
            continue

        # Fall back to single newline
        line_break = candidate.rfind("\n")
        if line_break > chunk_size * 0.3:
            chunks.append(remaining[:line_break].rstrip())
            remaining = remaining[line_break:].lstrip()
            continue

        # Hard break at chunk_size
        chunks.append(remaining[:chunk_size])
        remaining = remaining[chunk_size:]

    return [c for c in chunks if c.strip()]


def _distribute_tables(tables: list[dict], num_chunks: int) -> list[list[dict]]:
    """Distribute tables evenly across chunks."""
    if not tables:
        return [[] for _ in range(num_chunks)]

    result = [[] for _ in range(num_chunks)]
    for i, table in enumerate(tables):
        result[i % num_chunks].append(table)
    return result


def _build_chunk_prompt(
    text: str,
    tables: list[dict],
    instructions: str | None,
    chunk_index: int,
    total_chunks: int,
) -> str:
    """Build the prompt for analyzing a single chunk."""
    parts = []

    if total_chunks > 1:
        parts.append(
            f"You are analyzing SECTION {chunk_index + 1} of {total_chunks} of a large document. "
            f"Extract all knowledge from THIS section thoroughly. "
            f"Other sections will be analyzed separately and merged later.\n"
        )

    parts.append("Analyze the following document content and extract structured knowledge.\n")

    if instructions:
        parts.append("## User Instructions / Focus Areas:\n")
        parts.append(instructions)
        parts.append("\nPlease pay special attention to the instructions above when analyzing the content.\n")

    parts.append("## Document Text:\n")
    parts.append(text)

    if tables:
        parts.append("\n\n## Tabular Data:\n")
        parts.append(json.dumps(tables[:TABLES_PER_CHUNK], indent=2))
    else:
        parts.append("\n\n## Tabular Data:\nNo tabular data present in this section.")

    parts.append(
        "\n\nRespond with the JSON structure defined in your instructions. "
        "Ensure all entity IDs in the knowledge graph are unique lowercase slugs. "
        "Ensure every edge references valid node IDs. "
        "Ensure related_entities in context_intelligence reference valid knowledge_graph node IDs. "
        "Context graph nodes should be empty — reuse knowledge_graph node IDs for context edges."
    )
    return "\n".join(parts)


def _local_merge(chunk_results: list[dict]) -> dict:
    """Merge chunk results locally (no Claude call) — saves API cost.
    Simple concatenation + deduplication by node ID.
    """
    merged = {
        "industry_patterns": [],
        "context_intelligence": [],
        "gap_analysis": [],
        "recommendations": [],
        "knowledge_graph": {"nodes": [], "edges": []},
        "context_graph": {"nodes": [], "edges": []},
    }

    seen_pattern_titles = set()
    seen_node_ids = set()
    seen_kg_edge_keys = set()
    seen_ctx_edge_keys = set()

    for result in chunk_results:
        # Merge all list sections (dedupe by title)
        for key in ["industry_patterns", "context_intelligence",
                     "gap_analysis", "recommendations"]:
            for item in result.get(key, []):
                title = item.get("title", "")
                dedup_key = f"{key}:{title.lower().strip()}"
                if dedup_key not in seen_pattern_titles:
                    seen_pattern_titles.add(dedup_key)
                    merged[key].append(item)

        # Merge knowledge graph nodes (the one true node set)
        kg = result.get("knowledge_graph", {})
        for node in kg.get("nodes", []):
            nid = node.get("id", "")
            if nid and nid not in seen_node_ids:
                seen_node_ids.add(nid)
                merged["knowledge_graph"]["nodes"].append(node)
        for edge in kg.get("edges", []):
            edge_key = f"{edge.get('source', '')}→{edge.get('target', '')}"
            src, tgt = edge.get("source", ""), edge.get("target", "")
            if (edge_key not in seen_kg_edge_keys
                    and src in seen_node_ids and tgt in seen_node_ids):
                seen_kg_edge_keys.add(edge_key)
                merged["knowledge_graph"]["edges"].append(edge)

        # Merge context graph edges (nodes come from knowledge graph)
        ctx = result.get("context_graph", {})
        # Also collect any context graph nodes into knowledge graph node set
        for node in ctx.get("nodes", []):
            nid = node.get("id", "")
            if nid and nid not in seen_node_ids:
                seen_node_ids.add(nid)
                merged["knowledge_graph"]["nodes"].append(node)
        for edge in ctx.get("edges", []):
            edge_key = f"ctx:{edge.get('source', '')}→{edge.get('target', '')}"
            src, tgt = edge.get("source", ""), edge.get("target", "")
            if (edge_key not in seen_ctx_edge_keys
                    and src in seen_node_ids and tgt in seen_node_ids):
                seen_ctx_edge_keys.add(edge_key)
                merged["context_graph"]["edges"].append(edge)

    return merged


def _build_merge_prompt(chunk_results: list[dict], instructions: str | None) -> str:
    """Build the prompt for merging multiple chunk analyses."""
    parts = [
        f"You are merging {len(chunk_results)} partial analyses of a large document into one unified result.\n"
    ]

    if instructions:
        parts.append("## Original User Instructions (for context):\n")
        parts.append(instructions)
        parts.append("\n")

    for i, result in enumerate(chunk_results):
        parts.append(f"\n## Analysis from Section {i + 1} of {len(chunk_results)}:\n")
        parts.append(json.dumps(result, indent=1))

    parts.append(
        "\n\n## Your Task:\n"
        "Merge ALL the above analyses into ONE unified result with the same JSON schema. "
        "Deduplicate patterns, entities, and intelligence items. Merge evidence lists. "
        "Create cross-section entity relationships where applicable. "
        "The final result should be comprehensive yet clean — no duplicates.\n"
        "Respond ONLY with valid JSON."
    )
    return "\n".join(parts)


# Max total text to analyze — prevents runaway costs on huge files
# 400K chars ≈ 100K tokens input
MAX_TEXT_LENGTH = 400000


async def analyze_content(text: str, tables: list[dict], instructions: str | None = None) -> tuple[AnalysisOutput, int]:
    """
    Analyze content with automatic chunking for large documents.
    - Small docs (<=120K chars): single pass analysis
    - Large docs: chunk → analyze each → merge results
    - Very large docs (>400K chars): truncated to save cost
    Returns (analysis_output, num_chunks_analyzed)
    """
    client = anthropic.AsyncAnthropic(
        api_key=settings.anthropic_api_key,
        timeout=300.0,  # 5 min max per API call
    )

    # Cap text length to prevent runaway API costs
    original_length = len(text)
    if len(text) > MAX_TEXT_LENGTH:
        logger.warning(
            f"Text too large ({len(text):,} chars), truncating to {MAX_TEXT_LENGTH:,} chars "
            f"to control costs. {len(text) - MAX_TEXT_LENGTH:,} chars skipped."
        )
        text = text[:MAX_TEXT_LENGTH]

    # Split text into chunks
    chunks = _split_text_into_chunks(text)
    num_chunks = len(chunks)

    logger.info(f"Document size: {original_length:,} chars → analyzed {len(text):,} chars → {num_chunks} chunk(s)")

    t_start = time.time()

    if num_chunks == 1:
        # Single chunk — original simple path
        prompt = _build_chunk_prompt(chunks[0], tables, instructions, 0, 1)
        data = await _call_and_parse(client, SYSTEM_PROMPT, prompt)
        logger.info(f"Single-chunk analysis done in {time.time() - t_start:.1f}s")
        return AnalysisOutput(**data), 1

    # Multi-chunk analysis — run ALL chunks in PARALLEL
    table_groups = _distribute_tables(tables, num_chunks)

    async def _analyze_chunk(i: int, chunk_text: str) -> dict:
        t0 = time.time()
        logger.info(f"Chunk {i + 1}/{num_chunks}: starting ({len(chunk_text):,} chars)")
        prompt = _build_chunk_prompt(
            chunk_text, table_groups[i], instructions, i, num_chunks
        )
        data = await _call_and_parse(client, SYSTEM_PROMPT, prompt)
        logger.info(f"Chunk {i + 1}/{num_chunks}: done in {time.time() - t0:.1f}s")
        return data

    # Fire all chunk analyses simultaneously
    logger.info(f"Starting parallel analysis of {num_chunks} chunks...")
    chunk_results = await asyncio.gather(
        *[_analyze_chunk(i, chunk_text) for i, chunk_text in enumerate(chunks)]
    )
    chunk_results = list(chunk_results)
    logger.info(f"All {num_chunks} chunks analyzed in {time.time() - t_start:.1f}s — now merging")

    # Use LOCAL merge (free, no API call) for small chunk counts
    # Only use expensive Claude merge for 6+ chunks where dedup matters more
    if len(chunk_results) <= 5:
        logger.info(f"Using local merge for {len(chunk_results)} chunks (saves API cost)")
        data = _local_merge(chunk_results)
        logger.info(f"Local merge done in {time.time() - t_start:.1f}s total")
        return AnalysisOutput(**data), num_chunks

    # For many chunks, merge locally first (free), then do ONE Claude polish pass
    logger.info(f"Local merge of {len(chunk_results)} chunks, then Claude polish pass")
    local_merged = _local_merge(chunk_results)

    # Single Claude call to deduplicate and clean up the merged result
    t_merge = time.time()
    merge_prompt = _build_merge_prompt([local_merged], instructions)
    data = await _call_and_parse(client, MERGE_SYSTEM_PROMPT, merge_prompt, max_tokens=12000)
    logger.info(f"Claude polish done in {time.time() - t_merge:.1f}s — total: {time.time() - t_start:.1f}s")

    return AnalysisOutput(**data), num_chunks


REFINE_SYSTEM_PROMPT = """You are a Knowledge Analysis Assistant. You have a current analysis and the user wants to refine, query, or expand it.

Based on the user's request, produce an UPDATED version of the analysis JSON. You may:
- Add/remove patterns, entities, gaps, intelligence items, or recommendations
- Expand details on specific areas
- Add new graph connections
- Adjust confidence/priority/risk levels
- Answer questions by incorporating answers INTO the analysis

ENTITY TYPES — use ONLY these 4: person, process, technology, concept

IMPORTANT RULES:
- Return the COMPLETE updated analysis JSON (not just changes)
- Keep existing items unless user explicitly asks to remove them
- context_graph.nodes should be EMPTY (reuses knowledge_graph nodes)
- context_graph.edges reference knowledge_graph node IDs, each with context_type
- Context graph edge labels must be SHORT (5-10 words)
- All entity IDs: unique lowercase slugs
- Every edge must reference valid node IDs
- Every node MUST have a description field
- Respond ONLY with valid JSON, no markdown

JSON Schema:
{"industry_patterns":[{"title":"str","description":"str","confidence":"high|medium|low","evidence":["str"]}],"context_intelligence":[{"title":"str","description":"str","intel_type":"tribal_knowledge|exception|workaround|process_variation|hidden_pattern","trigger":"str","impact":"str","risk_level":"high|medium|low","formalization_action":"str","related_entities":["id"]}],"gap_analysis":[{"title":"str","description":"str","gap_type":"process_gap|knowledge_gap|technology_gap|ownership_gap","risk_level":"high|medium|low","recommendation":"str"}],"recommendations":[{"title":"str","description":"str","priority":"high|medium|low","effort":"str","related_entities":["id"]}],"knowledge_graph":{"nodes":[{"id":"slug","label":"Name","type":"person|process|technology|concept","description":"str"}],"edges":[{"source":"id","target":"id","label":"str","strength":0.8}]},"context_graph":{"nodes":[],"edges":[{"source":"id","target":"id","label":"short label","context_type":"tribal_knowledge|exception|hidden_pattern|workaround","strength":0.7}]}}"""


async def refine_analysis(
    current_analysis: dict,
    user_query: str,
) -> AnalysisOutput:
    """
    Refine/query an existing analysis based on user input.
    The user can ask questions, request more detail, add connections, etc.
    """
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=300.0)

    # Truncate the current analysis if it's too large
    analysis_json = json.dumps(current_analysis, indent=1)
    if len(analysis_json) > 120000:
        analysis_json = analysis_json[:120000] + "\n... (truncated)"

    prompt = (
        f"## Current Analysis:\n{analysis_json}\n\n"
        f"## User Request:\n{user_query}\n\n"
        f"Update the analysis based on the user's request. "
        f"Return the COMPLETE updated analysis JSON."
    )

    data = await _call_and_parse(client, REFINE_SYSTEM_PROMPT, prompt, max_tokens=12000)
    return AnalysisOutput(**data)


ACCUMULATE_SYSTEM_PROMPT = """You are a Knowledge Accumulation Specialist. Merge an EXISTING analysis with a NEW analysis into one unified result.

Rules:
- Keep ALL existing knowledge — never drop previous findings
- Add all NEW patterns, entities, intelligence items, gaps, and recommendations
- Deduplicate — merge matching items, combine evidence, take higher confidence
- Create CROSS-DOCUMENT connections in both knowledge and context graphs
- The result should represent ACCUMULATED knowledge across all documents

ENTITY TYPES — use ONLY these 4: person, process, technology, concept

IMPORTANT:
- context_graph.nodes should be EMPTY (reuses knowledge_graph nodes)
- context_graph.edges reference knowledge_graph node IDs, each with context_type
- Context graph edge labels must be SHORT (5-10 words)
- All entity IDs: unique lowercase slugs
- Every edge must reference valid node IDs
- Every node MUST have a description field
- Respond ONLY with valid JSON, no markdown"""


async def accumulate_analysis(
    existing_analysis: dict,
    new_analysis: dict,
) -> AnalysisOutput:
    """
    Merge a new analysis into an existing one, accumulating knowledge.
    """
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=300.0)

    existing_json = json.dumps(existing_analysis, indent=1)
    new_json = json.dumps(new_analysis, indent=1)

    # If combined is too large, truncate the existing one (keep new in full)
    if len(existing_json) + len(new_json) > 150000:
        max_existing = 150000 - len(new_json) - 1000
        if max_existing < 10000:
            max_existing = 10000
        existing_json = existing_json[:max_existing] + "\n... (truncated)"

    prompt = (
        f"## Existing Analysis (from previous documents):\n{existing_json}\n\n"
        f"## New Analysis (from newly uploaded documents):\n{new_json}\n\n"
        f"Merge these into ONE unified analysis. Keep all existing knowledge and add new findings. "
        f"Deduplicate and create cross-document connections. "
        f"Return the COMPLETE merged analysis JSON."
    )

    data = await _call_and_parse(client, ACCUMULATE_SYSTEM_PROMPT, prompt, max_tokens=16384)
    return AnalysisOutput(**data)


# ── Industry Benchmarks ──────────────────────────────────────────────

BENCHMARK_SYSTEM_PROMPT = """You are an Industry Benchmarking Specialist. Compare an organization's current processes, gaps, and practices against industry best practices.

For each significant process or gap area found in the analysis:
1. AREA: The process or capability being benchmarked
2. CURRENT STATE: What the organization does today (from the analysis)
3. INDUSTRY BENCHMARK: What best-in-class organizations do
4. DELTA: The specific gap between current and best practice
5. MATURITY SCORE: 1=ad-hoc, 2=developing, 3=defined, 4=managed, 5=optimized
6. PRIORITY: high, medium, or low (based on business impact of closing the gap)

Focus on the most impactful areas. Max 8 comparisons.

JSON output schema:
{"industry":"str","comparisons":[{"area":"str","current_state":"str","industry_benchmark":"str","delta":"str","maturity_score":3.0,"priority":"high|medium|low"}],"overall_maturity":3.0,"summary":"str"}

RULES:
- Be specific to the industry evident in the analysis
- Reference actual processes and entities from the analysis data
- Maturity scores should be honest — do not inflate
- The summary should be 2-3 sentences about the overall maturity posture
- Respond ONLY with valid JSON, no markdown or commentary"""


async def generate_benchmarks(
    current_analysis: dict,
    industry_context: str | None = None,
) -> dict:
    """Generate industry benchmark comparisons for the current analysis."""
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=300.0)

    analysis_json = json.dumps(current_analysis, indent=1)
    if len(analysis_json) > 120000:
        analysis_json = analysis_json[:120000] + "\n... (truncated)"

    parts = [f"## Current Analysis:\n{analysis_json}\n"]
    if industry_context and industry_context.strip():
        parts.append(f"\n## Industry Context (from user):\n{industry_context}\n")
    parts.append(
        "\nGenerate industry benchmark comparisons for the key processes and gaps identified. "
        "Return the COMPLETE benchmark JSON."
    )

    return await _call_and_parse(client, BENCHMARK_SYSTEM_PROMPT, "\n".join(parts), max_tokens=8000)


# ── Reimagine Lab ────────────────────────────────────────────────────

REIMAGINE_SYSTEM_PROMPT = """You are an AI Transformation Architect. Analyze an organization's current processes and design how AI, Agentic AI, and intelligent automation can transform them.

For each key process found in the analysis:
1. PROCESS NAME: The process being reimagined
2. AS-IS: Current state — manual steps, pain points, gaps, tribal knowledge dependencies
3. TO-BE: AI-transformed future state — automated, intelligent, autonomous
4. AI TECHNOLOGY: Specific technology that enables the transformation (e.g., Agentic AI workflow orchestration, LLM-powered document extraction, predictive analytics, intelligent routing, conversational AI agents, RPA + AI hybrid)
5. IMPACT SCORE: 1-10 (10 = transformative business impact)
6. IMPLEMENTATION EFFORT: low, medium, or high
7. TIMELINE: Estimated implementation timeline (e.g., "2-3 months", "6-12 months")

Focus on the highest-impact transformations. Max 8 processes.

JSON output schema:
{"processes":[{"process_name":"str","as_is":"str","to_be":"str","ai_technology":"str","impact_score":7.0,"implementation_effort":"low|medium|high","timeline":"str"}],"transformation_summary":"str","total_impact_score":7.0}

RULES:
- Be SPECIFIC about which AI technology applies — never generic "use AI"
- Reference actual processes, tribal knowledge, and gaps from the analysis
- Prioritize Agentic AI opportunities where autonomous decision-making replaces manual workflows
- Show how context intelligence (tribal knowledge, workarounds) can be formalized into AI systems
- Impact scores should reflect genuine business value
- The transformation_summary should be 2-3 sentences about the overall AI transformation potential
- Respond ONLY with valid JSON, no markdown or commentary"""


async def generate_reimagine(
    current_analysis: dict,
) -> dict:
    """Generate AI transformation scenarios for current processes."""
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=300.0)

    analysis_json = json.dumps(current_analysis, indent=1)
    if len(analysis_json) > 120000:
        analysis_json = analysis_json[:120000] + "\n... (truncated)"

    prompt = (
        f"## Current Analysis:\n{analysis_json}\n\n"
        f"Generate AI and Agentic AI transformation scenarios for the key processes. "
        f"Show how each process transforms from its current manual/fragmented state "
        f"to an AI-powered, intelligent future state. "
        f"Pay special attention to tribal knowledge and workarounds that can be formalized into AI systems. "
        f"Return the COMPLETE reimagine JSON."
    )

    return await _call_and_parse(client, REIMAGINE_SYSTEM_PROMPT, prompt, max_tokens=8000)


# ── Process Flow Charts ─────────────────────────────────────────────

PROCESS_FLOW_SYSTEM_PROMPT = """You are a Process Flow Extraction Specialist. Analyze an organization's knowledge base and extract structured, step-by-step process flows suitable for flowchart visualization.

For each distinct end-to-end process found in the analysis:
1. PROCESS_ID: Unique lowercase slug identifier
2. PROCESS_NAME: Human-readable name
3. DESCRIPTION: 1-2 sentence summary of the process
4. STEPS: Ordered list of steps with proper flow connections
5. EXCEPTIONS: Related context intelligence items (tribal knowledge, exceptions, workarounds)

STEP TYPES:
- "start": The entry point of a process. Exactly ONE per process. Label should be "Start: <trigger>"
- "end": The terminal point. At least ONE per process. Label should be "End: <outcome>"
- "action": A concrete activity, task, or operation performed by someone/something
- "decision": A branching point with a condition. MUST have branch_labels mapping each next_step ID to a label like "Yes"/"No" or "Approved"/"Rejected"
- "exception": An error-handling or edge-case path. Should reference context_intelligence items

RULES FOR STEPS:
- Each process MUST start with exactly one "start" step and end with at least one "end" step
- Every step MUST have next_steps (except "end" steps which have empty next_steps)
- Decision steps MUST have exactly 2-3 next_steps with branch_labels for each
- Action steps typically have 1 next_step
- Exception steps can rejoin the main flow or lead to an "end" step
- Max 15 steps per process to keep flowcharts readable
- Step IDs must be unique within the process (lowercase slugs)
- related_entities should reference knowledge_graph node IDs where applicable

IDENTIFICATION RULES:
- Extract 3-8 distinct processes — look for end-to-end workflows, not sub-tasks
- Processes should represent complete business workflows from trigger to outcome
- Include decision points where the process branches based on conditions
- Include exception/error paths where tribal knowledge or workarounds apply
- Sub-processes should be represented as action steps within their parent process, NOT as separate processes

JSON output schema:
{"process_flows":[{"process_id":"slug","process_name":"str","description":"str","steps":[{"id":"slug","label":"str","description":"str","step_type":"start|action|decision|end|exception","next_steps":["step-id"],"condition":"str (for decisions)","branch_labels":{"step-id":"Yes","step-id":"No"},"related_entities":["kg-node-id"]}],"exceptions":["context intelligence title"]}]}

Respond ONLY with valid JSON, no markdown or commentary."""


async def generate_process_flows(
    current_analysis: dict,
) -> dict:
    """Generate process flow charts from the current analysis."""
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=300.0)

    analysis_json = json.dumps(current_analysis, indent=1)
    if len(analysis_json) > 120000:
        analysis_json = analysis_json[:120000] + "\n... (truncated)"

    prompt = (
        f"## Current Analysis:\n{analysis_json}\n\n"
        f"Extract all distinct end-to-end processes from this analysis as structured flowcharts. "
        f"Each process should have a clear start, ordered steps, decision points with branches, "
        f"exception paths where tribal knowledge or workarounds apply, and clear end states. "
        f"Reference knowledge graph entities in related_entities where applicable. "
        f"Return the COMPLETE process flows JSON."
    )

    return await _call_and_parse(client, PROCESS_FLOW_SYSTEM_PROMPT, prompt, max_tokens=10000)


# ── To-Be Process Flows (AI-Transformed) ─────────────────────────────

TO_BE_PROCESS_FLOW_SYSTEM_PROMPT = """You are an AI Process Transformation Architect. Given an As-Is process flow and optional AI transformation insights, generate the optimized To-Be process flow showing how AI, Agentic AI, and intelligent automation transform the process.

For EACH As-Is process provided, generate the corresponding To-Be flow with these rules:

CHANGE_TYPE for each step:
- "unchanged": Step exists in As-Is and remains the same in To-Be
- "new": A brand-new AI-powered step that doesn't exist in As-Is (e.g., AI classification, predictive routing, automated validation)
- "modified": Step exists in As-Is but is enhanced/modified in To-Be (e.g., manual review → AI-assisted review)
- "eliminated": Step from As-Is that is removed in To-Be (include it with empty next_steps so it shows as faded/strikethrough)

RULES:
- Keep the same process_id and process_name as the As-Is flow
- The To-Be flow should show a realistic AI transformation — not everything changes
- Typically 30-60% of steps change (new, modified, or eliminated)
- New AI steps should reference specific AI technologies (NLP, ML, Computer Vision, Agentic AI, LLM, RPA, etc.)
- Eliminated steps should still appear in the steps array with change_type: "eliminated" and empty next_steps
- Decision points may become automated classifiers
- Manual reviews may become AI-assisted with human-in-the-loop
- Exception handling may become predictive prevention
- Include transformation_summary: 2-3 sentences describing the key transformation
- Include ai_technologies_used: list of AI technologies applied
- Max 18 steps per process (may add a few new ones beyond the original)

JSON output schema:
{"process_flows":[{"process_id":"slug","process_name":"str","description":"str","transformation_summary":"str","ai_technologies_used":["str"],"steps":[{"id":"slug","label":"str","description":"str","step_type":"start|action|decision|end|exception","next_steps":["step-id"],"condition":"str","branch_labels":{"step-id":"label"},"related_entities":[],"change_type":"unchanged|new|modified|eliminated"}],"exceptions":["str"]}]}

Respond ONLY with valid JSON, no markdown or commentary."""


async def generate_tobe_process_flows(
    current_analysis: dict,
    as_is_flows: list[dict],
    reimagine_data: dict | None = None,
) -> dict:
    """Generate To-Be (AI-transformed) process flows from As-Is flows."""
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=300.0)

    analysis_json = json.dumps(current_analysis, indent=1)
    if len(analysis_json) > 80000:
        analysis_json = analysis_json[:80000] + "\n... (truncated)"

    as_is_json = json.dumps(as_is_flows, indent=1)

    parts = [
        f"## Current Analysis Context:\n{analysis_json}\n",
        f"\n## As-Is Process Flows (transform these):\n{as_is_json}\n",
    ]

    if reimagine_data:
        reimagine_json = json.dumps(reimagine_data, indent=1)
        if len(reimagine_json) > 30000:
            reimagine_json = reimagine_json[:30000] + "\n... (truncated)"
        parts.append(f"\n## AI Transformation Insights (use these to inform To-Be):\n{reimagine_json}\n")

    parts.append(
        "\nTransform each As-Is process flow into an AI-powered To-Be flow. "
        "Mark each step with change_type: unchanged, new, modified, or eliminated. "
        "New AI steps should be specific (e.g., 'AI Document Classifier' not just 'AI Step'). "
        "Return the COMPLETE to-be process flows JSON."
    )

    return await _call_and_parse(client, TO_BE_PROCESS_FLOW_SYSTEM_PROMPT, "\n".join(parts), max_tokens=12000)


# ── Knowledge Synthesis ──────────────────────────────────────────────

SYNTHESIS_SYSTEM_PROMPT = """You are a Knowledge Intelligence Synthesizer. Your job is to distill a comprehensive document analysis into a concise, executive-ready knowledge summary.

You will receive a full analysis containing: industry patterns, context intelligence (tribal knowledge, exceptions, workarounds, hidden patterns), gap analysis, recommendations, and knowledge/context graph data.

Create a synthesis that a stakeholder can read in 2-3 minutes and understand:
1. What was found (the landscape)
2. What's hidden (tribal knowledge, undocumented dependencies)
3. What's at risk (critical gaps, fragile processes)
4. What to do about it (prioritized actions)

JSON output schema:
{"title":"str - descriptive title for this knowledge base","executive_summary":"str - 3-4 sentence overview of the most important findings","sections":[{"heading":"str","content":"str - 2-4 sentences, specific and actionable","severity":"info|warning|critical|success"}],"key_risks":["str - one-line risk statements, max 5"],"quick_wins":["str - low-effort, high-impact actions, max 5"],"strategic_recommendations":["str - longer-term strategic actions, max 5"]}

RULES:
- Write in clear, direct business language — no jargon
- Be SPECIFIC — reference actual processes, systems, and entities from the analysis
- Sections should cover: Key Processes, Hidden Knowledge, Critical Gaps, Technology Landscape, and Organizational Patterns
- If process flow data is provided, include a section summarizing the key process flows, their complexity, decision points, and exception paths
- Max 7 sections
- Each risk, quick win, and recommendation should be one concise sentence
- If the user included a question, address it directly in the executive summary
- Respond ONLY with valid JSON, no markdown or commentary"""


async def generate_synthesis(
    current_analysis: dict,
    query: str | None = None,
    process_flows: list[dict] | None = None,
) -> dict:
    """Generate a knowledge synthesis from the full analysis."""
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=300.0)

    analysis_json = json.dumps(current_analysis, indent=1)
    if len(analysis_json) > 120000:
        analysis_json = analysis_json[:120000] + "\n... (truncated)"

    parts = [f"## Full Analysis Data:\n{analysis_json}\n"]
    if process_flows:
        pf_json = json.dumps(process_flows, indent=1)
        if len(pf_json) > 30000:
            pf_json = pf_json[:30000] + "\n... (truncated)"
        parts.append(f"\n## Process Flows Extracted:\n{pf_json}\n")
    if query and query.strip():
        parts.append(f"\n## User Question to Address:\n{query}\n")
    parts.append(
        "\nSynthesize the key findings into a concise executive knowledge summary. "
        "If process flow data is provided, include a section about key processes. "
        "Return the COMPLETE synthesis JSON."
    )

    return await _call_and_parse(client, SYNTHESIS_SYSTEM_PROMPT, "\n".join(parts), max_tokens=8000)


# ─── SOP Generation ─────────────────────────────────────────

SOP_SYSTEM_PROMPT = """You are a Standard Operating Procedure (SOP) Document Specialist. Transform analysis data into a professional SOP following the corporate VM SOP template format.

You will receive analysis data containing: knowledge graph, context intelligence (tribal knowledge, exceptions, workarounds), gap analysis, recommendations, and optionally process flow data.

JSON output schema — follow this EXACTLY:
{
  "sop_title": "str - Professional SOP title (e.g., 'Transaction Dispute Processing')",
  "sop_number": "str - SOP reference number (e.g., 'SOP-OPS-001')",
  "sop_owner": "str - Role that owns this SOP (e.g., 'Operations Manager')",
  "last_attestation_date": "str - today's date as dd/mm/yyyy",
  "creation_date": "str - today's date as dd/mm/yyyy",
  "document_author": "str - 'Contextus Knowledge OS'",
  "approved_by": "str - '<Pending Approval>'",
  "version": "1.0",

  "purpose_and_scope": "str - 2-4 sentences explaining what this SOP covers and why it exists",

  "acronyms": [
    {"abbreviation": "str", "long_form": "str"}
  ],

  "systems_used": ["str - System/tool names used in this process group"],

  "process_map_description": "str - 2-3 sentences describing the high-level process flow. Reference the key phases and decision points.",

  "roles_responsibilities": [
    {"role": "str - role title", "responsibility": "str - what they do in this process"}
  ],

  "process_narrative_intro": "str - 1-2 sentences describing the overall process outcome (e.g., 'This SOP demonstrates the outcome of a loan origination request coming from the borrower via the portal.')",

  "upstream_dependencies": ["str - upstream process or input that feeds into this SOP"],
  "downstream_dependencies": ["str - downstream process or output that this SOP feeds"],

  "phases": [
    {
      "phase_number": 1,
      "title": "str - Phase title matching process map (e.g., 'Application Receipt & Validation')",
      "description": "str - 2-3 sentences describing this phase",
      "role_performed_by": "str - Role that performs this phase",
      "sub_steps": [
        {
          "step_number": "1.1",
          "title": "str - Sub-step title",
          "description": "str - Detailed step instructions (2-4 sentences). Be specific about WHAT, HOW, and WHEN.",
          "screenshot_description": "str - Describe what screenshot should show (e.g., 'Screenshot of the CRM system showing the new dispute form with Customer ID, Transaction Date, and Amount fields highlighted'). Be specific about the screen, UI elements, and what to capture.",
          "tips_notes": ["str - Tribal knowledge, warnings, best practices from context intelligence"]
        }
      ]
    }
  ],

  "related_documents": [
    {"title": "str - Document name/ID", "used_for": "str - Purpose", "link_path": "str - File path or link placeholder"}
  ],

  "areas_of_opportunity": [
    {
      "title": "str - Clear opportunity title",
      "description": "str - What the opportunity is",
      "current_state": "str - How things work today",
      "improvement": "str - Specific improvement suggestion",
      "impact": "high|medium|low",
      "source": "sme_highlight|gap_analysis|pattern|tribal_knowledge"
    }
  ],

  "appendix_items": [
    {"title": "str - e.g., 'Appendix A - Exception Handling Matrix'", "content": "str - Content or placeholder"}
  ]
}

RULES:
- Create 2-6 phases in the Process Narrative, each representing a major stage of the process
- Each phase should have 2-6 sub_steps with detailed instructions
- EVERY sub_step MUST have a screenshot_description — describe what screenshot would show. Be specific about the system screen, form fields, buttons, and UI elements visible.
- Extract tribal knowledge from context_intelligence and embed as tips_notes in relevant sub_steps
- Extract areas_of_opportunity from: gap_analysis, context_intelligence (workarounds), and recommendations
- For source field: "sme_highlight" for tribal knowledge/exceptions, "gap_analysis" for gaps, "pattern" for industry patterns, "tribal_knowledge" for workarounds
- roles_responsibilities: one entry per distinct role, with a single responsibility string
- acronyms: include all domain terms, system abbreviations, and technical acronyms
- systems_used: list all technology/system names from the knowledge graph
- related_documents: extract any referenced documents, policies, templates, or reports
- upstream/downstream: identify process dependencies from the knowledge graph edges
- appendix_items: include exception handling matrices, decision trees, or reference tables
- Write in clear, professional operations manual language
- Be SPECIFIC — reference actual systems, roles, and processes from the analysis data
- Respond ONLY with valid JSON, no markdown or commentary"""


async def generate_sop(
    current_analysis: dict,
    process_flows: list[dict] | None = None,
) -> dict:
    """Generate a Standard Operating Procedure document from the analysis."""
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=300.0)

    analysis_json = json.dumps(current_analysis, indent=1)
    if len(analysis_json) > 120000:
        analysis_json = analysis_json[:120000] + "\n... (truncated)"

    parts = [f"## Full Analysis Data:\n{analysis_json}\n"]
    if process_flows:
        pf_json = json.dumps(process_flows, indent=1)
        if len(pf_json) > 30000:
            pf_json = pf_json[:30000] + "\n... (truncated)"
        parts.append(f"\n## Process Flows Extracted:\n{pf_json}\n")
    parts.append(
        "\nGenerate a comprehensive Standard Operating Procedure (SOP) following the corporate VM template format. "
        "Include phases with sub-steps, screenshot descriptions, tribal knowledge tips, "
        "upstream/downstream dependencies, related documents, and areas of opportunity. "
        "Return the COMPLETE SOP JSON."
    )

    return await _call_and_parse(client, SOP_SYSTEM_PROMPT, "\n".join(parts), max_tokens=12000)

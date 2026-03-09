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

# Max chars per chunk sent to Claude (~120K chars ≈ 30K tokens, Haiku handles 200K context)
# Larger chunks = fewer API calls = lower cost
CHUNK_SIZE = 120000
# Max tables per chunk
TABLES_PER_CHUNK = 20

SYSTEM_PROMPT = """You are a Knowledge Extraction Specialist. Analyze documents and extract the most important knowledge.

APPROACH:
- Be DESCRIPTIVE: only report what you can directly support with evidence from the text.
- Surface hidden connections that people working in silos would miss.
- If a category has nothing genuine, return an empty list. Never fabricate.

Extract into these 6 sections:

1. INDUSTRY PATTERNS: Key trends or themes in the data. Max 5. Empty if none.
2. CLIENT PATTERNS: Behaviors or decision patterns. Max 5. Empty if none.
3. TRIBAL KNOWLEDGE: Undocumented know-how or workarounds. Max 5. Empty if none.
4. EXCEPTIONS: Anomalies or special handling. Max 5. Empty if none.
5. KNOWLEDGE GRAPH: The most important entities and relationships. Max 20 nodes, 30 edges.
6. CONTEXT GRAPH: High-level view of how key entities interconnect across silos. Max 12 nodes, 18 edges.

ENTITY TYPES — use ONLY these 4: person, process, technology, concept
- person: People, roles, teams, departments, organizations
- process: Workflows, procedures, operations, business rules, pipelines
- technology: Software, systems, tools, platforms, data sources, integrations
- concept: Regulations, metrics, standards, strategies, risks, business concepts

JSON Schema:
{"industry_patterns":[{"title":"str","description":"str","confidence":"high|medium|low","evidence":["str"]}],"client_patterns":[{"title":"str","description":"str","frequency":"str","business_impact":"str"}],"tribal_knowledge":[{"title":"str","description":"str","risk_if_lost":"high|medium|low","formalization_action":"str","related_entities":["id"]}],"exceptions":[{"title":"str","description":"str","trigger":"str","handling":"str","related_entities":["id"]}],"knowledge_graph":{"nodes":[{"id":"slug","label":"Name","type":"person|process|technology|concept","description":"str"}],"edges":[{"source":"id","target":"id","label":"str","strength":0.8}]},"context_graph":{"nodes":[{"id":"slug","label":"Name","type":"person|process|technology|concept","description":"str"}],"edges":[{"source":"id","target":"id","label":"str","strength":0.7}]},"kpis":null}

RULES:
- Keep it focused: only the MOST important entities, not everything
- Keep descriptions to 1-2 sentences
- All entity IDs: unique lowercase slugs
- All edges must reference valid node IDs
- related_entities must reference knowledge_graph node IDs
- Every node needs a description
- Set kpis to null (not used)
- Respond ONLY with valid JSON, no markdown, no code blocks"""


MERGE_SYSTEM_PROMPT = """You are a Knowledge Synthesis Specialist. You receive multiple partial analyses of a large document (each from a different section/chunk) and merge them into one unified, comprehensive analysis.

Your job:
1. MERGE all industry patterns, client patterns, tribal knowledge, and exceptions — deduplicate similar items, combine evidence, and keep the best version of each.
2. MERGE knowledge graphs — deduplicate nodes by their ID or similar names, merge edges, and ensure all edges reference valid node IDs.
3. MERGE context graphs — same deduplication and merging rules.
4. MERGE KPIs — deduplicate metrics, pick the most accurate/recent value, and combine notes.
5. Where multiple chunks found the same pattern/entity, INCREASE the confidence level and merge the evidence lists.
6. Create cross-chunk connections — if an entity in chunk 1 relates to an entity in chunk 3, add that edge.

Respond with the SAME JSON schema as the individual analyses. Respond ONLY with valid JSON, no markdown formatting or code blocks.

IMPORTANT:
- All entity IDs in graphs must be unique lowercase slugs
- Every edge must reference valid node IDs that exist in the nodes array
- Deduplicate aggressively — the final result should be clean and non-repetitive
- related_entities in tribal_knowledge and exceptions MUST reference valid node IDs from the merged knowledge_graph
- Every node MUST have a description field
- If no numeric data exists across any chunk, set "kpis" to null"""


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
        "Ensure related_entities in tribal_knowledge and exceptions reference valid knowledge_graph node IDs."
    )
    return "\n".join(parts)


def _local_merge(chunk_results: list[dict]) -> dict:
    """Merge chunk results locally (no Claude call) — saves API cost.
    Simple concatenation + deduplication by node ID.
    """
    merged = {
        "industry_patterns": [],
        "client_patterns": [],
        "tribal_knowledge": [],
        "exceptions": [],
        "knowledge_graph": {"nodes": [], "edges": []},
        "context_graph": {"nodes": [], "edges": []},
        "kpis": None,
    }

    seen_pattern_titles = set()
    seen_node_ids = {"knowledge_graph": set(), "context_graph": set()}
    seen_edge_keys = {"knowledge_graph": set(), "context_graph": set()}

    for result in chunk_results:
        # Merge pattern lists (dedupe by title)
        for key in ["industry_patterns", "client_patterns", "tribal_knowledge", "exceptions"]:
            for item in result.get(key, []):
                title = item.get("title", "")
                dedup_key = f"{key}:{title.lower().strip()}"
                if dedup_key not in seen_pattern_titles:
                    seen_pattern_titles.add(dedup_key)
                    merged[key].append(item)

        # Merge graphs (dedupe nodes by ID, edges by source+target)
        for graph_key in ["knowledge_graph", "context_graph"]:
            graph = result.get(graph_key, {})
            for node in graph.get("nodes", []):
                nid = node.get("id", "")
                if nid and nid not in seen_node_ids[graph_key]:
                    seen_node_ids[graph_key].add(nid)
                    merged[graph_key]["nodes"].append(node)
            for edge in graph.get("edges", []):
                edge_key = f"{edge.get('source', '')}→{edge.get('target', '')}"
                src, tgt = edge.get("source", ""), edge.get("target", "")
                if (edge_key not in seen_edge_keys[graph_key]
                        and src in seen_node_ids[graph_key]
                        and tgt in seen_node_ids[graph_key]):
                    seen_edge_keys[graph_key].add(edge_key)
                    merged[graph_key]["edges"].append(edge)

        # Merge KPIs
        kpis = result.get("kpis")
        if kpis and isinstance(kpis, list):
            if merged["kpis"] is None:
                merged["kpis"] = []
            merged["kpis"].extend(kpis)

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
        "Deduplicate patterns, entities, and KPIs. Merge evidence lists. "
        "Create cross-section entity relationships where applicable. "
        "The final result should be comprehensive yet clean — no duplicates.\n"
        "Respond ONLY with valid JSON."
    )
    return "\n".join(parts)


# Max total text to analyze — prevents runaway costs on huge files
# 400K chars ≈ 100K tokens input, keeps total cost under ~$0.50 for Haiku
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


REFINE_SYSTEM_PROMPT = """You are a Knowledge Analysis Assistant. You have a current analysis of a document (with patterns, knowledge graphs, KPIs, etc.) and the user wants to refine, query, or expand it.

Based on the user's request, produce an UPDATED version of the analysis JSON. You may:
- Add new patterns, entities, or KPIs that the user asks about
- Remove items the user says are irrelevant
- Expand details on specific areas
- Add new graph connections the user identifies
- Adjust confidence levels based on user feedback
- Add new context graph nodes/edges for themes the user wants explored
- Answer the user's question by incorporating the answer INTO the analysis (e.g., add a new pattern or insight)

IMPORTANT RULES:
- Always return the COMPLETE updated analysis JSON (not just the changes)
- Keep all existing items unless the user explicitly asks to remove them
- All entity IDs must be unique lowercase slugs
- Every edge must reference valid node IDs
- related_entities must reference valid knowledge_graph node IDs
- Every node MUST have a description field
- Respond ONLY with valid JSON matching the original schema, no markdown or extra text"""


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


ACCUMULATE_SYSTEM_PROMPT = """You are a Knowledge Accumulation Specialist. You have an EXISTING analysis from previous documents and a NEW analysis from newly uploaded documents. Merge them into one comprehensive, unified analysis.

Rules:
- Keep ALL existing knowledge — never drop previous findings
- Add all NEW patterns, entities, KPIs from the new analysis
- Deduplicate — if the same entity/pattern appears in both, merge them (combine evidence, take higher confidence)
- Create CROSS-DOCUMENT connections — if an entity from the old analysis relates to one from the new analysis, add that edge
- Update KPIs if newer values are available
- Expand the knowledge and context graphs with new nodes and edges
- The result should represent the ACCUMULATED knowledge across all documents

IMPORTANT:
- All entity IDs must be unique lowercase slugs
- Every edge must reference valid node IDs
- related_entities must reference valid knowledge_graph node IDs
- Every node MUST have a description field
- Respond ONLY with valid JSON, no markdown or extra text"""


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

import json
import re
import logging
import anthropic
from app.config import settings
from app.schemas.claude_schemas import AnalysisOutput

logger = logging.getLogger(__name__)

# Max chars per chunk sent to Claude (~80K chars ≈ 20K tokens, well within context)
CHUNK_SIZE = 80000
# Max tables per chunk
TABLES_PER_CHUNK = 15

SYSTEM_PROMPT = """You are a Knowledge Extraction Specialist. You analyze business documents and extract structured knowledge. You always respond in valid JSON matching the exact schema provided.

Your analysis categories:

1. INDUSTRY PATTERNS: Recurring trends, market dynamics, regulatory themes, competitive patterns observed across the content. Each pattern should have a title, description, confidence level (high/medium/low), and supporting evidence (direct quotes or references).

2. CLIENT PATTERNS: Client behaviors, preferences, decision-making patterns, common requests, pain points, and relationship dynamics. Each pattern should have a title, description, frequency indicator, and business impact assessment.

3. TRIBAL KNOWLEDGE: Undocumented expertise, institutional memory, informal rules, workarounds, and "how things really work" insights that are not in formal documentation. Each item should have a title, description, risk level if lost, recommended formalization action, AND a list of related entity IDs from the knowledge graph that this tribal knowledge applies to.

4. EXCEPTIONS: Edge cases, anomalies, deviations from standard processes, special handling requirements, and one-off situations. Each exception should have a title, description, trigger conditions, handling procedure, AND a list of related entity IDs from the knowledge graph that this exception applies to.

5. KNOWLEDGE GRAPH ENTITIES: Extract all People, Processes, Technologies, Concepts, and Organizations mentioned. For each entity, provide:
   - id: unique lowercase slug
   - label: display name
   - type: person|process|technology|concept|organization
   - description: a brief 1-2 sentence summary of what this entity is/does in context
   - relationships to other entities with labeled edges

6. CONTEXT GRAPH (360° VIEW): Create a high-level relationship map that shows how ALL entity types interconnect across the organization. This is a bird's-eye view of the entire ecosystem — not just concepts, but the full picture:
   - Include nodes of ALL types: key people, core processes, critical technologies, strategic concepts, and organizations
   - Show CROSS-CATEGORY relationships: which people own which processes, which technologies enable which processes, which organizations depend on which technologies, etc.
   - Use relationship labels like "owns", "manages", "depends on", "feeds into", "enables", "conflicts with", "supports", "governs", "uses", "produces"
   - Focus on the most important 15-25 entities that tell the complete story
   - This graph should give a CXO a complete picture of how everything connects in one view

7. KPIs (only when tabular/numeric data is present): Derive key performance indicators from any numeric data. For each KPI provide the metric name, current value, trend direction (up/down/stable), and an explanatory note about what it means and why it matters. If no numeric data is present, set kpis to null.

Response JSON Schema (respond ONLY with this JSON, no other text):
{
  "industry_patterns": [
    {"title": "string", "description": "string", "confidence": "high|medium|low", "evidence": ["string"]}
  ],
  "client_patterns": [
    {"title": "string", "description": "string", "frequency": "string", "business_impact": "string"}
  ],
  "tribal_knowledge": [
    {"title": "string", "description": "string", "risk_if_lost": "high|medium|low", "formalization_action": "string", "related_entities": ["entity-id-slug"]}
  ],
  "exceptions": [
    {"title": "string", "description": "string", "trigger": "string", "handling": "string", "related_entities": ["entity-id-slug"]}
  ],
  "knowledge_graph": {
    "nodes": [
      {"id": "unique-slug", "label": "Display Name", "type": "person|process|technology|concept|organization", "description": "Brief description of this entity"}
    ],
    "edges": [
      {"source": "node-id", "target": "node-id", "label": "relationship description", "strength": 0.8}
    ]
  },
  "context_graph": {
    "nodes": [
      {"id": "unique-slug", "label": "Display Name", "type": "person|process|technology|concept|organization", "description": "Brief description of this entity and its role"}
    ],
    "edges": [
      {"source": "node-id", "target": "node-id", "label": "depends on|feeds into|enables|etc", "strength": 0.7}
    ]
  },
  "kpis": [
    {"metric": "string", "value": "string", "trend": "up|down|stable", "note": "string"}
  ]
}

IMPORTANT:
- All entity IDs in graphs must be unique lowercase slugs (e.g., "john-smith", "crm-system")
- Every edge must reference valid node IDs that exist in the nodes array
- Be thorough: extract ALL entities and relationships you can find
- Knowledge graph should map ALL entities in detail; context graph should show the most important 15-25 entities across ALL types as a 360° executive overview
- related_entities in tribal_knowledge and exceptions MUST reference valid node IDs from the knowledge_graph
- Every node MUST have a description field
- If no numeric data exists, set "kpis" to null
- Respond ONLY with valid JSON, no markdown formatting or code blocks"""


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


def _parse_claude_json(raw_text: str) -> dict:
    """Parse JSON from Claude's response, handling markdown fences and surrounding text."""
    raw_text = raw_text.strip()

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        raw_text = "\n".join(lines[1:])
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3].strip()

    # Try to extract JSON if there's any surrounding text
    json_match = re.search(r'\{[\s\S]*\}', raw_text)
    if json_match:
        raw_text = json_match.group(0)

    return json.loads(raw_text)


async def _call_claude(client: anthropic.AsyncAnthropic, system: str, user_prompt: str, max_tokens: int = 8192) -> str:
    """Call Claude API asynchronously and return raw text response."""
    response = await client.messages.create(
        model="claude-4-sonnet-20250514",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return response.content[0].text.strip()


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


async def analyze_content(text: str, tables: list[dict], instructions: str | None = None) -> tuple[AnalysisOutput, int]:
    """
    Analyze content with automatic chunking for large documents.
    - Small docs (<=80K chars): single pass analysis
    - Large docs: chunk → analyze each → merge results
    Returns (analysis_output, num_chunks_analyzed)
    """
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    # Split text into chunks
    chunks = _split_text_into_chunks(text)
    num_chunks = len(chunks)

    logger.info(f"Document size: {len(text):,} chars → {num_chunks} chunk(s)")

    if num_chunks == 1:
        # Single chunk — original simple path
        prompt = _build_chunk_prompt(chunks[0], tables, instructions, 0, 1)
        raw = await _call_claude(client, SYSTEM_PROMPT, prompt)
        data = _parse_claude_json(raw)
        return AnalysisOutput(**data), 1

    # Multi-chunk analysis
    table_groups = _distribute_tables(tables, num_chunks)
    chunk_results = []

    for i, chunk_text in enumerate(chunks):
        logger.info(f"Analyzing chunk {i + 1}/{num_chunks} ({len(chunk_text):,} chars)")
        prompt = _build_chunk_prompt(
            chunk_text, table_groups[i], instructions, i, num_chunks
        )
        raw = await _call_claude(client, SYSTEM_PROMPT, prompt)
        data = _parse_claude_json(raw)
        chunk_results.append(data)

    # Merge all chunk results
    logger.info(f"Merging {num_chunks} chunk analyses into unified result")

    # If too many chunks, merge in batches to stay within context
    while len(chunk_results) > 5:
        logger.info(f"Hierarchical merge: {len(chunk_results)} partial results → batches of 5")
        merged_batch = []
        for batch_start in range(0, len(chunk_results), 5):
            batch = chunk_results[batch_start:batch_start + 5]
            if len(batch) == 1:
                merged_batch.append(batch[0])
            else:
                merge_prompt = _build_merge_prompt(batch, instructions)
                raw = await _call_claude(client, MERGE_SYSTEM_PROMPT, merge_prompt, max_tokens=16384)
                merged_batch.append(_parse_claude_json(raw))
        chunk_results = merged_batch

    # Final merge
    merge_prompt = _build_merge_prompt(chunk_results, instructions)
    raw = await _call_claude(client, MERGE_SYSTEM_PROMPT, merge_prompt, max_tokens=16384)
    data = _parse_claude_json(raw)

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
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

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

    raw = await _call_claude(client, REFINE_SYSTEM_PROMPT, prompt, max_tokens=16384)
    data = _parse_claude_json(raw)
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
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

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

    raw = await _call_claude(client, ACCUMULATE_SYSTEM_PROMPT, prompt, max_tokens=16384)
    data = _parse_claude_json(raw)
    return AnalysisOutput(**data)

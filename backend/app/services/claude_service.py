import json
import re
import anthropic
from app.config import settings
from app.schemas.claude_schemas import AnalysisOutput

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

6. CONTEXT GRAPH: Create a separate graph that shows how high-level concepts and themes connect and flow into each other. This graph should show dependencies, influences, and contextual relationships between major themes found in the documents. Use nodes for major themes/concepts and edges for relationships like "depends on", "feeds into", "derived from", "enables", "conflicts with".

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
      {"id": "unique-slug", "label": "Theme Name", "type": "concept", "description": "Brief description of this theme"}
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
- Knowledge graph should map real entities; context graph should map themes/concepts
- related_entities in tribal_knowledge and exceptions MUST reference valid node IDs from the knowledge_graph
- Every node MUST have a description field
- If no numeric data exists, set "kpis" to null
- Respond ONLY with valid JSON, no markdown formatting or code blocks"""


def build_user_prompt(text: str, tables: list[dict], instructions: str | None = None) -> str:
    parts = ["Analyze the following document content and extract structured knowledge.\n"]

    if instructions:
        parts.append("## User Instructions / Focus Areas:\n")
        parts.append(instructions)
        parts.append("\nPlease pay special attention to the instructions above when analyzing the content.\n")

    parts.append("## Document Text:\n")
    parts.append(text[:100000])  # Limit to ~100k chars to stay within context

    if tables:
        parts.append("\n\n## Tabular Data:\n")
        parts.append(json.dumps(tables[:20], indent=2))  # Limit tables
    else:
        parts.append("\n\n## Tabular Data:\nNo tabular data present.")

    parts.append(
        "\n\nRespond with the JSON structure defined in your instructions. "
        "Ensure all entity IDs in the knowledge graph are unique lowercase slugs. "
        "Ensure every edge references valid node IDs. "
        "Ensure related_entities in tribal_knowledge and exceptions reference valid knowledge_graph node IDs."
    )
    return "\n".join(parts)


async def analyze_content(text: str, tables: list[dict], instructions: str | None = None) -> AnalysisOutput:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    user_prompt = build_user_prompt(text, tables, instructions)

    response = client.messages.create(
        model="claude-4-sonnet-20250514",
        max_tokens=8192,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw_text = response.content[0].text.strip()
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

    data = json.loads(raw_text)
    return AnalysisOutput(**data)

# Contextus — Knowledge OS

## What This Is
Full-stack document analysis app that extracts hidden knowledge, patterns, tribal knowledge, and context intelligence from uploaded documents using Claude AI.

## Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS (port 3000)
- **Backend**: FastAPI + Python (port 8000)
- **AI**: Claude API via `anthropic` SDK, model: `claude-sonnet-4-5`
- **Graphs**: D3.js force-directed graphs
- **Deploy**: Railway (auto-deploys from `main` branch)

## Deployment URLs
- Frontend: https://knowledge-os-production-5c09.up.railway.app
- Backend: https://knowledge-os-production.up.railway.app
- GitHub: https://github.com/Sai230382/knowledge-os
- Debug jobs: https://knowledge-os-production.up.railway.app/api/debug/jobs

## Architecture

### 4-Layer Extraction Pipeline (SYSTEM_PROMPT)
**Layer 1 — Foundation**: Knowledge Graph (formal entity map) + Industry Patterns
**Layer 2 — Intelligence**: Context Intelligence (unified: tribal knowledge, exceptions, workarounds, process variations, hidden patterns) + Context Graph (hidden edges between knowledge graph nodes)
**Layer 3 — Gaps**: Gap Analysis (process/knowledge/technology/ownership gaps)
**Layer 4 — Action**: Recommendations (address specific gaps using context intelligence)

### Knowledge Graph vs Context Graph (KEY DISTINCTION)
- **Knowledge Graph** = formal truth. Edges are official relationships: "uses", "manages", "requires", "feeds_into"
- **Context Graph** = hidden intelligence layer. Edges represent undocumented knowledge: tribal knowledge, exceptions, workarounds, hidden patterns. Each edge has a `context_type` field. This is what the team is obsessed with — better context for autonomous decisions.

### Entity Types (only 4)
`person`, `process`, `technology`, `concept`

### Backend Config
- CHUNK_SIZE: 120000 chars
- MAX_TEXT_LENGTH: 400000 chars
- max_tokens: 12000
- JSON parsing: `json-repair` library
- Prompt caching: `cache_control: {"type": "ephemeral"}` on system prompts

### Key Backend Files
- `backend/app/services/claude_service.py` — All prompts (SYSTEM, MERGE, REFINE, ACCUMULATE), chunking, local merge
- `backend/app/schemas/claude_schemas.py` — Pydantic models (all fields have defaults to prevent validation errors)
- `backend/app/processors/` — docx, pptx, xlsx, pdf, txt processors
- `backend/app/routers/upload.py` — Upload, analyze-path, analyze-text, analyze-url, refine endpoints

### Key Frontend Files
- `frontend/src/components/layout/LeftPanel.tsx` — Input panel with file upload, URL, path, text, chat query
- `frontend/src/components/layout/RightPanel.tsx` — Results display wrapper
- `frontend/src/components/results/ResultsTabs.tsx` — Tabs: Patterns | Insights | Knowledge Graph | Context Graph
- `frontend/src/components/results/PatternCards.tsx` — 6 color-coded card sections
- `frontend/src/components/graphs/KnowledgeGraph.tsx` — D3 force graph (formal)
- `frontend/src/components/graphs/ContextGraph.tsx` — D3 force graph (hidden intelligence)
- `frontend/src/lib/types.ts` — TypeScript types matching backend schemas
- `frontend/src/lib/api.ts` — API client functions

## Conventions
- All Pydantic model fields use defaults (str = "", list = [], float = 0.5) to prevent validation errors when Claude omits fields
- Frontend uses ContextEdge extends GraphEdge for type compatibility with shared useForceGraph hook
- Local merge (free, no API call) handles dedup by node ID and item title for <=5 chunks
- No named characters in sample data — use roles (e.g., "Loan Officer") not names (e.g., "John Smith")

## Running Locally
```bash
# Backend
cd backend && uvicorn main:app --reload --port 8000

# Frontend
cd frontend && npm run dev
```

## Sample Data
- `sample-data/mortgage-operations-report.txt` — Full mortgage value chain (origination to NOC)
- TransCo and Lend Co are test projects used to validate the extraction pipeline

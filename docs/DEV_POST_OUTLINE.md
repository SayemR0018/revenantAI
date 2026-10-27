# DEV Post outline — Hacktoberfest Open-Source AI Challenge: Week 4
Required tag: #hf26challenge · Due Oct 31 11:59 PM PDT · Writing quality is weighted most heavily.

## What I Built
"Which of your dependencies are already ghosts?" Revenant predicts which open-source
projects are about to die (TabPFN ghost-risk model), holds a funeral for the departed
(tombstones, dignified epitaphs, Dia de los Muertos ofrendas honoring real contributors),
and resurrects your code with a living successor.

## Demo
- Live URL: (from HANDOFF §4)
- Repo: https://github.com/SayemR0018/revenant
- GIF: chaos-resume (Temporal) + a real scan → tombstone → badge
- `npx revenant-cli scan . --offline` — works with the internet off

## How I Built It
- Next.js 16 + TS + Tailwind; SSE scan progress
- ecosyste.ms open data + npm/PyPI/GitHub for signals
- TabPFN (ml/ FastAPI) → calibrated ghost score; transparent heuristic fallback
- Gemma (AI Studio) autopsies + seance; Tinker LoRA epitaph writer; Backboard arena
- Temporal ExhumeWorkflow for durable scans; Mastra agents; Mongo memory; Tiger hybrid retrieval
- Receipts page: every integration checked live, honest PASS/SKIPPED

## Why Does Open Innovation Matter?
- A tool whose job is detecting abandonment must not itself depend on a deprecatable closed service.
- Open weights can be downloaded, fine-tuned, and run offline (CLI --offline + Ollama).
- Dead open-source projects can be resurrected — forks and archives persist; dead closed services don't.
- The ofrenda: open source's real history is people; honoring them is the point.

## My Agent Session
- DevRelay agent-session embed (Devin not a native tool_name; curated transcript saved).
- Bugs found live: (pull from docs/WRITEUP_FACTS.md — CNA name collision, allow-scripts, vitest/@types/node conflict, satori display:flex errors, Next16 cacheComponents clash).

## The Spirit of It
- Dia de los Muertos framing is honoring, not parody; "signals, not verdicts" ethics rules enforced in code.
- Headline finding from the Graveyard Index: (fill from data/cementerio.json — e.g. "X% of top-500 npm packages show haunted-or-departed signals" — compute real number before posting).
- Tinker improvement table: (docs/tinker-results.md once training runs).

## Prize Categories
- Paste from docs/PRIZE_CATEGORIES.md — PASS integrations only.

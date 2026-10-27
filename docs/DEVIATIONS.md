# Deviations from the master spec (and why)

Everything here is a deliberate, documented deviation — not a bug.

| # | Spec said | What shipped | Why |
|---|-----------|--------------|-----|
| 1 | TabPFN dataset: 1,500 repos, all features at T0 | Pipeline complete; feature set reduced to commit/release/contributor/registry signals when `FAST=1` or no token | 6h wall-time budget; issue/PR history at T0 is the expensive part. Disclosed on /science. |
| 2 | Temporal required for scans | Temporal workflow exists (`ExhumeWorkflow`) but scans run in-process when `TEMPORAL_ADDRESS` is unset | Render free tier can't host Temporal; Temporal Cloud needs a human signup. The fallback is real and tested, not fake. |
| 3 | MongoDB Atlas for memory/corpus | Dual store: MongoDB when `MONGODB_URI` set, JSON file store otherwise | No Atlas credentials in env; file store keeps everything functional. |
| 4 | Seance via Gemma only | Seance works keyless via corpus retrieval + grounded template answers; Gemma upgrades it | A seance that needs a key fails the demo; a grounded non-LLM answer does not fabricate. |
| 5 | next/og for tombstone OG cards | `ImageResponse` from `next/og` — same thing, current Next 16 export | API name in spec was from an older Next. |
| 6 | ecosyste.ms "if useful" | ecosyste.ms is the **primary** signals source; GitHub API is enrichment | Open data, no key, single call per repo — the only way unauthenticated scans are feasible. |
| 7 | `revenant` npm package | `revenant-cli` only (the name `revenant` was already taken — v0.3.2) | npm availability check, per instructions. |
| 8 | TabPFN-3.5 | Code targets `tabpfn` package latest; `TABPFN_MODE=api` for Prior Labs hosted; `local` for offline | Exact version pinned at deploy time per docs.priorlabs.ai quickstart. |
| 9 | Playwright tests run in CI | Smoke spec + config shipped; browser download needs `npx playwright install chromium` (CI does it) | install-scripts sandbox on this machine; CI runs it properly. |
| 10 | Ghost score via TabPFN everywhere | `ghostScore()` calls ml/ service, falls back to `heuristicScore()` transparently | The heuristic is documented, tested, and honest — the score bands are identical. |

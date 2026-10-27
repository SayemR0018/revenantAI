# WRITEUP_FACTS — running log of real numbers, bugs, surprises, decisions
(Every claim in the DEV post must trace to something here. Do not invent numbers.)

## Environment facts (verified 2026-10-27)
- Node v24.16.0, npm 11.18.0, Python 3.14.5, Windows 11.
- Next.js 16.4.3, React 19.3.0, Tailwind 4.
- npm name check: `revenant` TAKEN (v0.3.2 exists); `revenant-cli` FREE.
- DevRelay MCP: working. Week 4 challenge id 82, tag `#hf26challenge`, due Oct 31 11:59 PM PDT.
- MLH event offers: ElevenLabs 3-month Creator credit available at Hacktoberfest 2026 (unclaimed — needs user yes). No sponsor agent skills at Week 4 event except ElevenLabs skills bundle at the evergreen event.
- Tiger Cloud: user has existing `tallybard-db` service (other project — not reused).
- GitHub MCP server: authenticated as SayemR0018 but connection is flaky (intermittent "failed to connect").

## Bugs found while building
1. `create-next-app` rejected workspace dir name "MLH-week4" (capital letters → invalid package name). Scaffolded into `./revenant` instead.
2. npm `allow-scripts` user policy blocked `--allow-scripts` flag from create-next-app → install aborted. Plain `npm install` respected the user's allowlist.
3. vitest@5 requires @types/node >=22; @temporalio/worker pins @types/node@20 via webpack chain → resolved by bumping root @types/node to ^24.
4. Next 16 Cache Components mode (`cacheComponents: true`) conflicts with `runtime='nodejs'`+`force-dynamic` routes → removed from next.config.ts.
5. Satori (next/og) rejects any div with >1 child and no explicit `display:flex`; mixed `{var}`+text children count as multiple → both OG routes needed template-string children + explicit display styles. Found via live smoke test, not typecheck.
6. Mastra 1.79 API drift vs docs: model config takes OpenAICompatibleConfig objects; tool `execute(inputData)` signature; workflow inputs need parsing, not direct field access. Fixed after reading installed d.ts.
7. GitHub MCP: reads work (get_me), every write (create_repository, push_files) drops the connection → repo created by hand or retried; documented in HANDOFF §1.
8. Top-level await in scripts/*.ts fails under tsx when package.json lacks `"type":"module"` → wrapped in async main().

## Verified live numbers (2026-10-27)
- Cementerio snapshot: **180** real npm+PyPI packages ranked by ghost score (scripts/seed-cementerio.ts → data/cementerio.json, bundled into cli/data/index-snapshot.json).
- Real scan `npm/left-pad`: score **100**, band `departed`, cause `deprecated` with real registry message "use String.prototype.padStart()", successors returned, wall time ~seconds.
- Offline CLI: `node cli/bin/revenant.js scan --offline` returned JSON for all 25 deps in our own package.json; unknown signals degrade gracefully.
- Unit tests: 9/9 pass (manifest parsing, feature vector, banding). `tsc --noEmit` clean. `eslint` 0 errors. `next build` green (21 routes).
- Live smoke: /api/health, POST /api/scan, poll /api/scan/[id], badge SVG, both OG PNGs (200 image/png), seance (grounded:false on insufficient evidence — correct refusal), grave page, /receipts all OK.
- receipts.json: **4 PASS** (Mastra, Entire config, GitHub Actions/Copilot assets, ecosyste.ms), 0 FAIL, 15 SKIPPED — every skip is a missing credential with the fallback named.

## Decisions
- ecosyste.ms as primary signal source (open data, no key) — GitHub for enrichment only.
- Heuristic scorer is the honest fallback, not a placeholder: transparent point attribution.
- Seance = retrieval-grounded answers; LLM optional. "I don't remember that" when corpus misses.
- Epitaphs: rule-based fallback is dignified and labeled `fallback-rules`; never faked as LLM output.

## Numbers still pending credentials
- TabPFN vs baselines: pending PRIORLABS_API_KEY (data/eval-results.json)
- Tinker eval table: pending TINKER_API_KEY (docs/tinker-results.md)
- Cost ledger (ultramarine baseline runs): pending key — SKIPPED, not faked

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
4. (to be continued — add real bugs from traces/Sentry here)

## Decisions
- ecosyste.ms as primary signal source (open data, no key) — GitHub for enrichment only.
- Heuristic scorer is the honest fallback, not a placeholder: transparent point attribution.
- Seance = retrieval-grounded answers; LLM optional. "I don't remember that" when corpus misses.
- Epitaphs: rule-based fallback is dignified and labeled `fallback-rules`; never faked as LLM output.

## Numbers to fill in during build
- Cementerio snapshot size: TBD (scripts/seed-cementerio.ts)
- Scan of real package.json wall time: TBD
- TabPFN vs baselines: TBD (data/eval-results.json)
- Tinker eval table: TBD (docs/tinker-results.md)
- Cost ledger (ultramarine baseline runs): TBD

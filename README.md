# 👻 Revenant

> **Which of your dependencies are already ghosts?**

Revenant predicts which open-source projects are about to die, holds a funeral for the
ones that already did, and helps you resurrect your code with a living successor.

Two readings of "ghost in the machine" at once: zombie dependencies haunting your
dependency tree — and, in the spirit of **Día de los Muertos**, an ofrenda that honors
the projects (and people) that gave us so much before they went quiet.

**Signals, not verdicts.** A ghost score is a probability estimate, never an accusation.
Maintainers owe nobody anything.

## Live demo

- **App: https://revenantai-8hnl.onrender.com/** — no account needed, public data only
- CLI: `npx revenant-cli scan .`
- Repo: [SayemR0018/revenantAI](https://github.com/SayemR0018/revenantAI) · MIT licensed

## Screenshots

| Scan & land | Haunting report |
|---|---|
| ![Home — scan a manifest, try a sample, jump to example tombstones](docs/screenshots/home-desktop.png) | ![Report — band distribution, filters and per-dependency ghost scores](docs/screenshots/report-desktop.png) |

| Tombstone & Ofrenda | Cementerio index |
|---|---|
| ![Departed tombstone — vital signs, score breakdown, candles lit for contributors](docs/screenshots/tombstone-departed-desktop.png) | ![Cementerio — 180 real packages ranked by ghost risk](docs/screenshots/cementerio-desktop.png) |

*Full desktop + mobile set (16 shots, verified zero horizontal scroll at 390px) in [`docs/screenshots/`](docs/screenshots/).*

## How it works

```
manifest ──► parse ──► resolve repo ──► signals ──► ghost score ──► autopsy ──► report
  (GitHub ecosyste.ms registries)   (TabPFN / heuristic)  (Gemma / LoRA / rules)
                                           │
   Temporal ExhumeWorkflow (durable) ──────┘  fallback: in-process pipeline
   Mastra agents (autopsy · seance · resurrection)
   MongoDB Atlas (memory, corpus, votes) · Tiger/pgvector (hybrid retrieval)
   Render (web + worker + ml + nightly cron) · Sentry (agent tracing)
```

1. **Scan** a `package.json`, `requirements.txt`, `pyproject.toml`, public repo URL, or one package name.
2. **Haunting Report** — every dependency gets a ghost score (0–100) and a band: Alive / Fading / Haunted / Departed / Unknown.
3. **Tombstone** pages — vital signs (commit pulse, release gap, bus factor, issue response), cause of death with cited evidence, a dignified epitaph, an ofrenda of contributors-as-candles, living successors, and ways to support the maintainers.
4. **Seance** — talk to the spirit of a project. It answers only from the project's own records and says "I don't remember that" when the evidence isn't there.
5. **Resurrection** — ranked living successors + a migration plan; a PR only after your explicit approval.
6. **Cementerio** — the Graveyard Index of top npm/PyPI packages ranked by ghost risk.
7. **Arena** — the same autopsy across open-weight models; vote for the best eulogy.
8. **Science** — dataset card + honest metrics (TabPFN vs baselines, limitations included).
9. **Receipts** — live, checkable status for every integration. Nothing faked.

## Use cases

- **Before you `npm install`** — paste a manifest or one package name; see whether the project you're about to adopt still has a pulse, and who the living successors are if it doesn't.
- **During dependency review in CI** — drop the GitHub Action into a repo; it warns on PRs that add haunted or departed dependencies before they merge.
- **When a dependency goes quiet** — the Resurrection flow ranks maintained successors and drafts a migration plan (manifest diff included); nothing is committed without your approval.
- **Auditing an existing repo offline** — `revenant-cli scan . --offline` runs entirely on the bundled index — no network, no keys.
- **Honoring the ecosystem** — every departed project gets a tombstone with cited evidence and an ofrenda naming its contributors, plus links to support living maintainers — because open source is people.

**Why open models:** a tool that detects abandonment shouldn't itself depend on a service
that can be deprecated out from under it. Every model on the product path is open-weight —
Gemma (autopsy/seance/arena), TabPFN (ghost-risk prediction), a Tinker LoRA on Qwen3
(epitaphs) — and `revenant-cli scan --offline` runs with the lights and the internet off.
The one closed model (Ultramarine) appears only as a clearly labelled comparison baseline.

## Quick start

```bash
npm install
npm run seed           # optional: refresh data/seed/cementerio.json & showcase tombstones
npm run dev            # http://localhost:3000
npx tsx temporal/worker.ts        # optional: durable scans (needs TEMPORAL_*)
cd ml && pip install -r requirements.txt && uvicorn ml.app:app   # optional: TabPFN
```

Pre-warmed seed data (`data/seed/cementerio.json` with 180 unique packages and `data/seed/tombstones/*.json` for 20 showcase packages) ships in-repo so a brand-new checkout works immediately with zero env vars. No keys needed for the core demo — ecosyste.ms + registry data carry it. See `.env.example` for the full partner map.

## CLI & Action

```bash
npx revenant-cli scan . --json        # CI-friendly
npx revenant-cli scan . --offline     # bundled index, no network
```

```yaml
- uses: SayemR0018/revenantAI@main    # warns on PRs that add haunted deps
```

## Verified numbers

- **180** unique npm + PyPI packages in the seed index — **11 Departed, 16 Haunted, 17 Fading, 136 Alive** (15.0% Haunted or worse), snapshot 2026-10-30.
- **20** showcase tombstones pre-warmed with real epitaphs, commit pulses and contributor records.
- **0 axe-core violations** (critical/serious/moderate/minor) across all 8 routes; `scrollWidth = 390 ≤ clientWidth = 390` at mobile width — no horizontal scroll.
- **5 integrations PASS** in [receipts.json](receipts.json) (Gemma, Mastra, ecosyste.ms, Copilot/Actions, Entire); missing optional keys report SKIPPED, never faked.

## Honest limitations

- Ghost score = P(abandoned within 12 months) on observable signals; it can't see contracts, day jobs, or intent.
- Issue/PR response features are dropped in the reduced dataset build (disclosed on /science).
- Absence of a repo link means "unknown", not "dead".

## Credits & data

Package/repo signals: [ecosyste.ms](https://ecosyste.ms) (open data), npm registry, PyPI, GitHub API.
Theme: Día de los Muertos — treated as honoring and remembrance, not costume. See /about.

## Post-deadline commits

*(anything merged after Oct 31 23:59 PDT is listed here)*

- README: added live Render URL, trimmed screenshot gallery, use-cases section.

## License

MIT — see [LICENSE](LICENSE).

<div align="center">

# 👻 Revenant

### Which of your dependencies are already ghosts?

**Revenant predicts which open-source projects are about to die, holds a funeral for the ones that already did, and helps you resurrect your code with a living successor.**

[![Live demo](https://img.shields.io/badge/live%20demo-revenantai--8hnl.onrender.com-d63a7b)](https://revenantai-8hnl.onrender.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-f5a623)](LICENSE)
[![Challenge](https://img.shields.io/badge/DEV%20Challenge-%23hf26challenge-0a0a0a)](https://dev.to/challenges/hacktoberfest-2025-week-4)

</div>

---

Two readings of "ghost in the machine" at once: zombie dependencies haunting your
dependency tree — and, in the spirit of **Día de los Muertos**, an ofrenda that honors
the projects (and people) that gave us so much before they went quiet.

> **Signals, not verdicts.** A ghost score is a probability estimate, never an accusation. Maintainers owe nobody anything.

**[Live demo](https://revenantai-8hnl.onrender.com/)** · **[Screenshots](#screenshots)** · **[How it works](#how-it-works)** · **[Quick start](#quick-start)** · **[Use cases](#use-cases)** · **[Verified numbers](#verified-numbers)**

---

## Live demo

| | |
|---|---|
| 🌐 **Web app** | **https://revenantai-8hnl.onrender.com/** — no account needed, public data only |
| 📦 **CLI** | `npx revenant-cli scan .` |
| ⚙️ **Action** | `uses: SayemR0018/revenantAI@main` |
| 📄 **License** | MIT — [LICENSE](LICENSE) |

---

## Screenshots

| Scan & land | Haunting report |
|---|---|
| ![Home — scan a manifest, try a sample, jump to example tombstones](docs/screenshots/home-desktop.png) | ![Report — band distribution, filters and per-dependency ghost scores](docs/screenshots/report-desktop.png) |

| Tombstone & Ofrenda | Cementerio index |
|---|---|
| ![Departed tombstone — vital signs, score breakdown, candles lit for contributors](docs/screenshots/tombstone-departed-desktop.png) | ![Cementerio — 180 real packages ranked by ghost risk](docs/screenshots/cementerio-desktop.png) |

*Full desktop + mobile set (16 shots, verified zero horizontal scroll at 390px) in [`docs/screenshots/`](docs/screenshots/).*

---

## What it does

| Feature | What you get |
|---|---|
| 🔍 **Scan** | Paste a `package.json`, `requirements.txt`, `pyproject.toml`, repo URL, or one package name |
| 📊 **Haunting Report** | Ghost score (0–100) + band per dependency: Alive / Fading / Haunted / Departed / Unknown |
| ⚰️ **Tombstones** | Vital signs (commit pulse, release gap, bus factor, issue response), cited cause of death, dignified epitaph, contributor ofrenda, living successors |
| 🕯️ **Seance** | Talk to a project's spirit — it answers only from its own records, and says "I don't remember that" when evidence is missing |
| 🌱 **Resurrection** | Ranked living successors + migration plan; a PR only after your explicit approval |
| 🪦 **Cementerio** | Graveyard Index of top npm/PyPI packages ranked by ghost risk |
| ⚔️ **Arena** | The same autopsy across open-weight models — vote for the best eulogy |
| 🔬 **Science** | Dataset card + honest metrics (TabPFN vs baselines, limitations included) |
| 🧾 **Receipts** | Live, checkable status for every integration. Nothing faked |

---

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

**Why open models:** a tool that detects abandonment shouldn't itself depend on a service
that can be deprecated out from under it. Every model on the product path is open-weight —
Gemma (autopsy/seance/arena), TabPFN (ghost-risk prediction), a Tinker LoRA on Qwen3
(epitaphs) — and `revenant-cli scan --offline` runs with the lights and the internet off.
The one closed model (Ultramarine) appears only as a clearly labelled comparison baseline.

---

## Use cases

| When | What Revenant does |
|---|---|
| **Before you `npm install`** | Paste a manifest or one package name — see if the project still has a pulse and who the living successors are |
| **During dependency review in CI** | The GitHub Action warns on PRs that add haunted or departed dependencies before they merge |
| **When a dependency goes quiet** | Resurrection ranks maintained successors and drafts a migration plan (manifest diff included) — nothing is committed without your approval |
| **Auditing a repo offline** | `revenant-cli scan . --offline` runs entirely on the bundled index — no network, no keys |
| **Honoring the ecosystem** | Every departed project gets a tombstone with cited evidence and an ofrenda naming its contributors, plus links to support living maintainers — because open source is people |

---

## Quick start

```bash
npm install
npm run seed           # optional: refresh data/seed/cementerio.json & showcase tombstones
npm run dev            # http://localhost:3000
npx tsx temporal/worker.ts        # optional: durable scans (needs TEMPORAL_*)
cd ml && pip install -r requirements.txt && uvicorn ml.app:app   # optional: TabPFN
```

Pre-warmed seed data (`data/seed/cementerio.json` with 180 unique packages and `data/seed/tombstones/*.json` for 20 showcase packages) ships in-repo so a brand-new checkout works immediately with zero env vars. No keys needed for the core demo — ecosyste.ms + registry data carry it. See `.env.example` for the full partner map.

### CLI

```bash
npx revenant-cli scan . --json        # CI-friendly
npx revenant-cli scan . --offline     # bundled index, no network
```

### GitHub Action

```yaml
- uses: SayemR0018/revenantAI@main    # warns on PRs that add haunted deps
```

---

## Verified numbers

| Metric | Value |
|---|---|
| Seed index | **180** unique npm + PyPI packages, snapshot 2026-10-30 |
| Band split | **11** Departed · **16** Haunted · **17** Fading · **136** Alive (15.0% Haunted or worse) |
| Showcase tombstones | **20** pre-warmed with real epitaphs, commit pulses, contributor records |
| Accessibility | **0 axe-core violations** across all 8 routes; `scrollWidth ≤ clientWidth` at 390px |
| Integrations | **5 PASS** in [receipts.json](receipts.json) (Gemma, Mastra, ecosyste.ms, Copilot/Actions, Entire) — missing keys report SKIPPED, never faked |

---

## Honest limitations

- Ghost score = P(abandoned within 12 months) on observable signals; it can't see contracts, day jobs, or intent.
- Issue/PR response features are dropped in the reduced dataset build (disclosed on /science).
- Absence of a repo link means "unknown", not "dead".

---

## Credits & data

Package/repo signals: [ecosyste.ms](https://ecosyste.ms) (open data), npm registry, PyPI, GitHub API.
Theme: Día de los Muertos — treated as honoring and remembrance, not costume. See [/about](https://revenantai-8hnl.onrender.com/about).

## Post-deadline commits

*(anything merged after Oct 31 23:59 PDT is listed here)*

- README: added live Render URL, trimmed screenshot gallery, use-cases section, layout reorganization.

## License

MIT — see [LICENSE](LICENSE).

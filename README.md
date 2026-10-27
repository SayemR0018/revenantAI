# 👻 Revenant

> **Which of your dependencies are already ghosts?**

Revenant predicts which open-source projects are about to die, holds a funeral for the
ones that already did, and helps you resurrect your code with a living successor.

Two readings of "ghost in the machine" at once: zombie dependencies haunting your
dependency tree — and, in the spirit of **Día de los Muertos**, an ofrenda that honors
the projects (and people) that gave us so much before they went quiet.

**Signals, not verdicts.** A ghost score is a probability estimate, never an accusation.
Maintainers owe nobody anything.

## Live demo / repo

- App: *(Render deploy — see HANDOFF.md §4)*
- CLI: `npx revenant-cli scan .`

## What it does

1. **Scan** a `package.json`, `requirements.txt`, `pyproject.toml`, public repo URL, or one package name.
2. **Haunting Report** — every dependency gets a ghost score (0–100) and a band: Alive / Fading / Haunted / Departed.
3. **Tombstone** pages — vital signs (commit pulse sparkline, release gap, bus factor, issue response), cause of death with cited evidence, a dignified epitaph, last words, an ofrenda of contributors-as-candles, living successors, and ways to support the maintainers.
4. **Seance** — talk to the spirit of a project. It answers only from the project's own records and says "I don't remember that" when the evidence isn't there.
5. **Resurrection** — ranked living successors + migration plan; a PR only after your explicit approval.
6. **Cementerio** — the Graveyard Index of top npm/PyPI packages ranked by ghost risk.
7. **Arena** — the same autopsy across open-weight models; vote for the best eulogy.
8. **Science** — dataset card + honest metrics (TabPFN vs baselines, limitations included).
9. **Receipts** — live, checkable status for every integration. Nothing faked.

## Architecture

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

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000
npx tsx temporal/worker.ts        # optional: durable scans (needs TEMPORAL_*)
cd ml && pip install -r requirements.txt && uvicorn ml.app:app   # optional: TabPFN
```

No keys needed for the core demo — ecosyste.ms + registry data carry it. See `.env.example` for the full partner map.

## CLI & Action

```bash
npx revenant-cli scan . --json        # CI-friendly
npx revenant-cli scan . --offline     # bundled index, no network
```

```yaml
- uses: SayemR0018/revenant@main    # warns on PRs that add haunted deps
```

## Honest limitations

- Ghost score = P(abandoned within 12 months) on observable signals; it can't see contracts, day jobs, or intent.
- Issue/PR response features are dropped in the reduced dataset build (disclosed on /science).
- Absence of a repo link means "unknown", not "dead".

## Credits & data

Package/repo signals: [ecosyste.ms](https://ecosyste.ms) (open data), npm registry, PyPI, GitHub API.
Theme: Día de los Muertos — treated as honoring and remembrance, not costume. See /about.

## Post-deadline commits

*(anything merged after Oct 31 23:59 PDT is listed here)*

## License

MIT — see [LICENSE](LICENSE).

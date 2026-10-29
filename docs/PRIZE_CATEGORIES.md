# Prize Categories (paste-ready for the DEV post)

> Regenerate with `npx tsx scripts/receipts.ts` — only PASS integrations belong here.
> Current state below reflects what is genuinely working as of the last check.

## Integrated and working (PASS in receipts.json)
- **Gemma (`gemma-4-31b-it` & `gemma-4-26b-a4b-it` via Google AI Studio)** — open-weight model writing dignified autopsies, grounded seance responses, and Arena bouts.
- **ecosyste.ms** — open-data backbone resolving packages → repos and activity signals.
- **GitHub Copilot / GitHub Actions** — `revenant-action` composite action warns on PRs adding haunted deps; CI + nightly index workflows ship in-repo.
- **Mastra** — autopsy/seance agents + resurrection workflow + `predictGhostScore` tool (`mastra/`).
- **Entire** — `.entire/settings.json` provenance configuration tracked in-repo.

## Integrated, key-gated (code is real; flip status to PASS once env is set)
- **TabPFN** — ghost-risk predictor served by `ml/` FastAPI (`ML_SERVICE_URL` + `PRIORLABS_API_KEY`).
- **Tinker** — LoRA epitaph writer; dataset/train/eval scripts in `ml/tinker/` (`TINKER_API_KEY`).
- **Temporal** — `ExhumeWorkflow` with queryable progress (`TEMPORAL_*`).
- **MongoDB Atlas** — reports/corpus/votes/memory (`MONGODB_URI`).
- **Tiger Data** — hybrid corpus retrieval + commit hypertable (`DATABASE_URL`).
- **Sentry** — agent tracing (`SENTRY_DSN`).
- **Render** — `render.yaml` blueprint deploys web+worker+ml+cron.
- **Auth0, DigitalOcean, Backboard, SerpApi, Browserbase, ElevenLabs, Ultramarine** — providers/flows wired behind env flags; see `.env.example`.
- **Entire** — human-run Copilot CLI session (HANDOFF §10).

## Explicitly skipped
- **.tech domain** — out of scope per plan.
- **Arduino UNO Q** — out of scope per plan.

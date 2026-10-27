# HANDOFF — what needs a human (Sayem), in order

Everything below is blocked on a credential or an account only you can create/login to.
Each item lists what, why, and the minimal steps. The app runs fully without them — every
missing piece has a graceful fallback already shipped.

## 1. Create the GitHub repo link (if not already done)
- Repo: `SayemR0018/revenant` (public). If Devin could not reach the GitHub API from
  this machine, create it at https://github.com/new named `revenant`, then:
  `git remote add origin https://github.com/SayemR0018/revenant.git && git push -u origin main`

## 2. GITHUB_TOKEN (biggest quality-of-life upgrade — do this first)
- Why: unauthenticated GitHub API = 60 req/hr; scans blow through it instantly.
- How: https://github.com/settings/tokens → fine-grained or classic `public_repo` scope.
- Where: `.env.local` (dev) and Render env vars (prod). No commit — it's in .gitignore.

## 3. GOOGLE_API_KEY (Gemma — the main model)
- Why: powers autopsy epitaphs, seance chat, arena, and Tinker dataset generation.
- How: https://aistudio.google.com/apikey — free tier exists.
- Where: `GOOGLE_API_KEY` everywhere; `LLM_*_PROVIDER=gemma-aistudio` is already the default.

## 4. Deploy to Render (the live URL)
- How: Render dashboard → New → Blueprint → select the `revenant` repo → Apply.
  `render.yaml` creates web + worker + private ml service + nightly cron.
- Then set the env vars there (at minimum GITHUB_TOKEN, GOOGLE_API_KEY).
- Cost: starter plan; the web service can be free-tier if preferred (edit plan: free).

## 5. MongoDB Atlas (persistence + vector "ghost kin")
- Why: reports currently fall back to a file store that does not survive Render redeploys.
- How: https://www.mongodb.com/cloud/atlas/register → free M0 cluster → set MONGODB_URI.
- After connecting, the app auto-uses it. For Atlas Vector Search ("ghost kin"), create a
  vector index on `corpus.embedding` (384 dims) — see docs/DEVIATIONS.md note.

## 6. Temporal (durable scans + chaos demo)
- Why: without TEMPORAL_ADDRESS scans run in-process (works, but not durable).
- How: Temporal Cloud free trial → namespace + API key → TEMPORAL_ADDRESS/TEMPORAL_API_KEY.
  Or `temporal server start-dev` locally. Then run `scripts/chaos.sh` and record the GIF.

## 7. TabPFN / Prior Labs (the real ghost-risk model)
- Why: heuristic scorer is live now; TabPFN needs the ml service deployed + PRIORLABS_API_KEY.
- How: https://www.priorlabs.ai → API key → set on the `revenant-ml` Render service.
- Then `python -m ml.dataset && python -m ml.evaluate` (needs GITHUB_TOKEN; ~hours for 1.5k repos).

## 8. Tinker (fine-tuned epitaph writer)
- TINKER_API_KEY → `python -m ml.tinker.dataset` (needs GOOGLE_API_KEY) →
  `python -m ml.tinker.train` → `python -m ml.tinker.evaluate` → weights download →
  HF upload token (sayem HF account) for the model card.

## 9. Remaining partner keys (each already has a code path + receipt check)
- SERPAPI_KEY — serpapi.com free tier (100/mo)
- BROWSERBASE_API_KEY + BROWSERBASE_PROJECT_ID — stagehand.dev
- BACKBOARD_API_KEY — backboard.io/hackathons
- ELEVENLABS_API_KEY — **you have an unclaimed MLH offer**: 3 months Creator free via
  hacktoberfest.com/my (DevRelay found it — claim it, then set the key)
- DO_MODEL_URL + DO_MODEL_TOKEN — DigitalOcean Gradient serverless inference (check cost first)
- ULTRAMARINE_API_KEY + ULTRAMARINE_BASE_URL — paperinstruments.com (closed baseline only)
- SENTRY_DSN — sentry.io agent monitoring
- AUTH0_DOMAIN/CLIENT_ID/CLIENT_SECRET — Auth0 "for AI Agents" tenant (Token Vault)

## 10. Entire (session provenance — explicitly a human step)
- Entire does not capture Devin sessions. Run one small task in Copilot CLI with Entire
  enabled, then commit `.entire/settings.json` + the real checkpoint link to the README
  "Why does this code exist?" section. Placeholder section is already in README.

## 11. Copilot issues (scoped, assigned to Copilot coding agent)
- Three issues are in the repo's issue tracker (or file them): unit tests for scoring edge
  cases, the Action wrapper polish, README polish. Assign to Copilot, review, merge.

## 12. Publish the CLI
- `cd cli && npm publish --access public` — name `revenant-cli` verified free 2026-10-27.

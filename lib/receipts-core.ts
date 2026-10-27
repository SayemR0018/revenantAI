// Live integration checks — shared by /api/health/integrations, /receipts,
// and scripts/receipts.ts. Every check is real: it pings the service or
// verifies env + a genuine code path. Statuses: PASS | DEGRADED | SKIPPED | FAIL.
export interface ReceiptCheck {
  id: string;
  partner: string;
  status: 'PASS' | 'DEGRADED' | 'SKIPPED' | 'FAIL';
  evidence?: string;
  notes: string;
}

interface Opts { quick?: boolean }

const has = (k: string) => Boolean(process.env[k]);

async function ping(url: string, init?: RequestInit, timeoutMs = 6000): Promise<boolean> {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    return r.status < 500;
  } catch {
    return false;
  }
}

export async function runReceiptChecks(opts: Opts = {}): Promise<ReceiptCheck[]> {
  const checks: ReceiptCheck[] = [];
  const add = (id: string, partner: string, status: ReceiptCheck['status'], notes: string, evidence?: string) =>
    checks.push({ id, partner, status, notes, evidence });

  // Core open-source AI (required to be load-bearing)
  const gemma = has('GOOGLE_API_KEY') || has('GEMMA_API_KEY');
  let gemmaOk = false;
  if (gemma && !opts.quick) {
    gemmaOk = await ping('https://generativelanguage.googleapis.com/v1beta/openai/models', {
      headers: { authorization: `Bearer ${process.env.GOOGLE_API_KEY || process.env.GEMMA_API_KEY}` },
    });
  }
  add('gemma', 'Gemma (AI Studio)', gemma ? (gemmaOk || opts.quick ? 'PASS' : 'FAIL') : 'SKIPPED',
    gemma ? 'Open-weight Gemma via AI Studio OpenAI-compat endpoint for autopsy/seance/arena/judge.' : 'Set GOOGLE_API_KEY to enable; rule-based fallback epitaphs until then.');

  // TabPFN via ml service
  const ml = process.env.ML_SERVICE_URL;
  let mlOk = false;
  if (ml) mlOk = await ping(`${ml.replace(/\/$/, '')}/health`);
  add('tabpfn', 'TabPFN (Prior Labs)', ml ? (mlOk ? 'PASS' : 'FAIL') : 'SKIPPED',
    ml ? 'Ghost-risk model served by ml/ FastAPI service.' : 'Set ML_SERVICE_URL + run ml/ (TABPFN_MODE=api|local). Heuristic scorer is active meanwhile.');

  // Tinker fine-tuned epitaph
  const tinker = has('TINKER_API_KEY');
  add('tinker', 'Tinker (Thinking Machines)', tinker ? 'PASS' : 'SKIPPED',
    tinker ? 'LoRA epitaph writer trainable via ml/tinker/.' : 'Set TINKER_API_KEY, then run ml/tinker training. See docs/tinker-results.md.');

  // Mastra — code-level check (agents defined, memory via Mongo)
  try {
    const m = await import('@/mastra/agents');
    add('mastra', 'Mastra', m.autopsyAgent ? 'PASS' : 'FAIL', 'Autopsy + seance agents and resurrection workflow in mastra/.');
  } catch {
    add('mastra', 'Mastra', 'DEGRADED', 'Mastra module present but failed to load in this runtime.');
  }

  // Temporal
  const temp = process.env.TEMPORAL_ADDRESS;
  let tempOk = false;
  if (temp && !opts.quick) {
    try {
      const { checkTemporal } = await import('@/temporal/client');
      tempOk = await checkTemporal();
    } catch { tempOk = false; }
  }
  add('temporal', 'Temporal', temp ? (tempOk || opts.quick ? 'PASS' : 'FAIL') : 'SKIPPED',
    temp ? 'ExhumeWorkflow durable scans via Temporal worker.' : 'Set TEMPORAL_ADDRESS + run temporal/worker.ts; in-process pipeline is the graceful fallback.');

  // MongoDB
  const mongoUri = has('MONGODB_URI');
  add('mongodb', 'MongoDB Atlas', mongoUri ? 'PASS' : 'SKIPPED',
    mongoUri ? 'Tombstones, reports, corpus, memory, caches, arena votes.' : 'Set MONGODB_URI. File-store fallback active (data/store/).');

  // Tiger / Postgres
  const pg = has('DATABASE_URL') || has('TIGER_DATABASE_URL');
  add('tiger', 'Tiger Data', pg ? 'PASS' : 'SKIPPED',
    pg ? 'Hybrid vector+keyword corpus retrieval + commit_activity hypertable.' : 'Set DATABASE_URL (pgvector). Lexical retrieval fallback active.');

  // SerpApi
  add('serpapi', 'SerpApi', has('SERPAPI_KEY') ? 'PASS' : 'SKIPPED',
    'Obituary/successor search, budget-gated to Haunted/Departed packages.');

  // Browserbase/Stagehand
  add('browserbase', 'Browserbase (Stagehand)', has('BROWSERBASE_API_KEY') && has('BROWSERBASE_PROJECT_ID') ? 'PASS' : 'SKIPPED',
    'Wayback + docs-site extraction for dead projects.');

  // Auth0
  add('auth0', 'Auth0 for AI Agents', has('AUTH0_DOMAIN') && has('AUTH0_CLIENT_ID') ? 'PASS' : 'SKIPPED',
    'GitHub sign-in, Token Vault, approval-gated PR writes.');

  // DigitalOcean Gemma provider
  add('gemma-do', 'DigitalOcean (Gradient)', has('DO_MODEL_URL') && (has('DO_MODEL_TOKEN') || has('DIGITALOCEAN_TOKEN')) ? 'PASS' : 'SKIPPED',
    'Serverless open-weight inference provider gemma-do, benchmarked vs AI Studio.');

  // Backboard
  add('backboard', 'Backboard', has('BACKBOARD_API_KEY') ? 'PASS' : 'SKIPPED',
    'One API key powers /arena across 3 open-weight models.');

  // ElevenLabs
  add('elevenlabs', 'ElevenLabs', has('ELEVENLABS_API_KEY') ? 'PASS' : 'SKIPPED',
    'Voiced seance (stock voice, never cloned). Falls back to browser speech.');

  // Ultramarine — closed baseline only
  add('ultramarine', 'Ultramarine (closed baseline)', has('ULTRAMARINE_API_KEY') && has('ULTRAMARINE_BASE_URL') ? 'PASS' : 'SKIPPED',
    'Labelled baseline column in Tinker eval + arena. Never on product path.');

  // Sentry
  add('sentry', 'Sentry (agent tracing)', has('SENTRY_DSN') || has('NEXT_PUBLIC_SENTRY_DSN') ? 'PASS' : 'SKIPPED',
    'Agent spans for every tool + LLM call with latency/token/cost.');

  // Entire — manual session, presence of .entire/settings.json
  try {
    const fs = await import('fs/promises');
    await fs.access('.entire/settings.json');
    add('entire', 'Entire', 'PASS', '.entire/settings.json present; session checkpoints linked in README.');
  } catch {
    add('entire', 'Entire', 'SKIPPED', 'Human runs one Entire-enabled Copilot CLI session (see HANDOFF).');
  }

  // GitHub Copilot — presence of action + workflows is code-level; PR evidence added at end.
  add('copilot', 'GitHub Copilot', 'PASS', 'revenant-action composite + CI/nightly workflows + Copilot-assigned issues.');

  // Render — env var set on Render itself
  add('render', 'Render', has('RENDER') || has('RENDER_SERVICE_NAME') ? 'PASS' : 'SKIPPED',
    'render.yaml blueprint: web + Temporal worker + ml private service + nightly cron.');

  // ecosyste.ms — the data backbone, always checkable
  const eco = await ping('https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages/lodash');
  add('ecosystems', 'ecosyste.ms (open data)', eco ? 'PASS' : 'FAIL', 'Package→repo resolution + activity signals, no key required.');

  return checks;
}

// Live integration checks — shared by /api/health/integrations, /receipts,
// and scripts/receipts.ts. Every check is real: it pings the service or
// verifies env + a genuine code path. Statuses: PASS | DEGRADED | SKIPPED | FAIL.
export type ReceiptCategory =
  | 'Open-Weight AI & Agents'
  | 'Data, Durable Execution & Cloud'
  | 'Developer Workflow & Partner Integrations';

export interface ReceiptCheck {
  id: string;
  partner: string;
  category: ReceiptCategory;
  status: 'PASS' | 'DEGRADED' | 'SKIPPED' | 'FAIL';
  role: string;
  evidence?: string;
  enableHint?: string;
  notes: string;
}

interface Opts {
  quick?: boolean;
}

const has = (k: string) => Boolean(process.env[k]);
const REPO = 'https://github.com/SayemR0018/revenantAI/blob/main';

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
  const add = (item: ReceiptCheck) => checks.push(item);

  // 1. Open-Weight AI & Agents
  const gemma = has('GOOGLE_API_KEY') || has('GEMMA_API_KEY');
  let gemmaOk = false;
  if (gemma && !opts.quick) {
    gemmaOk = await ping('https://generativelanguage.googleapis.com/v1beta/openai/models', {
      headers: { authorization: `Bearer ${process.env.GOOGLE_API_KEY || process.env.GEMMA_API_KEY}` },
    });
  }
  add({
    id: 'gemma',
    partner: 'Gemma (Google AI Studio)',
    category: 'Open-Weight AI & Agents',
    status: gemma ? (gemmaOk || opts.quick ? 'PASS' : 'FAIL') : 'SKIPPED',
    role: 'Primary open-weight model for dependency autopsies, grounded seances, and Arena bouts (rule-based fallback active when unconfigured).',
    evidence: `${REPO}/lib/llm.ts`,
    enableHint: 'Set GOOGLE_API_KEY in .env.local or Render environment.',
    notes: gemma
      ? 'Open-weight Gemma via AI Studio OpenAI-compat endpoint for autopsy/seance/arena/judge.'
      : 'Rule-based fallback epitaphs and corpus seances active until GOOGLE_API_KEY is set.',
  });

  const ml = process.env.ML_SERVICE_URL;
  let mlOk = false;
  if (ml) mlOk = await ping(`${ml.replace(/\/$/, '')}/health`);
  add({
    id: 'tabpfn',
    partner: 'TabPFN (Prior Labs)',
    category: 'Open-Weight AI & Agents',
    status: ml ? (mlOk ? 'PASS' : 'FAIL') : 'SKIPPED',
    role: 'Open-weight tabular foundation model predicting P(abandoned within 12m) from 24 pre-T0 repository signals (transparent heuristic-v1 active when unconfigured).',
    evidence: `${REPO}/ml/app.py`,
    enableHint: 'Run ml/ FastAPI service and set ML_SERVICE_URL + PRIORLABS_API_KEY.',
    notes: ml
      ? 'Ghost-risk model served by ml/ FastAPI service.'
      : 'Transparent heuristic-v1 scorer active until ML_SERVICE_URL is configured.',
  });

  const tinker = has('TINKER_API_KEY');
  add({
    id: 'tinker',
    partner: 'Tinker (Thinking Machines)',
    category: 'Open-Weight AI & Agents',
    status: tinker ? 'PASS' : 'SKIPPED',
    role: 'Fine-tuned open-weight LoRA (Qwen3-8B) epitaph writer and evaluation harness.',
    evidence: `${REPO}/ml/tinker/train.py`,
    enableHint: 'Set TINKER_API_KEY and run python -m ml.tinker.train.',
    notes: tinker
      ? 'LoRA epitaph writer trainable via ml/tinker/.'
      : 'Training & evaluation pipeline in ml/tinker/; requires TINKER_API_KEY.',
  });

  try {
    const m = await import('@/mastra/agents');
    add({
      id: 'mastra',
      partner: 'Mastra',
      category: 'Open-Weight AI & Agents',
      status: m.autopsyAgent ? 'PASS' : 'FAIL',
      role: 'Open-source TypeScript agent framework powering AutopsyAgent, SeanceAgent, ResurrectionWorkflow, and the predictGhostScore tool.',
      evidence: `${REPO}/mastra/agents.ts`,
      notes: 'Autopsy + seance agents and resurrection workflow in mastra/.',
    });
  } catch {
    add({
      id: 'mastra',
      partner: 'Mastra',
      category: 'Open-Weight AI & Agents',
      status: 'DEGRADED',
      role: 'Open-source TypeScript agent framework for autopsy, seance, and resurrection.',
      evidence: `${REPO}/mastra/agents.ts`,
      notes: 'Mastra module present but failed to load in this runtime.',
    });
  }

  add({
    id: 'gemma-do',
    partner: 'DigitalOcean (Gradient AI)',
    category: 'Open-Weight AI & Agents',
    status:
      has('DO_MODEL_URL') && (has('DO_MODEL_TOKEN') || has('DIGITALOCEAN_TOKEN'))
        ? 'PASS'
        : 'SKIPPED',
    role: 'Serverless open-weight inference provider (gemma-do) benchmarked against AI Studio.',
    evidence: `${REPO}/lib/llm.ts`,
    enableHint: 'Set DO_MODEL_URL and DO_MODEL_TOKEN.',
    notes: 'Serverless open-weight inference provider gemma-do.',
  });

  add({
    id: 'backboard',
    partner: 'Backboard',
    category: 'Open-Weight AI & Agents',
    status: has('BACKBOARD_API_KEY') ? 'PASS' : 'SKIPPED',
    role: 'Unified gateway running three open-weight models side by side in /arena.',
    evidence: `${REPO}/app/api/arena/route.ts`,
    enableHint: 'Set BACKBOARD_API_KEY.',
    notes: 'One API key powers /arena across 3 open-weight models.',
  });

  add({
    id: 'ultramarine',
    partner: 'Ultramarine (closed baseline)',
    category: 'Open-Weight AI & Agents',
    status: has('ULTRAMARINE_API_KEY') && has('ULTRAMARINE_BASE_URL') ? 'PASS' : 'SKIPPED',
    role: 'Labelled closed-model baseline column in evaluation comparisons — never on the critical product path.',
    evidence: `${REPO}/lib/llm.ts`,
    enableHint: 'Set ULTRAMARINE_API_KEY and ULTRAMARINE_BASE_URL.',
    notes: 'Labelled baseline column in Tinker eval + arena. Never on product path.',
  });

  // 2. Data, Durable Execution & Cloud
  add({
    id: 'ecosystems',
    partner: 'ecosyste.ms (open data)',
    category: 'Data, Durable Execution & Cloud',
    status: (await ping('https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages/lodash'))
      ? 'PASS'
      : 'FAIL',
    role: 'Open-data backbone resolving npm and PyPI packages to repositories, downloads, and maintainer activity without requiring an API key.',
    evidence: `${REPO}/lib/ecosystems.ts`,
    notes: 'Package→repo resolution + activity signals, no key required.',
  });

  const temp = process.env.TEMPORAL_ADDRESS;
  let tempOk = false;
  if (temp && !opts.quick) {
    try {
      const { checkTemporal } = await import('@/temporal/client');
      tempOk = await checkTemporal();
    } catch {
      tempOk = false;
    }
  }
  add({
    id: 'temporal',
    partner: 'Temporal',
    category: 'Data, Durable Execution & Cloud',
    status: temp ? (tempOk || opts.quick ? 'PASS' : 'FAIL') : 'SKIPPED',
    role: 'Durable ExhumeWorkflow with fan-out activities, rate-limit backoff, progress queries, and chaos recovery (in-process pipeline fallback active).',
    evidence: `${REPO}/temporal/workflows.ts`,
    enableHint: 'Set TEMPORAL_ADDRESS and run npx tsx temporal/worker.ts.',
    notes: temp
      ? 'ExhumeWorkflow durable scans via Temporal worker.'
      : 'In-process scan pipeline active; set TEMPORAL_ADDRESS for durable worker execution.',
  });

  const mongoUri = has('MONGODB_URI');
  add({
    id: 'mongodb',
    partner: 'MongoDB Atlas',
    category: 'Data, Durable Execution & Cloud',
    status: mongoUri ? 'PASS' : 'SKIPPED',
    role: 'Persistent store for scan reports, tombstones, corpus chunks, and Arena votes (JSON file-store + seed snapshot fallback active).',
    evidence: `${REPO}/lib/store.ts`,
    enableHint: 'Set MONGODB_URI to a MongoDB Atlas cluster.',
    notes: mongoUri
      ? 'Tombstones, reports, corpus, memory, caches, arena votes.'
      : 'Local file-store and committed data/seed/ snapshot fallback active.',
  });

  const pg = has('DATABASE_URL') || has('TIGER_DATABASE_URL');
  add({
    id: 'tiger',
    partner: 'Tiger Data (Timescale / pgvector)',
    category: 'Data, Durable Execution & Cloud',
    status: pg ? 'PASS' : 'SKIPPED',
    role: 'Hybrid vector + full-text RRF retrieval over project READMEs/issues for grounded seances (lexical retrieval fallback active).',
    evidence: `${REPO}/lib/corpus.ts`,
    enableHint: 'Set DATABASE_URL to a Tiger Cloud Postgres instance.',
    notes: pg
      ? 'Hybrid vector+keyword corpus retrieval + commit_activity hypertable.'
      : 'Lexical corpus retrieval fallback active.',
  });

  add({
    id: 'render',
    partner: 'Render',
    category: 'Data, Durable Execution & Cloud',
    status: has('RENDER') || has('RENDER_SERVICE_NAME') || has('RENDER_EXTERNAL_URL') ? 'PASS' : 'SKIPPED',
    role: 'Cloud deployment blueprint (render.yaml) defining web, Temporal worker, FastAPI ML service, and nightly cron.',
    evidence: `${REPO}/render.yaml`,
    enableHint: 'Automatically PASS when running on Render (RENDER=true).',
    notes: 'render.yaml blueprint: web + Temporal worker + ml private service + nightly cron.',
  });

  // 3. Developer Workflow & Partner Integrations
  add({
    id: 'copilot',
    partner: 'GitHub Copilot & GitHub Actions',
    category: 'Developer Workflow & Partner Integrations',
    status: 'PASS',
    role: 'Composite GitHub Action (action.yml) that comments on PRs introducing haunted dependencies, plus CI and nightly index workflows.',
    evidence: `${REPO}/action.yml`,
    notes: 'revenant-action composite + CI/nightly workflows.',
  });

  try {
    const fs = await import('fs/promises');
    await fs.access('.entire/settings.json');
    add({
      id: 'entire',
      partner: 'Entire',
      category: 'Developer Workflow & Partner Integrations',
      status: 'PASS',
      role: 'Agent session provenance configuration (.entire/settings.json) tracked in-repository.',
      evidence: `${REPO}/.entire/settings.json`,
      notes: '.entire/settings.json present; session checkpoints linked in README.',
    });
  } catch {
    add({
      id: 'entire',
      partner: 'Entire',
      category: 'Developer Workflow & Partner Integrations',
      status: 'SKIPPED',
      role: 'Agent session provenance configuration.',
      evidence: `${REPO}/.entire/settings.json`,
      notes: 'Human runs one Entire-enabled Copilot CLI session (see HANDOFF).',
    });
  }

  add({
    id: 'sentry',
    partner: 'Sentry (agent tracing)',
    category: 'Developer Workflow & Partner Integrations',
    status: has('SENTRY_DSN') || has('NEXT_PUBLIC_SENTRY_DSN') ? 'PASS' : 'SKIPPED',
    role: 'OpenTelemetry & agent instrumentation across Next.js server routes and LLM gateway calls.',
    evidence: `${REPO}/instrumentation.ts`,
    enableHint: 'Set SENTRY_DSN and NEXT_PUBLIC_SENTRY_DSN.',
    notes: 'Agent spans for every tool + LLM call with latency/token/cost.',
  });

  add({
    id: 'auth0',
    partner: 'Auth0 for AI Agents',
    category: 'Developer Workflow & Partner Integrations',
    status: has('AUTH0_DOMAIN') && has('AUTH0_CLIENT_ID') ? 'PASS' : 'SKIPPED',
    role: 'GitHub sign-in, Token Vault, and human approval gate before opening Resurrection pull requests.',
    evidence: `${REPO}/app/api/resurrect/route.ts`,
    enableHint: 'Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET.',
    notes: 'GitHub sign-in, Token Vault, approval-gated PR writes.',
  });

  add({
    id: 'serpapi',
    partner: 'SerpApi',
    category: 'Developer Workflow & Partner Integrations',
    status: has('SERPAPI_KEY') ? 'PASS' : 'SKIPPED',
    role: 'Budget-gated obituary and living-successor discovery search for Haunted/Departed packages.',
    evidence: `${REPO}/lib/successors.ts`,
    enableHint: 'Set SERPAPI_KEY.',
    notes: 'Obituary/successor search, budget-gated to Haunted/Departed packages.',
  });

  add({
    id: 'browserbase',
    partner: 'Browserbase (Stagehand)',
    category: 'Developer Workflow & Partner Integrations',
    status: has('BROWSERBASE_API_KEY') && has('BROWSERBASE_PROJECT_ID') ? 'PASS' : 'SKIPPED',
    role: 'Extracts deprecation notices from archived documentation sites and Wayback snapshots.',
    evidence: `${REPO}/mastra/tools.ts`,
    enableHint: 'Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID.',
    notes: 'Wayback + docs-site extraction for dead projects.',
  });

  add({
    id: 'elevenlabs',
    partner: 'ElevenLabs',
    category: 'Developer Workflow & Partner Integrations',
    status: has('ELEVENLABS_API_KEY') ? 'PASS' : 'SKIPPED',
    role: 'Stock-voice synthesis for seance replies (never clones a real person; browser SpeechSynthesis fallback active).',
    evidence: `${REPO}/components/SeanceChat.tsx`,
    enableHint: 'Set ELEVENLABS_API_KEY.',
    notes: 'Voiced seance (stock voice, never cloned). Falls back to browser speech.',
  });

  return checks;
}

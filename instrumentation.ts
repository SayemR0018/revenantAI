// Sentry agent tracing — enabled only when SENTRY_DSN is set.
// Spans for every agent step, tool call, and LLM call carry latency,
// token usage, and estimated cost.
export async function register() {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  try {
    const Sentry = await import('@sentry/' + 'nextjs');
    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
      // Agent tracing: instrument the LLM gateway. lib/llm.ts reports
      // token usage per call; costs estimated per provider price sheet.
    });
  } catch {
    // @sentry/nextjs not installed — tracing disabled
  }
}

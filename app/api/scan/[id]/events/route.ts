import { NextRequest } from 'next/server';
import { getReport } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// SSE progress stream. Polls the store (Mongo or file) and emits deltas;
// terminates when the report finishes or after 5 minutes.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const deadline = Date.now() + 5 * 60_000;
      let lastPhase = '';
      let lastDone = -1;
      while (Date.now() < deadline) {
        const r = await getReport(id);
        if (!r) {
          send('error', { error: 'report not found' });
          break;
        }
        if (r.progress.done !== lastDone || r.progress.phase !== lastPhase) {
          lastDone = r.progress.done;
          lastPhase = r.progress.phase;
          send('progress', { ...r.progress, status: r.status });
        }
        if (r.status === 'done' || r.status === 'error') {
          send(r.status === 'done' ? 'done' : 'error', { status: r.status, summary: r.summary, error: r.error });
          break;
        }
        await new Promise((r2) => setTimeout(r2, 700));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}

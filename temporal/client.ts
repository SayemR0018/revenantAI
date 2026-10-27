// Temporal client helpers — imported lazily so the app boots without a server.
const NS = process.env.TEMPORAL_NAMESPACE || 'default';
const TASKQ = 'revenant';

export async function checkTemporal(): Promise<boolean> {
  try {
    const { Connection } = await import('@temporalio/client');
    const conn = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS,
      ...(process.env.TEMPORAL_API_KEY
        ? { apiKey: process.env.TEMPORAL_API_KEY, tls: true }
        : {}),
      connectTimeout: 4000,
    });
    await conn.ensureConnected();
    return true;
  } catch {
    return false;
  }
}

export async function startExhume(reportId: string): Promise<string> {
  const { Client } = await import('@temporalio/client');
  const client = new Client({
    namespace: NS,
    connection: await (await import('@temporalio/client')).Connection.connect({
      address: process.env.TEMPORAL_ADDRESS,
      ...(process.env.TEMPORAL_API_KEY ? { apiKey: process.env.TEMPORAL_API_KEY, tls: true } : {}),
    }),
  });
  const h = await client.workflow.start('ExhumeWorkflow', {
    taskQueue: TASKQ,
    workflowId: `exhume-${reportId}`,
    args: [reportId],
  });
  return h.workflowId;
}

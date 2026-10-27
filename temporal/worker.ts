// Temporal worker — `npx tsx temporal/worker.ts`
// Deployed as a Render background worker; runs ExhumeWorkflow activities.
import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities';

async function main() {
  const address = process.env.TEMPORAL_ADDRESS;
  if (!address) {
    console.error('TEMPORAL_ADDRESS unset — worker exiting (in-process pipeline handles scans).');
    process.exit(0);
  }
  const connection = await NativeConnection.connect({
    address,
    ...(process.env.TEMPORAL_API_KEY ? { apiKey: process.env.TEMPORAL_API_KEY, tls: {} } : {}),
  });
  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    taskQueue: 'revenant',
    workflowsPath: require.resolve('./workflows'),
    activities,
  });
  console.log('revenant temporal worker listening on task queue "revenant"');
  await worker.run();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

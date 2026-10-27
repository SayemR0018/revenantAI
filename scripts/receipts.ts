// Generates receipts.json from live integration checks.
// Run: npx tsx scripts/receipts.ts
import { promises as fs } from 'fs';
import { runReceiptChecks } from '../lib/receipts-core';

async function main() {
  const checks = await runReceiptChecks({ quick: false });
  const out = {
    generatedAt: new Date().toISOString(),
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000',
    checks,
    legend: { PASS: 'genuinely working and load-bearing', DEGRADED: 'works partially / code-complete pending credentials', SKIPPED: 'not configured — see notes', FAIL: 'configured but health check failed' },
  };
  await fs.writeFile('receipts.json', JSON.stringify(out, null, 2));
  console.log(`receipts.json: ${checks.filter((c) => c.status === 'PASS').length} PASS, ${checks.filter((c) => c.status === 'DEGRADED').length} DEGRADED, ${checks.filter((c) => c.status === 'SKIPPED').length} SKIPPED, ${checks.filter((c) => c.status === 'FAIL').length} FAIL`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

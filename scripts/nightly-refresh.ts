// Nightly Graveyard Index refresh — Render cron job.
// Rebuilds the index snapshot (top packages by downloads) and publishes it
// as a release asset for `revenant-cli --offline`.
import { execFileSync } from 'child_process';

console.log('nightly refresh: rebuilding cementerio index');
execFileSync('npx', ['tsx', 'scripts/seed-cementerio.ts', '--npm', '2000', '--pypi', '1000'], { stdio: 'inherit' });
console.log('nightly refresh: done');

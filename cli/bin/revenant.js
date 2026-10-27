#!/usr/bin/env node
// revenant-cli — scan local manifests for ghost dependencies.
// Usage:
//   revenant scan [path]            scan package.json / requirements.txt / pyproject.toml
//   revenant scan --offline         bundled index snapshot only (lights + internet off)
//   revenant scan --json            machine-readable output for CI
//   revenant tombstone <eco>/<pkg>  print a tombstone for one package
import { parseManifestFile } from '../lib/parse.js';
import { scoreDep, scoreDepOffline } from '../lib/score.js';
import { tombstone, progress } from '../lib/render.js';

const args = process.argv.slice(2);
const cmd = args.find((a) => !a.startsWith('-')) ?? 'scan';
const OFFLINE = args.includes('--offline');
const JSON_OUT = args.includes('--json');
const QUIET = args.includes('--quiet');
const dir = args.filter((a) => !a.startsWith('-')).slice(1)[0] ?? '.';

async function main() {
  const found = parseManifestFile(dir);
  if (!found || !found.deps.length) {
    console.error('no manifest found (looked for package.json, requirements.txt, pyproject.toml)');
    process.exit(2);
  }
  if (!QUIET && !JSON_OUT) progress(`exhuming ${found.deps.length} dependencies from ${found.kind}…`);

  const results = [];
  for (const dep of found.deps) {
    const r = OFFLINE ? scoreDepOffline(dep) : await scoreDep(dep).catch(() => scoreDepOffline(dep));
    results.push(r);
    if (!QUIET && !JSON_OUT) process.stdout.write(`\r  ${results.length}/${found.deps.length} — ${dep.name}`.padEnd(60));
  }
  if (!QUIET && !JSON_OUT) process.stdout.write('\n');

  if (JSON_OUT) {
    console.log(JSON.stringify({ manifest: found.kind, count: results.length, results }, null, 1));
    return;
  }
  const ghosts = results.filter((r) => r.band === 'haunted' || r.band === 'departed');
  results.sort((a, b) => b.score - a.score);
  console.log('');
  console.log(
    ghosts.length
      ? `  ${ghosts.length} ghost${ghosts.length === 1 ? '' : 's'} among ${results.length} dependencies.`
      : `  no ghosts among ${results.length} dependencies — a healthy tree.`,
  );
  for (const r of results.filter((r) => r.score >= 25 || r.error)) {
    console.log(tombstone(r));
  }
  if (OFFLINE) console.log('\n  (offline mode — bundled snapshot + local rules; run online for live signals)');
}

if (cmd === 'tombstone') {
  const ref = args[args.indexOf('tombstone') + 1];
  const [eco, name] = (ref ?? '').split('/');
  if (!eco || !name) {
    console.error('usage: revenant tombstone <npm|pypi>/<name>');
    process.exit(2);
  }
  if (!scoreDepOffline({ ecosystem: eco, name })) process.exit(1);
  scoreDep({ ecosystem: eco, name }).then((r) => console.log(tombstone(r, true)));
} else {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}

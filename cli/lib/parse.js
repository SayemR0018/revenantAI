import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function parseManifestFile(dir) {
  const pjson = join(dir, 'package.json');
  const reqs = join(dir, 'requirements.txt');
  const pyproj = join(dir, 'pyproject.toml');
  if (existsSync(pjson)) return { kind: 'package.json', deps: parsePjson(readFileSync(pjson, 'utf8')) };
  if (existsSync(reqs)) return { kind: 'requirements.txt', deps: parseReqs(readFileSync(reqs, 'utf8')) };
  if (existsSync(pyproj)) return { kind: 'pyproject.toml', deps: parsePyproj(readFileSync(pyproj, 'utf8')) };
  return null;
}

function parsePjson(raw) {
  const j = JSON.parse(raw);
  const out = [];
  for (const sec of ['dependencies', 'devDependencies']) {
    for (const name of Object.keys(j[sec] ?? {})) out.push({ ecosystem: 'npm', name });
  }
  return out;
}

function parseReqs(raw) {
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('-')) continue;
    const m = t.match(/^([A-Za-z0-9._-]+)/);
    if (m) out.push({ ecosystem: 'pypi', name: m[1].toLowerCase().replace(/_/g, '-') });
  }
  return out;
}

function parsePyproj(raw) {
  const out = [];
  for (const m of raw.matchAll(/dependencies\s*=\s*\[([^\]]*)\]/s)) {
    for (const q of m[1].matchAll(/"([^"]+)"|'([^']+)'/g)) {
      const spec = q[1] ?? q[2];
      const name = spec.split(/[\s<>=!~;\[]/)[0];
      if (name) out.push({ ecosystem: 'pypi', name: name.toLowerCase() });
    }
  }
  return out;
}

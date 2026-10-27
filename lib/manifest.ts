import { DepRef } from './types';

const NPM_SCOPE_OK = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i;
const PYPI_OK = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/i;

/** Parse a package.json string into dependency refs. */
export function parsePackageJson(raw: string): DepRef[] {
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error('Not valid JSON — paste the full package.json contents.');
  }
  const deps: DepRef[] = [];
  const sections = ['dependencies'] as const;
  const devSections = ['devDependencies'] as const;
  const push = (obj: unknown, dev: boolean) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [name, spec] of Object.entries(obj as Record<string, string>)) {
      if (!NPM_SCOPE_OK.test(name)) continue;
      deps.push({ ecosystem: 'npm', name, versionSpec: String(spec ?? '') + (dev ? ' (dev)' : '') });
    }
  };
  for (const s of sections) push(json[s], false);
  for (const s of devSections) push(json[s], true);
  return deps;
}

/** Parse requirements.txt — handles ==, >=, ~=, extras, comments, -r flags are ignored. */
export function parseRequirementsTxt(raw: string): DepRef[] {
  const deps: DepRef[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('-')) continue;
    const m = t.match(/^([A-Za-z0-9._-]+)(\[[^\]]*\])?\s*(.*)$/);
    if (!m) continue;
    const name = m[1];
    if (!PYPI_OK.test(name)) continue;
    deps.push({ ecosystem: 'pypi', name: name.toLowerCase().replace(/_/g, '-'), versionSpec: m[3]?.trim() });
  }
  return deps;
}

/** Parse pyproject.toml dependencies — minimal TOML scan, no dep needed. */
export function parsePyprojectToml(raw: string): DepRef[] {
  const deps: DepRef[] = [];
  let inDeps = false;
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (/^\[/.test(t)) {
      inDeps = false;
      continue;
    }
    if (/^dependencies\s*=\s*\[/.test(t)) {
      inDeps = !t.includes(']');
      const inline = t.match(/\[([^\]]*)\]/);
      if (inline) {
        for (const m of inline[1].matchAll(/"([^"]+)"|'([^']+)'/g)) {
          const spec = m[1] ?? m[2];
          const name = spec.split(/[\s<>=!~;\[]/)[0];
          if (PYPI_OK.test(name)) deps.push({ ecosystem: 'pypi', name: name.toLowerCase() });
        }
      }
      continue;
    }
    if (inDeps) {
      const m = t.match(/^["']([^"']+)["']/);
      if (m) {
        const spec = m[1];
        const name = spec.split(/[\s<>=!~;\[]/)[0];
        if (PYPI_OK.test(name)) deps.push({ ecosystem: 'pypi', name: name.toLowerCase(), versionSpec: spec.slice(name.length).trim() });
      }
      if (t.includes(']')) inDeps = false;
    }
  }
  return deps;
}

/** Auto-detect manifest format and parse. */
export function parseManifest(raw: string): { deps: DepRef[]; kind: string } {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return { deps: parsePackageJson(trimmed), kind: 'package.json' };
  if (/^\[?(build-system|project|tool\.poetry)/m.test(trimmed)) {
    const deps = parsePyprojectToml(trimmed);
    if (deps.length) return { deps, kind: 'pyproject.toml' };
  }
  const deps = parseRequirementsTxt(trimmed);
  if (deps.length) return { deps, kind: 'requirements.txt' };
  throw new Error('Could not detect a manifest. Paste package.json, requirements.txt, or pyproject.toml.');
}

export function dedupeDeps(deps: DepRef[]): DepRef[] {
  const seen = new Set<string>();
  return deps.filter((d) => {
    const k = `${d.ecosystem}/${d.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

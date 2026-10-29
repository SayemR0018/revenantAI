import { describe, it, expect } from 'vitest';
import { parsePackageJson, parseRequirementsTxt, parsePyprojectToml, parseManifest, dedupeDeps } from '@/lib/manifest';
import { bandFor, visualBandFor } from '@/lib/types';
import { heuristicScore } from '@/lib/score';
import { classifyCause } from '@/lib/epitaph';

describe('manifest parsing', () => {
  it('parses package.json deps + devDeps', () => {
    const deps = parsePackageJson(JSON.stringify({
      dependencies: { lodash: '^4.17.21', '@scope/pkg': '1.0.0' },
      devDependencies: { vitest: '^2' },
      junk: { '../evil/../path': 'x' },
    }));
    const names = deps.map((d) => d.name);
    expect(names).toContain('lodash');
    expect(names).toContain('@scope/pkg');
    expect(names).toContain('vitest');
    expect(names).not.toContain('../evil/../path');
  });

  it('parses requirements.txt', () => {
    const deps = parseRequirementsTxt('flask==3.0.0\n# comment\nrequests[socks]>=2\n-r other.txt\nnumpy ; python_version>"3.10"');
    expect(deps.map((d) => d.name)).toEqual(['flask', 'requests', 'numpy']);
  });

  it('parses pyproject.toml inline + multiline', () => {
    const inline = parsePyprojectToml('[project]\ndependencies = ["fastapi", "uvicorn>=0.30"]');
    expect(inline.map((d) => d.name)).toEqual(['fastapi', 'uvicorn']);
    const multi = parsePyprojectToml('[project]\ndependencies = [\n  "fastapi",\n  "pydantic<3",\n]\n');
    expect(multi.map((d) => d.name)).toEqual(['fastapi', 'pydantic']);
  });

  it('auto-detects format', () => {
    expect(parseManifest('{"dependencies":{"a":"1"}}').kind).toBe('package.json');
    expect(parseManifest('flask==3.0.0').kind).toBe('requirements.txt');
  });

  it('dedupes', () => {
    const d = dedupeDeps([{ ecosystem: 'npm', name: 'a' }, { ecosystem: 'npm', name: 'a' }, { ecosystem: 'pypi', name: 'a' }]);
    expect(d).toHaveLength(2);
  });
});

describe('score banding', () => {
  it('bands correctly', () => {
    expect(bandFor(10)).toBe('alive');
    expect(bandFor(30)).toBe('fading');
    expect(bandFor(60)).toBe('haunted');
    expect(bandFor(80)).toBe('departed');
    expect(bandFor(10, true)).toBe('departed');
    expect(bandFor(10, false, true)).toBe('departed');
  });

  it('heuristic: archived package is departed', () => {
    const s = heuristicScore({ archived: true, daysSinceCommit: 900 });
    expect(s.band).toBe('departed');
    expect(s.score).toBeGreaterThanOrEqual(75);
  });

  it('heuristic: active project stays alive', () => {
    const s = heuristicScore({ daysSinceCommit: 5, daysSinceRelease: 40, authorsLast365: 8, busFactor: 0.4, issueCloseRate180: 0.8 });
    expect(s.band).toBe('alive');
  });

  it('heuristic: two years silent is haunted+', () => {
    const s = heuristicScore({ daysSinceCommit: 800, daysSinceRelease: 900 });
    expect(s.score).toBeGreaterThanOrEqual(50);
  });

  it('empty vitals classify as unknown without Infinity years', () => {
    const c = classifyCause({});
    expect(c.cause).toBe('unknown');
    expect(JSON.stringify(c.evidence)).not.toContain('Infinity');
    expect(visualBandFor({ band: 'alive', error: "We couldn't find enough public signals" })).toBe('unknown');
  });
});

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { parseManifest, dedupeDeps } from '@/lib/manifest';
import { Report, DepRef } from '@/lib/types';
import { saveReport } from '@/lib/store';
import { runScan } from '@/lib/pipeline';
import { githubRefFromUrl } from '@/lib/ecosystems';
import { fetchJson } from '@/lib/fetch';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface ScanBody {
  manifest?: string;
  repoUrl?: string;
  packageName?: string;
  ecosystem?: 'npm' | 'pypi';
  isPublic?: boolean;
}

async function depsFromRepo(repoUrl: string): Promise<{ deps: DepRef[]; label: string }> {
  const ref = githubRefFromUrl(repoUrl);
  if (!ref) throw new Error('Only github.com repo URLs are supported right now.');
  const headers: Record<string, string> = process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {};
  for (const file of ['package.json', 'requirements.txt', 'pyproject.toml']) {
    const d = await fetchJson<{ content?: string }>(
      `https://api.github.com/repos/${ref.owner}/${ref.repo}/contents/${file}`,
      { headers },
    ).catch(() => null);
    if (d?.content) {
      const text = Buffer.from(d.content, 'base64').toString('utf8');
      return { deps: dedupeDeps(parseManifest(text).deps), label: `${ref.owner}/${ref.repo}/${file}` };
    }
  }
  throw new Error('No package.json, requirements.txt, or pyproject.toml found at repo root.');
}

export async function POST(req: NextRequest) {
  let body: ScanBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  try {
    let deps: DepRef[] = [];
    let source: Report['source'] = 'manifest';
    let label = 'pasted manifest';

    if (body.manifest?.trim()) {
      const parsed = parseManifest(body.manifest);
      deps = dedupeDeps(parsed.deps);
      label = `pasted ${parsed.kind}`;
    } else if (body.repoUrl?.trim()) {
      source = 'repo';
      const r = await depsFromRepo(body.repoUrl.trim());
      deps = r.deps;
      label = r.label;
    } else if (body.packageName?.trim() && body.ecosystem) {
      source = 'package';
      deps = [{ ecosystem: body.ecosystem, name: body.packageName.trim() }];
      label = `${body.ecosystem}/${body.packageName.trim()}`;
    } else {
      return NextResponse.json({ error: 'provide manifest, repoUrl, or packageName+ecosystem' }, { status: 400 });
    }

    if (!deps.length) return NextResponse.json({ error: 'no dependencies found in input' }, { status: 422 });
    const capped = deps.slice(0, 200);

    const report: Report & { _deps?: DepRef[] } = {
      id: randomUUID().slice(0, 8),
      createdAt: new Date().toISOString(),
      source,
      sourceLabel: label,
      status: 'queued',
      progress: { done: 0, total: capped.length, phase: 'queued' },
      results: [],
      summary: { total: capped.length, alive: 0, fading: 0, haunted: 0, departed: 0, unknown: 0 },
      isPublic: body.isPublic === true,
      _deps: capped,
    };
    await saveReport(report as Report);

    // Kick the run: Temporal when configured, else in-process.
    if (process.env.TEMPORAL_ADDRESS) {
      const { startExhume } = await import('@/temporal/client');
      await startExhume(report.id).catch(async () => runScan(report.id));
    } else {
      runScan(report.id).catch(async (e) => {
        const r = await import('@/lib/store').then((m) => m.getReport(report.id));
        if (r) {
          r.status = 'error';
          r.error = String(e);
          await saveReport(r);
        }
      });
    }

    return NextResponse.json({ id: report.id }, { status: 202 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 422 });
  }
}

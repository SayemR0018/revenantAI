// Project corpus: grounded evidence for the seance + autopsy.
// Built from README, releases, issues — stored in the report store (Mongo when
// available) and in Tiger/pgvector when DATABASE_URL is set.
import { CorpusChunk, DepRef, RepoRef } from './types';
import { ghReadme } from './github';
import { getCorpus, saveCorpus } from './store';
import { fetchJson } from './fetch';

function splitChunks(text: string, size = 900): string[] {
  const paras = text.split(/\n{2,}/).map((s) => s.trim()).filter((s) => s.length > 40 && !s.startsWith('[!') && !/^!\[/.test(s));
  const out: string[] = [];
  let cur = '';
  for (const p of paras) {
    const clean = p.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '').replace(/[#*`]/g, '').trim();
    if (!clean) continue;
    if (cur.length + clean.length > size) {
      out.push(cur);
      cur = clean;
    } else {
      cur = cur ? `${cur}\n${clean}` : clean;
    }
  }
  if (cur) out.push(cur);
  return out.slice(0, 30);
}

export async function buildCorpus(dep: DepRef, repo?: RepoRef): Promise<CorpusChunk[]> {
  const packageId = `${dep.ecosystem}/${dep.name}`;
  const existing = await getCorpus(packageId);
  if (existing.length) return existing;

  const chunks: CorpusChunk[] = [];
  let i = 0;
  if (repo) {
    const readme = await ghReadme(repo.owner, repo.repo).catch(() => null);
    if (readme) {
      for (const text of splitChunks(readme)) {
        chunks.push({ id: `${packageId}#readme-${i++}`, packageId, source: 'readme', text, url: `${repo.url}#readme` });
      }
    }
    // recent release notes as "changelog" chunks
    const rels = await fetchJson<{ tag_name?: string; name?: string; body?: string; html_url?: string }[]>(
      `https://api.github.com/repos/${repo.owner}/${repo.repo}/releases?per_page=5`,
      { headers: process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {} },
    ).catch(() => null);
    if (Array.isArray(rels)) {
      for (const r of rels) {
        const body = (r.body ?? '').trim();
        if (body.length > 40) {
          for (const text of splitChunks(body, 700)) {
            chunks.push({ id: `${packageId}#rel-${r.tag_name ?? i}-${i++}`, packageId, source: 'release', text, url: r.html_url });
          }
        }
      }
    }
  }
  await saveCorpus(chunks);
  return chunks;
}

/** Lexical retrieval — BM25-lite: term-frequency ranking over corpus chunks.
 *  Tiger/pgvector replaces this with hybrid vector+keyword search when enabled. */
export function retrieve(chunks: CorpusChunk[], query: string, k = 4): CorpusChunk[] {
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  if (!terms.length) return chunks.slice(0, k);
  const scored = chunks.map((c) => {
    const text = c.text.toLowerCase();
    let s = 0;
    for (const t of terms) {
      let idx = 0;
      while ((idx = text.indexOf(t, idx)) !== -1) {
        s += 1;
        idx += t.length;
      }
    }
    return { c, s };
  });
  return scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k).map((x) => x.c);
}

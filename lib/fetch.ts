// Small fetch helpers: timeout, UA, in-memory+file cache.
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

const memCache = new Map<string, { at: number; ttl: number; data: unknown }>();
const CACHE_DIR = process.env.REVENANT_CACHE_DIR || path.join(process.cwd(), 'data', 'cache');

export async function cachedFetch<T>(
  url: string,
  opts: { ttlMs?: number; init?: RequestInit; key?: string } = {},
): Promise<T | null> {
  const ttl = opts.ttlMs ?? 6 * 3600_000;
  const key = opts.key ?? createHash('sha1').update(url).digest('hex');
  const hit = memCache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.data as T;

  const file = path.join(CACHE_DIR, `${key}.json`);
  try {
    const st = await fs.stat(file);
    if (Date.now() - st.mtimeMs < ttl) {
      const data = JSON.parse(await fs.readFile(file, 'utf8')) as T;
      memCache.set(key, { at: st.mtimeMs, ttl, data });
      return data;
    }
  } catch {
    /* no cache file */
  }

  const data = await fetchJson<T>(url, opts.init);
  if (data !== null) {
    memCache.set(key, { at: Date.now(), ttl, data });
    fs.mkdir(CACHE_DIR, { recursive: true })
      .then(() => fs.writeFile(file, JSON.stringify(data)))
      .catch(() => {});
  }
  return data;
}

export async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 12000): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'revenant/0.1 (ghost-in-the-machine; +https://github.com/SayemR0018/revenant)',
        Accept: 'application/json',
        ...(init.headers || {}),
      },
    });
    if (res.status === 404 || res.status === 410) return null;
    if (!res.ok) throw new FetchError(res.status, url);
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof FetchError) throw e;
    return null; // network/abort: treat as missing
  } finally {
    clearTimeout(t);
  }
}

export class FetchError extends Error {
  constructor(
    public status: number,
    url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
  }
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}

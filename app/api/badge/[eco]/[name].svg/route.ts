import { NextRequest, NextResponse } from 'next/server';
import { getTombstone } from '@/lib/tombstones';
import { Ecosystem } from '@/lib/types';

export const runtime = 'nodejs';

const COLORS: Record<string, string> = {
  alive: '#3fae5a',
  fading: '#e8b33c',
  haunted: '#e8890c',
  departed: '#8a2be2',
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ eco: string; name: string }> }) {
  const { eco, name } = await params;
  if (eco !== 'npm' && eco !== 'pypi') return new NextResponse('bad ecosystem', { status: 400 });
  const t = await getTombstone(eco as Ecosystem, decodeURIComponent(name));
  const isUnknown = !t || Boolean(t.error);
  const score = t?.score ?? 0;
  const band = t?.band ?? 'alive';
  const label = 'ghost risk';
  const value = isUnknown ? 'unknown' : `${score}%`;
  const color = isUnknown ? '#5c567a' : COLORS[band];
  const lw = 6 * label.length + 12;
  const vw = 6.4 * value.length + 12;
  const w = lw + vw;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#2a2547"/><rect x="${lw}" width="${vw}" height="20" fill="${color}"/><rect width="${w}" height="20" fill="url(#s)"/></g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="110">
    <text x="${(lw / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(lw - 12) * 10}">${label}</text>
    <text x="${(lw / 2) * 10}" y="140" transform="scale(.1)" textLength="${(lw - 12) * 10}">${label}</text>
    <text x="${(lw + vw / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(vw - 12) * 10}">${value}</text>
    <text x="${(lw + vw / 2) * 10}" y="140" transform="scale(.1)" textLength="${(vw - 12) * 10}">${value}</text>
  </g>
</svg>`;
  return new NextResponse(svg, {
    headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=3600' },
  });
}

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getTombstone } from '@/lib/tombstones';
import { Ecosystem, BAND_LABEL } from '@/lib/types';

export const runtime = 'nodejs';

const BAND_COLOR: Record<string, string> = {
  alive: '#3fae5a',
  fading: '#e8b33c',
  haunted: '#e8890c',
  departed: '#b06cf0',
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ eco: string; name: string }> }) {
  const { eco, name } = await params;
  if (eco !== 'npm' && eco !== 'pypi') return new Response('bad ecosystem', { status: 400 });
  const t = await getTombstone(eco as Ecosystem, decodeURIComponent(name)).catch(() => null);
  const score = t?.score ?? 0;
  const band = t?.band ?? 'alive';
  const color = BAND_COLOR[band];
  const epitaph = t?.autopsy?.epitaph ?? '';
  const epit = epitaph.length > 150 ? epitaph.slice(0, 147) + '…' : epitaph;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(160deg, #14112b 0%, #0d0b1e 70%)',
          color: '#f4ecd8', fontFamily: 'serif', padding: '64px', position: 'relative',
        }}
      >
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: 14 }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', width: 30, height: 14, background: i % 2 ? '#f2a33c' : '#c2410c', borderRadius: '0 0 15px 15px' }} />
          ))}
        </div>
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 6, color: '#f2a33c', textTransform: 'uppercase' }}>
          {'Revenant · Tombstone'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 48, flex: 1 }}>
          <div
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              width: 300, height: 360, background: '#1d1936', border: `3px solid ${color}`,
              borderRadius: '150px 150px 12px 12px', marginRight: 64,
            }}
          >
            <div style={{ display: 'flex', fontSize: 110, fontWeight: 700, color }}>{String(score)}</div>
            <div style={{ display: 'flex', fontSize: 24, color: '#9a90c4', letterSpacing: 4 }}>{'GHOST SCORE'}</div>
            <div style={{ display: 'flex', fontSize: 30, color, marginTop: 12 }}>{BAND_LABEL[band]}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
            <div style={{ display: 'flex', fontSize: 24, color: '#9a90c4', marginTop: 8 }}>{`${eco} package`}</div>
            {epit ? <div style={{ display: 'flex', fontSize: 26, color: '#d8cfe8', marginTop: 28, fontStyle: 'italic', lineHeight: 1.4 }}>{`“${epit}”`}</div> : null}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, color: '#6f6599' }}>
          <span style={{ display: 'flex' }}>{'signals, not verdicts'}</span>
          <span style={{ display: 'flex' }}>{'revenant — ghosts in your dependency tree'}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

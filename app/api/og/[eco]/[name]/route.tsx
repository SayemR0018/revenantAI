import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getTombstone } from '@/lib/tombstones';
import { Ecosystem, BAND_LABEL } from '@/lib/types';

export const runtime = 'nodejs';

const BAND_COLOR: Record<string, string> = {
  alive: '#52d170',
  fading: '#f2bd49',
  haunted: '#ff8c42',
  departed: '#c594ff',
  unknown: '#b0a8d1',
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ eco: string; name: string }> }) {
  const { eco, name } = await params;
  if (eco !== 'npm' && eco !== 'pypi') return new Response('bad ecosystem', { status: 400 });
  const decoded = decodeURIComponent(name);
  const t = await getTombstone(eco as Ecosystem, decoded).catch(() => null);
  const isUnknown = !t || Boolean(t.error);
  const scoreText = isUnknown ? '?' : String(t.score);
  const band = isUnknown ? 'unknown' : t.band;
  const color = BAND_COLOR[band] ?? '#b0a8d1';
  const epitaph = isUnknown
    ? "We couldn't find enough public signals"
    : (t?.autopsy?.epitaph ?? '');
  const epit = epitaph.length > 150 ? epitaph.slice(0, 147) + '…' : epitaph;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(160deg, #161233 0%, #0d0b1e 72%)',
          color: '#f4ecd8',
          fontFamily: 'serif',
          padding: '54px 64px',
          position: 'relative',
          border: '6px solid #f2a33c',
        }}
      >
        {/* Papel picado scallops */}
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: 14 }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                width: 40,
                height: 14,
                background: i % 3 === 0 ? '#f2a33c' : i % 3 === 1 ? '#e05297' : '#c594ff',
                borderRadius: '0 0 14px 14px',
              }}
            />
          ))}
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 24, letterSpacing: 5, color: '#f2a33c', textTransform: 'uppercase' }}>
            {'Revenant · Tombstone & Ofrenda'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[0, 1, 2, 3].map((p) => (
              <div
                key={p}
                style={{
                  display: 'flex',
                  width: 14,
                  height: 14,
                  borderRadius: 99,
                  background: p % 2 === 0 ? '#f2a33c' : '#c2410c',
                }}
              />
            ))}
          </div>
        </div>

        {/* Main Arch + Epitaph + Candles */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 36, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: 280,
              height: 340,
              background: '#1d1936',
              border: `3px solid ${color}`,
              borderRadius: '140px 140px 14px 14px',
              marginRight: 56,
            }}
          >
            <div style={{ display: 'flex', fontSize: 104, fontWeight: 700, color }}>{scoreText}</div>
            <div style={{ display: 'flex', fontSize: 20, color: '#a79ed1', letterSpacing: 4 }}>{'GHOST SCORE'}</div>
            <div style={{ display: 'flex', fontSize: 28, color, marginTop: 10, fontWeight: 700 }}>
              {BAND_LABEL[band].toUpperCase()}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', fontSize: 60, fontWeight: 700, lineHeight: 1.08 }}>{decoded}</div>
            <div style={{ display: 'flex', fontSize: 24, color: '#f2a33c', marginTop: 8 }}>{`${eco} package`}</div>
            {epit ? (
              <div
                style={{
                  display: 'flex',
                  fontSize: 25,
                  color: '#cfc6ab',
                  marginTop: 22,
                  fontStyle: 'italic',
                  lineHeight: 1.38,
                }}
              >
                {`“${epit}”`}
              </div>
            ) : null}

            {/* Ofrenda candles row */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, marginTop: 28 }}>
              {[0, 1, 2, 3, 4].map((c) => (
                <div key={c} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'flex',
                      width: 10,
                      height: 14,
                      borderRadius: '50%',
                      background: '#ffb757',
                      marginBottom: 2,
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      width: 14,
                      height: c % 2 === 0 ? 30 : 24,
                      borderRadius: 3,
                      background: '#f4ecd8',
                    }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', fontSize: 18, color: '#a79ed1', marginLeft: 8 }}>
                {'Ofrenda of remembrance'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, color: '#a79ed1' }}>
          <span style={{ display: 'flex', color: '#f2a33c' }}>{'signals, not verdicts'}</span>
          <span style={{ display: 'flex' }}>{'revenant — ghosts in your dependency tree'}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

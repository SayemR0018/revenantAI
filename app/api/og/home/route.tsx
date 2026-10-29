import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(155deg, #161233 0%, #0d0b1e 72%)',
          color: '#f4ecd8',
          fontFamily: 'serif',
          padding: '64px',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: 16 }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                width: 40,
                height: 16,
                background: i % 3 === 0 ? '#f2a33c' : i % 3 === 1 ? '#e05297' : '#b87cff',
                borderRadius: '0 0 14px 14px',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 26, letterSpacing: 6, color: '#f2a33c', textTransform: 'uppercase' }}>
            {'Revenant · Ghost in the Machine'}
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {['#4cc366', '#f2bd49', '#ff8c42', '#b87cff'].map((c, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background: c,
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20 }}>
          <div style={{ display: 'flex', fontSize: 68, fontWeight: 700, lineHeight: 1.08, color: '#f4ecd8' }}>
            {'Which of your dependencies'}
          </div>
          <div style={{ display: 'flex', fontSize: 68, fontWeight: 700, lineHeight: 1.08, color: '#b87cff', marginTop: 4 }}>
            {'are already ghosts?'}
          </div>
          <div style={{ display: 'flex', fontSize: 28, color: '#cfc6ab', marginTop: 28, maxWidth: 960, lineHeight: 1.38 }}>
            {'Predict open-source abandonment with TabPFN & Gemma, hold a dignified ofrenda for departed packages, and resurrect your dependency tree.'}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 22, color: '#9a90c4' }}>
          <span style={{ display: 'flex', color: '#f2a33c' }}>{'signals, not verdicts · open-weight AI'}</span>
          <span style={{ display: 'flex' }}>{'npm · PyPI · CLI · GitHub Action'}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getReport } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getReport(id);
  const s = r?.summary;
  const ghosts = (s?.haunted ?? 0) + (s?.departed ?? 0);
  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630, display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(160deg,#14112b,#0d0b1e)', color: '#f4ecd8',
        fontFamily: 'serif', padding: 64,
      }}>
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 6, color: '#f2a33c' }}>{'REVENANT · HAUNTING REPORT'}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 120, fontWeight: 700, marginTop: 40 }}>
          {ghosts}
          <span style={{ fontSize: 56, color: '#9a90c4', marginLeft: 16 }}>{`ghost${ghosts === 1 ? '' : 's'}`}</span>
        </div>
        <div style={{ display: 'flex', fontSize: 40, color: '#d8cfe8', marginTop: 8 }}>{`among ${s?.total ?? '…'} dependencies`}</div>
        <div style={{ marginTop: 'auto', display: 'flex', gap: 24, fontSize: 26 }}>
          <span style={{ display: 'flex', color: '#b06cf0' }}>{`${s?.departed ?? 0} departed`}</span>
          <span style={{ display: 'flex', color: '#e8890c' }}>{`${s?.haunted ?? 0} haunted`}</span>
          <span style={{ display: 'flex', color: '#e8b33c' }}>{`${s?.fading ?? 0} fading`}</span>
          <span style={{ display: 'flex', color: '#3fae5a' }}>{`${s?.alive ?? 0} alive`}</span>
        </div>
        <div style={{ display: 'flex', fontSize: 20, color: '#6f6599', marginTop: 24 }}>{`signals, not verdicts — ${r?.sourceLabel ?? ''}`}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

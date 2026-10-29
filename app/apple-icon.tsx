import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d0b1e',
          borderRadius: 36,
          border: '4px solid #f2a33c',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 34,
            height: 48,
            borderRadius: '50% 50% 45% 45%',
            background: '#ffb757',
            marginBottom: 8,
          }}
        />
        <div
          style={{
            display: 'flex',
            width: 44,
            height: 68,
            borderRadius: 8,
            background: '#f4ecd8',
          }}
        />
      </div>
    ),
    { ...size },
  );
}

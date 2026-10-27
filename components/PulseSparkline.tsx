export function PulseSparkline({ data, width = 96, height = 28 }: { data?: number[]; width?: number; height?: number }) {
  if (!data || !data.length) {
    return <div className="font-mono-data text-xs" style={{ width, color: 'var(--violet-mute)' }}>no pulse</div>;
  }
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * (width - 2) + 1},${height - 2 - (v / max) * (height - 4)}`).join(' ');
  const flat = max <= 1 && data[data.length - 1] === 0;
  return (
    <svg width={width} height={height} role="img" aria-label="commit pulse, last 26 weeks" className="shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={flat ? '#4a4275' : 'var(--marigold)'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

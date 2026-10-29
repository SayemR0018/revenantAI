export function PulseSparkline({
  data,
  width = 96,
  height = 28,
}: {
  data?: number[];
  width?: number;
  height?: number;
}) {
  if (!data || !data.length) {
    return (
      <div className="font-mono-data text-xs" style={{ color: 'var(--violet-mute)' }}>
        not enough data
      </div>
    );
  }
  const max = Math.max(1, ...data);
  const sum = data.reduce((a, b) => a + b, 0);
  const flat = sum === 0 || (max <= 1 && data[data.length - 1] === 0);
  const pts = data
    .map((v, i) => `${(i / Math.max(1, data.length - 1)) * (width - 2) + 1},${height - 3 - (v / max) * (height - 6)}`)
    .join(' ');

  return (
    <div className="inline-flex items-center gap-2">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={flat ? 'commit pulse flatlined over last 26 weeks' : `commit pulse, ${sum} commits over last 26 weeks`}
        className="shrink-0"
      >
        <polyline
          points={pts}
          fill="none"
          stroke={flat ? '#a79ed1' : 'var(--marigold)'}
          strokeWidth="1.75"
          strokeDasharray={flat ? '3 2' : undefined}
          strokeLinejoin="round"
        />
      </svg>
      {flat && (
        <span
          className="font-mono-data rounded border border-[#35305c] bg-[#1d1936] px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
          style={{ color: 'var(--violet-mute)' }}
        >
          flatlined
        </span>
      )}
    </div>
  );
}

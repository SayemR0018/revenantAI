export default function GraveLoading() {
  return (
    <div className="py-6" role="status" aria-live="polite" aria-label="Loading tombstone">
      <div className="mb-8 flex items-center gap-3">
        <div className="candle" aria-hidden="true" />
        <div>
          <p className="font-display text-lg" style={{ color: 'var(--marigold)' }}>
            Lighting the candles on the ofrenda…
          </p>
          <p className="font-mono-data text-xs" style={{ color: 'var(--violet-mute)' }}>
            Reading registry history, commits, and contributor records
          </p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        <div className="tombstone mx-auto flex h-[300px] w-[260px] animate-pulse flex-col items-center justify-center p-6" />
        <div className="space-y-4 py-4">
          <div className="h-4 w-28 animate-pulse rounded bg-[#241f45]" />
          <div className="h-12 w-64 animate-pulse rounded bg-[#241f45]" />
          <div className="h-16 w-full max-w-xl animate-pulse rounded bg-[#1d1936]" />
        </div>
      </div>

      <div className="card mt-10 h-44 animate-pulse p-6" />
    </div>
  );
}

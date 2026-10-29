export default function RootLoading() {
  return (
    <div className="mx-auto max-w-xl py-20 text-center" role="status" aria-live="polite">
      <div className="mx-auto flex justify-center" aria-hidden="true">
        <div className="candle" />
      </div>
      <p className="font-display mt-6 text-2xl" style={{ color: 'var(--marigold)' }}>
        Lighting the candles…
      </p>
      <p className="font-mono-data mt-2 text-xs" style={{ color: 'var(--violet-mute)' }}>
        Gathering public registry &amp; repository signals
      </p>
    </div>
  );
}

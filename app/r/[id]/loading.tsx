export default function ReportLoading() {
  return (
    <div className="py-6" role="status" aria-live="polite" aria-label="Loading haunting report">
      <div className="mb-6 flex items-center gap-3">
        <div className="candle" aria-hidden="true" />
        <div>
          <p className="font-display text-lg" style={{ color: 'var(--marigold)' }}>
            Summoning the Haunting Report…
          </p>
          <p className="font-mono-data text-xs" style={{ color: 'var(--violet-mute)' }}>
            Inspecting dependency vitals and ghost-risk bands
          </p>
        </div>
      </div>
      <div className="card h-24 animate-pulse p-6" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-20 animate-pulse p-4" />
        ))}
      </div>
    </div>
  );
}

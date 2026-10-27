import { Metadata } from 'next';

export const metadata: Metadata = { title: 'About this tradition' };

export default function AboutPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-4xl">About this tradition</h1>
      <div className="mt-4 space-y-4" style={{ color: 'var(--bone-dim)' }}>
        <p>
          <strong style={{ color: 'var(--bone)' }}>Día de los Muertos</strong> (Day of the Dead), observed
          November 1–2 and rooted in Mexican and Indigenous traditions, is a celebration of remembrance.
          Families build <em>ofrendas</em> — altars with marigolds, candles, photographs, and the favorite
          things of those who have died — not to mourn, but to welcome their memory home.
        </p>
        <p>
          Revenant borrows that spirit with respect. The ofrenda on each tombstone is a memorial to the
          people who wrote the code: contributors rendered as candles, and an honest accounting of what
          the project gave the world. No caricature, no costumes — honoring and remembrance.
        </p>
        <p>
          Open source dies quietly. Maintainers burn out, companies pivot, better tools arrive — and the
          dependents keep installing. We think the honest response is gratitude: say what the project gave
          us, link the ways to support the people still standing, and light a candle instead of filing a
          nasty issue.
        </p>
        <p className="font-mono-data text-sm" style={{ color: 'var(--marigold)' }}>
          signals, not verdicts. always.
        </p>
      </div>
    </div>
  );
}

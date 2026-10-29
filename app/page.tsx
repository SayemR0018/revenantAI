import type { Metadata } from 'next';
import Link from 'next/link';
import { ScanForm } from '@/components/ScanForm';

export const metadata: Metadata = {
  title: 'Revenant — ghosts in your dependency tree',
  description:
    'Which of your dependencies are already ghosts? Revenant predicts which open-source projects are about to die, holds a funeral for the ones that did, and helps you resurrect your code.',
  openGraph: {
    title: 'Revenant — ghosts in your dependency tree',
    description:
      'Predict which open-source projects are about to die, honor departed packages with a dignified ofrenda, and resurrect your code with living successors.',
    type: 'website',
    images: [{ url: '/api/og/home', width: 1200, height: 630, alt: 'Revenant — Ghost in the Machine' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Revenant — ghosts in your dependency tree',
    description: 'Which of your dependencies are already ghosts? Signals, not verdicts.',
    images: ['/api/og/home'],
  },
};

export default function Home() {
  return (
    <div className="pt-10">
      <div className="text-center">
        <p className="font-mono-data text-sm uppercase tracking-[0.3em]" style={{ color: 'var(--marigold)' }}>
          ghost in the machine
        </p>
        <h1 className="font-display mt-4 text-3xl leading-tight sm:text-5xl md:text-7xl">
          Which of your dependencies
          <br />
          are already <em style={{ color: 'var(--departed)' }}>ghosts</em>?
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg" style={{ color: 'var(--bone-dim)' }}>
          Revenant predicts which open-source projects are about to die, holds a funeral for the ones
          that already did, and helps you resurrect your code with a living successor.
        </p>
      </div>

      <div className="card mx-auto mt-12 max-w-3xl p-6">
        <ScanForm />
      </div>

      <div className="mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-3">
        {[
          ['🔮', 'Haunting Report', 'Paste a manifest or repo URL. Every dependency gets a ghost score — alive, fading, haunted, or departed — worst offenders first.'],
          ['🕯️', 'Tombstones & Ofrendas', 'Each dead project gets a dignified memorial: cause of death, last words, and the contributors remembered as candles.'],
          ['⚗️', 'Resurrection', 'Ranked living successors, a migration plan, and — only after your explicit approval — a pull request to bring your code back to life.'],
        ].map(([icon, title, body]) => (
          <div key={title} className="card p-5">
            <div className="text-2xl" aria-hidden>{icon}</div>
            <h2 className="font-display mt-2 text-xl">{title}</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--bone-dim)' }}>{body}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-14 max-w-3xl text-center text-sm" style={{ color: 'var(--violet-mute)' }}>
        <p>
          Built on open-weight models — Gemma autopsies, a TabPFN ghost-risk model, a fine-tuned
          LoRA epitaph writer — because a tool that detects abandonment should not itself depend on
          a service that can be deprecated out from under it.{' '}
          <Link href="/science" className="underline hover:text-[var(--marigold)]">Read the science</Link>.
        </p>
      </div>
    </div>
  );
}

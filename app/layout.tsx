import type { Metadata } from 'next';
import Link from 'next/link';
import { Fraunces, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: { default: 'Revenant — ghosts in your dependency tree', template: '%s · Revenant' },
  description:
    'Which of your dependencies are already ghosts? Revenant predicts which open-source projects are about to die, holds a funeral for the ones that did, and helps you resurrect your code.',
};

const NAV = [
  ['/', 'scan'],
  ['/cementerio', 'cementerio'],
  ['/arena', 'arena'],
  ['/science', 'science'],
  ['/receipts', 'receipts'],
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen">
        <div className="papel" aria-hidden />
        <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="font-display text-2xl tracking-wide" style={{ color: 'var(--marigold)' }}>
            revenant<span style={{ color: 'var(--violet-mute)' }}>.</span>
          </Link>
          <nav className="flex gap-5 text-sm" aria-label="Main">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="capitalize transition-colors hover:text-[var(--marigold)]" style={{ color: 'var(--violet-mute)' }}>
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-5 pb-24">{children}</main>
        <footer className="mx-auto max-w-6xl border-t border-[#2c2752] px-5 py-8 text-sm" style={{ color: 'var(--violet-mute)' }}>
          <p>
            Signals, not verdicts — a ghost score is a probability estimate, never an accusation. Maintainers owe nobody anything.
          </p>
          <p className="mt-2">
            Día de los Muertos note: the ofrenda honors real projects and the people who built them. <a className="underline" href="/about">About this tradition</a>.
          </p>
        </footer>
      </body>
    </html>
  );
}

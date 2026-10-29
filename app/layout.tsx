import type { Metadata } from 'next';
import Link from 'next/link';
import { Fraunces, JetBrains_Mono } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';
import { PapelPicado } from '@/components/PapelPicado';
import './globals.css';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: { default: 'Revenant — ghosts in your dependency tree', template: '%s · Revenant' },
  description:
    'Which of your dependencies are already ghosts? Revenant predicts which open-source projects are about to die, holds a funeral for the ones that did, and helps you resurrect your code.',
  openGraph: {
    title: 'Revenant — ghosts in your dependency tree',
    description:
      'Predict which open-source dependencies are about to die, honor the ones that did with a dignified ofrenda, and resurrect your code with living successors.',
    type: 'website',
    images: ['/api/og/home'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Revenant — ghosts in your dependency tree',
    description:
      'Which of your dependencies are already ghosts? Signals, not verdicts.',
    images: ['/api/og/home'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen overflow-x-clip">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <PapelPicado />
        <SiteHeader />
        <main id="main" className="mx-auto max-w-6xl px-4 pb-24 sm:px-5">
          {children}
        </main>
        <footer className="mx-auto max-w-6xl border-t border-[#2c2752] px-4 py-8 text-sm sm:px-5" style={{ color: 'var(--violet-mute)' }}>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p>
                Signals, not verdicts — a ghost score is a probability estimate, never an accusation. Maintainers owe nobody anything.
              </p>
              <p className="mt-2">
                Día de los Muertos note: the ofrenda honors real projects and the people who built them.{' '}
                <Link className="underline hover:text-[var(--marigold)]" href="/about">
                  About this tradition
                </Link>
                .
              </p>
            </div>
            <div className="font-mono-data flex flex-wrap gap-4 text-xs">
              <a
                href="https://github.com/SayemR0018/revenantAI"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-[var(--marigold)]"
              >
                GitHub (MIT)
              </a>
              <Link href="/receipts" className="underline hover:text-[var(--marigold)]">
                Receipts
              </Link>
              <Link href="/science" className="underline hover:text-[var(--marigold)]">
                Science
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

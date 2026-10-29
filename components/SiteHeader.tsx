'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  ['/', 'scan'],
  ['/cementerio', 'cementerio'],
  ['/arena', 'arena'],
  ['/science', 'science'],
  ['/receipts', 'receipts'],
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenPath(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="mx-auto max-w-6xl px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="font-display inline-flex min-h-[44px] items-center gap-2 text-2xl tracking-wide"
          style={{ color: 'var(--marigold)' }}
        >
          <svg width="20" height="24" viewBox="0 0 20 24" aria-hidden="true" className="shrink-0">
            <path
              d="M10 1C10 1 14 5.2 14 8.2C14 10.4 12.2 12 10 12C7.8 12 6 10.4 6 8.2C6 5.2 10 1 10 1Z"
              fill="var(--candle)"
            />
            <path
              d="M10 4.2C10 4.2 12 6.6 12 8.3C12 9.5 11.1 10.4 10 10.4C8.9 10.4 8 9.5 8 8.3C8 6.6 10 4.2 10 4.2Z"
              fill="#fff7df"
            />
            <rect x="7" y="12.5" width="6" height="10.5" rx="1.5" fill="#e8dcc0" />
            <rect x="5" y="22" width="10" height="1.5" rx="0.75" fill="var(--marigold-deep)" />
          </svg>
          <span>
            revenant<span style={{ color: 'var(--violet-mute)' }}>.</span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map(([href, label]) => {
            const active = href === '/' ? pathname === '/' : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className="inline-flex min-h-[44px] items-center rounded-md px-3 text-sm capitalize transition-colors hover:text-[var(--marigold)]"
                style={{
                  color: active ? 'var(--marigold)' : 'var(--bone-dim)',
                  background: active ? 'rgba(242, 163, 60, 0.1)' : 'transparent',
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile menu disclosure button */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-main-nav"
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setOpenPath(open ? null : pathname)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-md border border-[#35305c] bg-[#14112b] px-3 text-xs font-medium uppercase tracking-wider md:hidden"
          style={{ color: 'var(--bone)' }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            {open ? (
              <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
            ) : (
              <path strokeLinecap="round" d="M3 6h14M3 10h14M3 14h14" />
            )}
          </svg>
          <span>Menu</span>
        </button>
      </div>

      {/* Mobile collapsible navigation */}
      {open && (
        <nav
          id="mobile-main-nav"
          aria-label="Main"
          className="card mt-3 flex flex-col divide-y divide-[#241f45] p-2 md:hidden"
        >
          {NAV.map(([href, label]) => {
            const active = href === '/' ? pathname === '/' : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpenPath(null)}
                className="flex min-h-[44px] items-center justify-between rounded-md px-3 py-2 text-sm capitalize transition-colors hover:text-[var(--marigold)]"
                style={{ color: active ? 'var(--marigold)' : 'var(--bone)' }}
              >
                <span>{label}</span>
                <span aria-hidden="true" style={{ color: 'var(--violet-mute)' }}>→</span>
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}

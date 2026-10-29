'use client';
import { useState, useSyncExternalStore } from 'react';

interface Props {
  eco: string;
  name: string;
  score: number | string;
  bandLabel: string;
  fallbackBaseUrl: string;
}

const emptySubscribe = () => () => {};

export function TombstoneShare({ eco, name, score, bandLabel, fallbackBaseUrl }: Props) {
  const [copiedKind, setCopiedKind] = useState<'md' | 'html' | 'url' | 'page' | null>(null);
  const origin = useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => fallbackBaseUrl.replace(/\/$/, ''),
  );
  const canNativeShare = useSyncExternalStore(
    emptySubscribe,
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    () => false,
  );

  const encName = encodeURIComponent(name);
  const badgePath = `/api/badge/${eco}/${encName}.svg`;
  const badgeUrl = `${origin}${badgePath}`;
  const pageUrl = `${origin}/grave/${eco}/${encName}`;
  const ogUrl = `/api/og/${eco}/${encName}`;

  const mdSnippet = `[![ghost risk](${badgeUrl})](${pageUrl})`;
  const htmlSnippet = `<a href="${pageUrl}"><img src="${badgeUrl}" alt="ghost risk" /></a>`;
  const shareText = `${name} (${eco}): ghost score ${score}/100 (${bandLabel}). Signals, not verdicts.`;

  function copy(kind: 'md' | 'html' | 'url' | 'page', text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKind(kind);
    setTimeout(() => setCopiedKind((prev) => (prev === kind ? null : prev)), 1800);
  }

  async function nativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${name} — Revenant Tombstone`, text: shareText, url: pageUrl });
      } catch {
        /* user cancelled */
      }
    }
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Share the tombstone</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badgePath}
          alt={`ghost risk badge for ${name}`}
          className="h-5"
          loading="lazy"
        />
      </div>

      <p className="mt-2 text-xs" style={{ color: 'var(--violet-mute)' }}>
        Embed the live README badge or share the memorial card:
      </p>

      <pre className="font-mono-data mt-3 overflow-x-auto rounded border border-[#2c2752] bg-[#0d0b1e] p-3 text-xs whitespace-pre-wrap break-all">
        {mdSnippet}
      </pre>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Copy badge snippet">
        <button
          type="button"
          onClick={() => copy('md', mdSnippet)}
          className="min-h-[40px] rounded-md border border-[#35305c] bg-[#1d1936] px-3 py-1.5 text-xs font-medium hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
        >
          {copiedKind === 'md' ? '✓ Copied Markdown' : 'Copy Markdown'}
        </button>
        <button
          type="button"
          onClick={() => copy('html', htmlSnippet)}
          className="min-h-[40px] rounded-md border border-[#35305c] bg-[#1d1936] px-3 py-1.5 text-xs font-medium hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
        >
          {copiedKind === 'html' ? '✓ Copied HTML' : 'Copy HTML'}
        </button>
        <button
          type="button"
          onClick={() => copy('url', badgeUrl)}
          className="min-h-[40px] rounded-md border border-[#35305c] bg-[#1d1936] px-3 py-1.5 text-xs font-medium hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
        >
          {copiedKind === 'url' ? '✓ Copied Badge URL' : 'Copy Badge URL'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#241f45] pt-4">
        <button
          type="button"
          onClick={() => copy('page', pageUrl)}
          className="card min-h-[40px] px-3 py-1.5 text-xs font-medium hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
        >
          {copiedKind === 'page' ? '✓ Link copied' : 'Copy page link'}
        </button>
        <a
          className="card inline-flex min-h-[40px] items-center px-3 py-1.5 text-xs font-medium hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
          target="_blank"
          rel="noreferrer"
          href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`}
        >
          Share on X
        </a>
        {canNativeShare && (
          <button
            type="button"
            onClick={nativeShare}
            className="card min-h-[40px] px-3 py-1.5 text-xs font-medium hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
          >
            Share…
          </button>
        )}
        <a
          className="card inline-flex min-h-[40px] items-center px-3 py-1.5 text-xs font-medium hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
          href={ogUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open OG card (PNG)
        </a>
      </div>
      <div className="sr-only" aria-live="polite">
        {copiedKind ? `Copied ${copiedKind} to clipboard` : ''}
      </div>
    </div>
  );
}

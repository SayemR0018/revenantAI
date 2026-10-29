'use client';
import Link from 'next/link';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl py-16 text-center" role="alert">
      <div className="mx-auto flex justify-center" aria-hidden="true">
        <div className="candle" />
      </div>
      <p className="font-mono-data mt-6 text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--haunted)' }}>
        The candle flickered out
      </p>
      <h1 className="font-display mt-2 text-3xl sm:text-4xl">
        Something interrupted this ritual
      </h1>
      <p className="mt-3 text-sm" style={{ color: 'var(--bone-dim)' }}>
        An unexpected error occurred while loading this page. Public registries or upstream APIs may be momentarily unreachable.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="min-h-[44px] rounded-md px-5 py-2 text-sm font-semibold"
          style={{ background: 'var(--marigold)', color: 'var(--ink)' }}
        >
          Try again
        </button>
        <Link
          href="/"
          className="card inline-flex min-h-[44px] items-center px-5 py-2 text-sm hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}

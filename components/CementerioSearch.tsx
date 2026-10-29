'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function CementerioSearch({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [val, setVal] = useState(defaultValue);

  useEffect(() => {
    if (val === defaultValue) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (val.trim()) params.set('q', val.trim());
      else params.delete('q');
      params.delete('page');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 260);
    return () => clearTimeout(t);
  }, [val, defaultValue, pathname, router, searchParams]);

  return (
    <input
      name="q"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      placeholder="Filter by package name…"
      aria-label="Filter by package name"
      className="font-mono-data min-h-[42px] w-full rounded-md border border-[#35305c] bg-[#0d0b1e] px-3 py-2 text-sm sm:w-60"
    />
  );
}

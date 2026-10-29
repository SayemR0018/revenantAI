'use client';
import { useState } from 'react';
import { ScoredDep } from '@/lib/types';
import { ResurrectDrawer } from './ResurrectDrawer';

export function TombstoneResurrectTrigger({ dep }: { dep: ScoredDep }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[42px] items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
        style={{ background: 'var(--marigold)', color: 'var(--ink)' }}
      >
        <span>Resurrect this dependency →</span>
      </button>
      <ResurrectDrawer dep={open ? dep : null} onClose={() => setOpen(false)} />
    </>
  );
}

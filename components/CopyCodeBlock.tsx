'use client';
import { useState } from 'react';

export function CopyCodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="card flex flex-col justify-between p-5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono-data text-xs uppercase tracking-wider" style={{ color: 'var(--marigold)' }}>
            {label}
          </span>
          <button
            type="button"
            onClick={copy}
            className="font-mono-data min-h-[36px] rounded border border-[#35305c] bg-[#1d1936] px-2.5 py-1 text-xs hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre className="font-mono-data mt-3 overflow-x-auto rounded border border-[#241f45] bg-[#0d0b1e] p-3 text-xs leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

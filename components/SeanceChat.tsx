'use client';
import { useState } from 'react';
import { SeanceMessage } from '@/lib/types';

export function SeanceChat({ eco, name }: { eco: string; name: string }) {
  const [msgs, setMsgs] = useState<SeanceMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<{ provider?: string } | null>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    const history = [...msgs, { role: 'user' as const, text }];
    setMsgs(history);
    setBusy(true);
    try {
      const r = await fetch('/api/seance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eco, name, history: msgs.slice(-8), text }),
      });
      const j = await r.json();
      setMsgs([...history, { role: 'spirit', text: j.text ?? j.error ?? 'the candle flickered out', evidenceIds: j.evidenceIds }]);
      setMeta({ provider: j.provider });
    } catch {
      setMsgs([...history, { role: 'spirit', text: 'The connection to the other side failed.' }]);
    } finally {
      setBusy(false);
    }
  }

  function speak(text: string) {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92;
      u.pitch = 0.85;
      speechSynthesis.speak(u);
    }
  }

  return (
    <section className="card p-6" aria-labelledby="seance">
      <h2 id="seance" className="font-display text-2xl">Hold a seance</h2>
      <p className="mt-1 text-xs" style={{ color: 'var(--violet-mute)' }}>
        The spirit of {name} answers only from its own records — README, releases, issues. It is not a person.
      </p>
      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
        {!msgs.length && (
          <p className="text-sm italic" style={{ color: 'var(--violet-mute)' }}>
            The candles are lit. Ask what it does, how to use it, or how it ended.
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div
              className={`inline-block max-w-[90%] rounded-lg px-3 py-2 text-left text-sm ${
                m.role === 'user' ? 'bg-[#2c2752]' : 'bg-[#1a1738] border border-[#35305c]'
              }`}
            >
              {m.text}
              {m.role === 'spirit' && 'speechSynthesis' in globalThis && (
                <button className="ml-2 text-xs" style={{ color: 'var(--marigold)' }} onClick={() => speak(m.text)} aria-label="read aloud">
                  🔊
                </button>
              )}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm italic" style={{ color: 'var(--violet-mute)' }}>the spirit is listening…</p>}
      </div>
      <form onSubmit={ask} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ask the spirit…"
          maxLength={500}
          className="font-mono-data w-full rounded-md border border-[#35305c] bg-[#0d0b1e] p-2 text-sm"
          aria-label="Your question for the spirit"
        />
        <button type="submit" disabled={busy} className="rounded-md px-4 text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--marigold)', color: 'var(--ink)' }}>
          ask
        </button>
      </form>
      {meta?.provider && (
        <p className="font-mono-data mt-2 text-[10px]" style={{ color: 'var(--violet-mute)' }}>via {meta.provider}</p>
      )}
    </section>
  );
}

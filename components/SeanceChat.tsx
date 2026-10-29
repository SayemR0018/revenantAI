'use client';
import { useEffect, useRef, useState } from 'react';
import { SeanceMessage } from '@/lib/types';

interface SpiritChatMessage extends SeanceMessage {
  grounded?: boolean;
  provider?: string;
}

const SUGGESTED_QUESTIONS = [
  'What did you do?',
  'How do I migrate away?',
  'How did it end?',
];

export function SeanceChat({ eco, name }: { eco: string; name: string }) {
  const [msgs, setMsgs] = useState<SpiritChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [autoVoice, setAutoVoice] = useState(false);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [msgs, busy]);

  function speak(text: string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.94;
      u.pitch = 0.88;
      window.speechSynthesis.speak(u);
    }
  }

  async function sendQuestion(rawText: string) {
    const text = rawText.trim();
    if (!text || busy) return;
    setInput('');
    const history: SpiritChatMessage[] = [...msgs, { role: 'user', text }];
    setMsgs(history);
    setBusy(true);
    try {
      const r = await fetch('/api/seance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eco, name, history: msgs.slice(-8), text }),
      });
      const j = await r.json();
      const replyText = j.text ?? j.error ?? 'The candle flickered out.';
      const nextMsg: SpiritChatMessage = {
        role: 'spirit',
        text: replyText,
        evidenceIds: j.evidenceIds,
        grounded: typeof j.grounded === 'boolean' ? j.grounded : undefined,
        provider: j.provider,
      };
      setMsgs([...history, nextMsg]);
      if (autoVoice) speak(replyText);
    } catch {
      setMsgs([
        ...history,
        { role: 'spirit', text: 'The connection to the other side failed.', grounded: false },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendQuestion(input);
  }

  return (
    <section className="card self-start p-6" aria-labelledby="seance">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="seance" className="font-display text-2xl">
          Hold a seance
        </h2>
        <button
          type="button"
          aria-pressed={autoVoice}
          onClick={() => setAutoVoice((v) => !v)}
          className="font-mono-data inline-flex min-h-[36px] items-center gap-1.5 rounded border border-[#35305c] bg-[#0d0b1e] px-2.5 py-1 text-xs hover:border-[var(--marigold)]"
          style={{ color: autoVoice ? 'var(--marigold)' : 'var(--violet-mute)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M11 5L6 9H2v6h4l5 4V5Z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" strokeLinecap="round" />
          </svg>
          <span>{autoVoice ? 'Voice on (browser TTS)' : 'Voice off'}</span>
        </button>
      </div>
      <p className="mt-1 text-xs" style={{ color: 'var(--violet-mute)' }}>
        The spirit of {name} answers strictly from its own records — README, releases, and issues. It
        never impersonates a maintainer and says “I don&apos;t remember that” when evidence is missing.
      </p>

      {/* Suggested question chips */}
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Suggested questions">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={busy}
            onClick={() => sendQuestion(q)}
            className="font-mono-data min-h-[36px] rounded-md border border-[#35305c] bg-[#0d0b1e] px-2.5 py-1 text-xs hover:border-[var(--marigold)] hover:text-[var(--marigold)] disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Transcript */}
      <div
        ref={logRef}
        className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-lg border border-[#241f45] bg-[#0d0b1e] p-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {!msgs.length && !busy && (
          <p className="text-sm italic" style={{ color: 'var(--violet-mute)' }}>
            The candles are lit. Pick a question above or ask what {name} did, how to migrate away, or how it ended.
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div
              className={`inline-block max-w-[92%] rounded-lg px-3.5 py-2.5 text-left text-sm ${
                m.role === 'user'
                  ? 'bg-[#2c2752]'
                  : 'border border-[#35305c] bg-[#171331]'
              }`}
            >
              <div>{m.text}</div>

              {m.role === 'spirit' && (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[#2c2752] pt-2 text-[11px]">
                  {m.grounded !== undefined && (
                    <span
                      className="font-mono-data rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        color: m.grounded ? 'var(--alive)' : 'var(--violet-mute)',
                        background: '#0d0b1e',
                      }}
                    >
                      {m.grounded ? '✓ Grounded in corpus' : '⚠ Unverified / insufficient records'}
                    </span>
                  )}

                  {m.evidenceIds?.map((evId) => (
                    <a
                      key={evId}
                      href={`#evidence-${evId}`}
                      className="font-mono-data rounded border border-[#35305c] bg-[#0d0b1e] px-1.5 py-0.5 text-[10px] hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
                    >
                      cite:{evId}
                    </a>
                  ))}

                  {m.provider && (
                    <span className="font-mono-data text-[10px]" style={{ color: 'var(--violet-mute)' }}>
                      via {m.provider}
                    </span>
                  )}

                  <button
                    type="button"
                    className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs hover:text-[var(--marigold)]"
                    style={{ color: 'var(--marigold)' }}
                    onClick={() => speak(m.text)}
                    aria-label="Read reply aloud"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M11 5L6 9H2v6h4l5 4V5Z" />
                      <path d="M15.5 8.5a5 5 0 0 1 0 7" strokeLinecap="round" />
                    </svg>
                    <span>Speak</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs italic" style={{ color: 'var(--marigold)' }}>
            <span className="inline-block h-2 w-2 animate-ping rounded-full bg-[var(--marigold)]" aria-hidden="true" />
            <span>The spirit is consulting its records…</span>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the spirit…"
          maxLength={500}
          className="font-mono-data min-h-[44px] w-full rounded-md border border-[#35305c] bg-[#0d0b1e] px-3 py-2 text-sm"
          aria-label="Your question for the spirit"
        />
        <button
          type="submit"
          disabled={busy}
          className="min-h-[44px] rounded-md px-4 text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--marigold)', color: 'var(--ink)' }}
        >
          Ask
        </button>
      </form>
    </section>
  );
}

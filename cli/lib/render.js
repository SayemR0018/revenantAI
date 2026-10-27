const ICONS = { alive: ' ', fading: '~', haunted: '!', departed: 'x' };
const RULE = '─'.repeat(46);

export function progress(s) { console.error(s); }

export function tombstone(r, verbose = false) {
  const i = ICONS[r.band];
  const v = r.vitals ?? {};
  const lines = [
    `  ┌${RULE}┐`,
    `  │  ${String(r.score).padStart(3)}  ${i} ${r.band.padEnd(8)}  ${(r.dep.ecosystem + '/' + r.dep.name).slice(0, 24).padEnd(24)} │`,
  ];
  if (v.daysSinceCommit !== undefined) lines.push(`  │      last commit ${String(v.daysSinceCommit).padStart(5)}d ago`.padEnd(48) + '│');
  if (v.archived) lines.push(`  │      archived ✝`.padEnd(48) + '│');
  if (v.deprecated) lines.push(`  │      deprecated ⚠`.padEnd(48) + '│');
  if (r.offline && r.unknown) lines.push(`  │      not in bundled index`.padEnd(48) + '│');
  if (verbose && r.epitaph) lines.push(`  │      “${r.epitaph.slice(0, 40)}…"`.padEnd(48) + '│');
  lines.push(`  └${RULE}┘`);
  return lines.join('\n');
}

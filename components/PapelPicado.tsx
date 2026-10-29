export function PapelPicado() {
  const flags = [
    'var(--marigold)',
    'var(--papel-magenta)',
    'var(--papel-turquoise)',
    'var(--departed)',
    'var(--marigold)',
    'var(--papel-magenta)',
    'var(--papel-turquoise)',
    'var(--departed)',
    'var(--marigold)',
    'var(--papel-magenta)',
    'var(--papel-turquoise)',
    'var(--departed)',
  ];
  return (
    <div className="papel-banner w-full overflow-hidden select-none" aria-hidden="true">
      <svg
        viewBox="0 0 1200 28"
        preserveAspectRatio="none"
        className="block h-6 w-full sm:h-7"
      >
        <line x1="0" y1="1" x2="1200" y2="1" stroke="#35305c" strokeWidth="2" />
        {flags.map((fill, i) => {
          const x = i * 100;
          return (
            <g key={i} transform={`translate(${x}, 2)`}>
              <path
                d="M4,0 H96 V18 L84,25 L72,18 L60,25 L48,18 L36,25 L24,18 L12,25 L4,18 Z"
                fill={fill}
                fillOpacity="0.88"
              />
              <circle cx="28" cy="9" r="3" fill="var(--ink)" />
              <circle cx="50" cy="7" r="2.5" fill="var(--ink)" />
              <circle cx="50" cy="14" r="2.5" fill="var(--ink)" />
              <circle cx="43" cy="10.5" r="2.5" fill="var(--ink)" />
              <circle cx="57" cy="10.5" r="2.5" fill="var(--ink)" />
              <circle cx="72" cy="9" r="3" fill="var(--ink)" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

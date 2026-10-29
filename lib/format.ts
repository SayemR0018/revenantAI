export function humanizeDays(days?: number, suffix = 'ago'): string {
  if (days === undefined || days === null || !Number.isFinite(days)) {
    return 'not enough data';
  }
  if (days <= 0) return suffix ? 'today' : '0 days';
  if (days === 1) return suffix ? `1 day ${suffix}` : '1 day';
  if (days < 45) return suffix ? `${Math.round(days)} days ${suffix}` : `${Math.round(days)} days`;
  if (days < 365) {
    const months = Math.round((days / 30.44) * 10) / 10;
    const label = months === 1 ? '1 month' : `${months.toFixed(months % 1 === 0 ? 0 : 1)} months`;
    return suffix ? `${label} ${suffix}` : label;
  }
  const years = Math.round((days / 365.25) * 10) / 10;
  const label = years === 1 ? '1 year' : `${years.toFixed(years % 1 === 0 ? 0 : 1)} years`;
  return suffix ? `${label} ${suffix}` : label;
}

const NUMBER_WORDS = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
];

export function numberWord(n: number): string {
  if (n >= 0 && n < NUMBER_WORDS.length) return NUMBER_WORDS[n];
  return String(n);
}

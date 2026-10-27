import { fetchJson } from '@/lib/fetch';

// "Support the maintainers" — GitHub Sponsors / OpenCollective links when present.
export async function SupportLinks({ repoUrl }: { repoUrl?: string }) {
  const links: { label: string; url: string }[] = [];
  if (repoUrl) {
    const m = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (m) {
      const funding = await fetchJson<Record<string, string[]> | null>(
        `https://api.github.com/repos/${m[1]}/${m[2]}/contents/.github/FUNDING.yml`,
        { headers: process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {} },
      ).catch(() => null);
      if (funding) {
        links.push({ label: 'Sponsor on GitHub', url: `https://github.com/sponsors/${m[1]}` });
      }
      links.push({ label: 'Open a kind issue (not a demand)', url: `${repoUrl}/issues` });
    }
  }
  links.push({ label: 'Open Collective', url: 'https://opencollective.com/' });

  return (
    <section className="card p-6" aria-labelledby="support">
      <h2 id="support" className="font-display text-2xl">Support the maintainers</h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--violet-mute)' }}>
        Maintainers owe nobody anything. If this project served you, gratitude is the right gesture.
      </p>
      <ul className="mt-4 space-y-2">
        {links.map((l) => (
          <li key={l.url}>
            <a className="text-sm underline hover:text-[var(--marigold)]" href={l.url} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

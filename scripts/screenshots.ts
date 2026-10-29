// Capture full-page desktop (1440x900) and mobile (390x844) screenshots of all key pages
// into docs/screenshots/ and run axe-core audit.
// Run: npx tsx scripts/screenshots.ts (with server running on BASE_URL or http://localhost:3000)
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { promises as fs } from 'fs';
import path from 'path';

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const OUT_DIR = path.join(process.cwd(), 'docs', 'screenshots');

async function ensureSampleReport(): Promise<string> {
  const sampleManifest = JSON.stringify({
    name: 'legacy-checkout-service',
    dependencies: {
      request: '^2.88.2',
      'left-pad': '^1.3.0',
      'node-sass': '^9.0.0',
      moment: '^2.29.4',
      lodash: '^4.17.21',
      react: '^19.0.0',
    },
  });
  const res = await fetch(`${BASE}/api/scan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ manifest: sampleManifest }),
  });
  const { id } = (await res.json()) as { id: string };
  for (let i = 0; i < 40; i++) {
    const poll = await fetch(`${BASE}/api/scan/${id}`).then((r) => r.json());
    if (poll.status === 'done' || poll.status === 'error') break;
    await new Promise((r) => setTimeout(r, 750));
  }
  return `/r/${id}`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const reportRoute = await ensureSampleReport();

  const targets = [
    { slug: 'home', route: '/' },
    { slug: 'report', route: reportRoute },
    { slug: 'tombstone-departed', route: '/grave/npm/request' },
    { slug: 'tombstone-alive', route: '/grave/npm/react' },
    { slug: 'cementerio', route: '/cementerio' },
    { slug: 'arena', route: '/arena' },
    { slug: 'science', route: '/science' },
    { slug: 'receipts', route: '/receipts' },
  ];

  const browser = await chromium.launch();
  try {
    for (const vp of [
      { label: 'desktop', width: 1440, height: 900 },
      { label: 'mobile', width: 390, height: 844 },
    ]) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: 'reduce',
      });
      const page = await ctx.newPage();

      for (const t of targets) {
        const url = `${BASE}${t.route}`;
        await page.goto(url, { waitUntil: 'networkidle' });
        const dims = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        const file = path.join(OUT_DIR, `${t.slug}-${vp.label}.png`);
        await page.screenshot({ path: file, fullPage: true });

        if (vp.label === 'desktop') {
          const axe = await new AxeBuilder({ page }).analyze();
          const serious = axe.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious',
          );
          console.log(
            `✓ ${t.slug}-${vp.label}.png (${dims.scrollWidth}/${dims.clientWidth}px) | axe violations: ${axe.violations.length} (serious/critical: ${serious.length})`,
          );
        } else {
          console.log(
            `✓ ${t.slug}-${vp.label}.png (scrollWidth=${dims.scrollWidth} <= clientWidth=${dims.clientWidth})`,
          );
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

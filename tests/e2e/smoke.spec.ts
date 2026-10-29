import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('scan → report → tombstone → OG → badge → 404 → 390px overflow → axe', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ghosts');

  // Home page has og:image with an absolute URL
  const homeOgMeta = await page.locator('meta[property="og:image"]').first().getAttribute('content');
  expect(homeOgMeta).toMatch(/^https?:\/\/.+\/api\/og\/home/);
  const homeOgRes = await request.get('/api/og/home');
  expect(homeOgRes.status()).toBe(200);
  expect(homeOgRes.headers()['content-type']).toContain('image/png');

  // Scan a single well-known package
  await page.getByRole('tab', { name: 'one package' }).click();
  await page.getByLabel('Package name').fill('left-pad');
  await page.getByRole('button', { name: /exhume/ }).click();
  await page.waitForURL(/\/r\//);
  const reportUrl = new URL(page.url()).pathname;
  await expect(page.getByRole('heading', { name: 'Haunting Report' })).toBeVisible();

  // Tombstone page renders vital signs, ofrenda, and real badge snippet URL
  await page.goto('/grave/npm/left-pad');
  await expect(page.getByRole('heading', { name: 'Vital signs' })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('heading', { name: 'Ofrenda' })).toBeVisible();

  const snippetText = await page.locator('pre').first().innerText();
  expect(snippetText).not.toContain('revenant.example.com');
  const badgeMatch = snippetText.match(/https?:\/\/[^\s)]+\/api\/badge\/npm\/left-pad\.svg/);
  expect(badgeMatch).not.toBeNull();

  // OG image + badge endpoints respond with images
  const og = await request.get('/api/og/npm/left-pad');
  expect(og.status()).toBe(200);
  expect(og.headers()['content-type']).toContain('image');
  const badge = await request.get('/api/badge/npm/left-pad.svg');
  expect(badge.status()).toBe(200);
  expect(await badge.text()).toContain('ghost risk');

  // Unknown package returns 404
  const unknownRes = await page.goto('/grave/npm/zzzz-nope-xyz-nonexistent-999');
  expect(unknownRes?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: /No package rests under this stone/i })).toBeVisible();

  // Cementerio GET filter & Receipts render
  await page.goto('/cementerio?band=departed');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cementerio');
  await expect(page.getByRole('link', { name: 'request', exact: true }).first()).toBeVisible();

  await page.goto('/receipts');
  await expect(page.getByText('ecosyste.ms')).toBeVisible();

  // Axe accessibility check on key desktop routes (0 critical / serious violations)
  for (const route of ['/', reportUrl, '/grave/npm/request', '/cementerio', '/arena', '/science', '/receipts']) {
    await page.goto(route);
    const axe = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = axe.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(seriousOrCritical, `Axe serious/critical on ${route}: ${JSON.stringify(seriousOrCritical.map((v) => v.id))}`).toEqual([]);
  }

  // Mobile 390px viewport: scrollWidth <= clientWidth on all required routes + keyboard menu disclosure
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', reportUrl, '/grave/npm/request', '/cementerio', '/arena', '/science', '/receipts']) {
    await page.goto(route);
    const dims = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      dims.scrollWidth,
      `Horizontal overflow on ${route}: scrollWidth=${dims.scrollWidth} > clientWidth=${dims.clientWidth}`,
    ).toBeLessThanOrEqual(dims.clientWidth);
  }

  // Keyboard / disclosure check on mobile menu
  await page.goto('/');
  const menuBtn = page.getByRole('button', { name: /navigation menu/i });
  await menuBtn.click();
  await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
});

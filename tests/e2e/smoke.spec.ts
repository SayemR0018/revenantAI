import { test, expect } from '@playwright/test';

test('scan → report → tombstone → OG → badge', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ghosts');

  // scan a single well-known package
  await page.getByRole('tab', { name: 'one package' }).click();
  await page.getByLabel('Package name').fill('left-pad');
  await page.getByRole('button', { name: /exhume/ }).click();
  await page.waitForURL(/\/r\//);
  await expect(page.getByRole('heading', { name: 'Haunting Report' })).toBeVisible();

  // tombstone page renders vital signs
  await page.goto('/grave/npm/left-pad');
  await expect(page.getByRole('heading', { name: 'Vital signs' })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('heading', { name: 'Ofrenda' })).toBeVisible();

  // OG image + badge endpoints respond with images
  const og = await request.get('/api/og/npm/left-pad');
  expect(og.headers()['content-type']).toContain('image');
  const badge = await request.get('/api/badge/npm/left-pad.svg');
  expect((await badge.text())).toContain('ghost risk');

  // cementerio + receipts render
  await page.goto('/cementerio');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cementerio');
  await page.goto('/receipts');
  await expect(page.getByText('ecosyste.ms')).toBeVisible();
});

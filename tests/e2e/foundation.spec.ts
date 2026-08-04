import { expect, test } from '@playwright/test';

test('landing page exposes the primary customer journey', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Every warranty');
  await expect(page.getByRole('link', { name: /create free account/i }).first()).toBeVisible();
});

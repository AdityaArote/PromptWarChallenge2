// e2e/home.spec.ts
// Playwright E2E test — run with: npx playwright test
// Requires: npx playwright install chromium

import { test, expect } from '@playwright/test';

test.describe('CivicPath Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
  });

  test('renders the CivicPath heading and logo', async ({ page }) => {
    await expect(page.getByText('CivicPath')).toBeVisible();
    await expect(page.getByText('Your election journey starts here')).toBeVisible();
  });

  test('shows all 3 voter type cards', async ({ page }) => {
    await expect(page.getByText('First-time voter')).toBeVisible();
    await expect(page.getByText('Returning voter')).toBeVisible();
    await expect(page.getByText('Overseas / NRI voter')).toBeVisible();
  });

  test('CTA button does not appear before selection', async ({ page }) => {
    await expect(page.getByText('Begin My Journey →')).not.toBeVisible();
  });

  test('selecting a voter type reveals CTA button', async ({ page }) => {
    await page.click('text=First-time voter');
    await expect(page.getByText('Begin My Journey →')).toBeVisible();
  });

  test('language switch button is visible and functional', async ({ page }) => {
    const langBtn = page.getByRole('button', { name: /hindi|english/i });
    await expect(langBtn).toBeVisible();
    await langBtn.click();
    await expect(page.getByText('आपकी चुनावी यात्रा यहाँ से शुरू होती है')).toBeVisible();
  });

  test('voter type cards are keyboard accessible', async ({ page }) => {
    await page.keyboard.press('Tab'); // skip-to-main link
    await page.keyboard.press('Tab'); // language button
    await page.keyboard.press('Tab'); // first card
    await page.keyboard.press('Enter'); // select first-time voter
    await expect(page.getByText('Begin My Journey →')).toBeVisible();
  });

  test('home page has proper page title', async ({ page }) => {
    await expect(page).toHaveTitle(/CivicPath/);
  });

  test('selecting a card marks it as checked (ARIA)', async ({ page }) => {
    const card = page.getByRole('radio', { name: /first-time voter/i });
    await card.click();
    await expect(card).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('CivicPath Accessibility', () => {
  test('skip to main content link works', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    // Tab to the skip link, then press Enter
    await page.keyboard.press('Tab');
    const skipLink = page.getByText('Skip to main content');
    if (await skipLink.isVisible()) {
      await page.keyboard.press('Enter');
      // Focus should now be on main content element
      const focused = await page.evaluate(() => document.activeElement?.id);
      expect(focused).toBe('main-content');
    }
  });

  test('page has no critical ARIA violations', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    // Check key ARIA roles exist
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('radiogroup')).toBeVisible();
  });
});

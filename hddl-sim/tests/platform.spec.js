import { test, expect } from '@playwright/test';

test.describe('HDDL Platform', () => {
  test('homepage loads and displays cards', async ({ page }) => {
    await page.goto('/');
    
    // Check main title
    await expect(page.locator('.page-container h1')).toContainText('Decision Envelopes');
    
    // Envelope cards should be present
    await expect(page.locator('[data-envelope="ENV-001"]')).toBeVisible();
    await expect(page.locator('[data-envelope="ENV-002"]')).toBeVisible();
    await expect(page.locator('[data-envelope="ENV-003"]')).toBeVisible();
  });

  test('steward fleets renders', async ({ page }) => {
    await page.goto('/steward-fleets');
    await expect(page.locator('.page-container h1')).toContainText('Steward Agent Fleets');
    await expect(page.getByTestId('fleets-page')).toBeVisible();
    await expect(page.getByTestId('fleet-card').first()).toBeVisible();
  });

  test('decision telemetry renders charts', async ({ page }) => {
    await page.goto('/decision-telemetry');
    await expect(page.locator('.page-container h1')).toContainText('Signals & Outcomes');
    
    // Check all charts are present
    await expect(page.locator('#drift-chart svg')).toBeVisible();
    await expect(page.locator('#volume-chart svg')).toBeVisible();
    await expect(page.locator('#breach-chart svg')).toBeVisible();
    await expect(page.locator('#activity-chart svg')).toBeVisible();
  });

  test('DSG event simulation page loads', async ({ page }) => {
    await page.goto('/dsg-event');
    await expect(page.locator('.page-container h1')).toContainText('DSG Review');
    await expect(page.locator('#dsg-record-kv')).toBeVisible();
    await expect(page.getByTestId('dsg-artifacts')).toBeVisible();
  });
});

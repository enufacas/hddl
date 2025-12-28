import { test, expect } from '@playwright/test';

test.describe('HDDL Platform', () => {
  test('homepage loads and displays cards', async ({ page }) => {
    await page.goto('/');

    // Fail fast if the map throws during initialization.
    await expect(page.locator('#hddl-map-container')).not.toContainText('Error loading map');
    
    // Check main title
    await expect(page.locator('.page-container h1')).toContainText('Decision Envelopes');
    
    // Envelope cards should be present
    await expect(page.locator('[data-envelope="ENV-001"]')).toBeVisible();
    await expect(page.locator('[data-envelope="ENV-002"]').first()).toBeVisible();
  });

  test('steward fleets renders', async ({ page }) => {
    await page.goto('/steward-fleets');
    await expect(page.locator('.page-container h1')).toContainText('Steward Agent Fleets');
    await expect(page.getByTestId('fleets-page')).toBeVisible();
    await expect(page.getByTestId('fleet-card').first()).toBeVisible();
  });

  test('decision telemetry renders page', async ({ page }) => {
    await page.goto('/decision-telemetry');
    await expect(page.locator('.page-container h1')).toContainText('Decision Telemetry Stream');
    
    // Check query interface is present
    await expect(page.locator('#query-input')).toBeVisible();
    await expect(page.locator('#query-btn')).toBeVisible();
    await expect(page.locator('#stats-bar')).toBeVisible();
    await expect(page.locator('#event-stream')).toBeVisible();

    // Check query chips are visible
    await expect(page.locator('.query-chip').first()).toBeVisible();
    
    // Test clicking a query chip
    await page.locator('.query-chip').first().click();
    await page.waitForTimeout(300);
    
    // Input should have been updated with the chip's query
    const inputValue = await page.locator('#query-input').inputValue();
    expect(inputValue.length).toBeGreaterThan(0);
  });

  test('DSG event simulation page loads', async ({ page }) => {
    await page.goto('/dsg-event');
    await expect(page.locator('.page-container h1')).toContainText('DSG Review');
    await expect(page.locator('#dsg-record-kv')).toBeVisible();
    await expect(page.getByTestId('dsg-artifacts')).toBeVisible();
  });
});

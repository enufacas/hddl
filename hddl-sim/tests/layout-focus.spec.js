import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('Layout Focus Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Force a wide viewport to ensure LayoutOrchestrator would normally show the auxiliary panel.
    await page.setViewportSize({ width: 1600, height: 900 });
    // Clear local storage to simulate fresh/incognito session
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should default to focus mode (auxiliary panel hidden)', async ({ page }) => {
    // Check if body has aux-hidden class
    const body = page.locator('body');
    await expect(body).toHaveClass(/aux-hidden/);

    // Check if auxiliary bar has 0 width (via CSS variable on workbench)
    const workbench = page.locator('.workbench');
    const auxWidthVar = await workbench.evaluate((el) => {
      return getComputedStyle(el).getPropertyValue('--auxiliarybar-width').trim();
    });
    
    expect(auxWidthVar).toBe('0px');

    // Check if the element is actually not visible or has 0 width
    const auxBar = page.locator('.part.auxiliarybar');
    const box = await auxBar.boundingBox();
    // If hidden, box might be null or width 0
    if (box) {
      expect(box.width).toBeLessThan(5); // Allow small margin of error
    }

    // Capture evidence
    const evidenceDir = 'test-results/evidence';
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    await page.screenshot({ path: path.join(evidenceDir, 'focus-default.png'), fullPage: true });
  });

  test('should hide panel when switching to focus mode', async ({ page }) => {
    // First switch to Default (which shows panels)
    const layoutButton = page.locator('.layout-selector-button');
    await layoutButton.click();
    await page.locator('.layout-preset-item[data-preset-id="default"]').click();
    
    // Verify aux bar is visible
    await expect(page.locator('body')).not.toHaveClass(/aux-hidden/);
    
    // Switch back to Focus
    await layoutButton.click();
    await page.locator('.layout-preset-item[data-preset-id="focus"]').click();
    
    // Verify aux bar is hidden
    await expect(page.locator('body')).toHaveClass(/aux-hidden/);
    
    const workbench = page.locator('.workbench');
    const auxWidthVar = await workbench.evaluate((el) => {
      return getComputedStyle(el).getPropertyValue('--auxiliarybar-width').trim();
    });
    expect(auxWidthVar).toBe('0px');

    // Capture evidence
    const evidenceDir = 'test-results/evidence';
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    await page.screenshot({ path: path.join(evidenceDir, 'focus-switch.png'), fullPage: true });
  });
});

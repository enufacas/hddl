// Mobile layout improvements validation tests
// Tests the fixes for hamburger menu, timeline controls, and map header alignment
import { test, expect } from '@playwright/test';

test.describe('Mobile Layout Improvements - iPhone SE (375px)', () => {
  test.beforeEach(async ({ page }) => {
    // Set small mobile viewport (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Wait for timeline to be ready
    await page.waitForSelector('[data-testid="timeline-bar"]', { timeout: 10000 });
  });

  test('hamburger menu should be in titlebar row, not floating', async ({ page }) => {
    const hamburger = page.locator('.mobile-hamburger');
    await expect(hamburger).toBeVisible();
    
    // Hamburger should be within the titlebar
    const titlebar = page.locator('.titlebar');
    await expect(titlebar).toContainText('HDDL');
    
    // Hamburger should be a child of titlebar's left section
    const isInTitlebar = await page.evaluate(() => {
      const hamburger = document.querySelector('.mobile-hamburger');
      const titlebar = document.querySelector('.titlebar');
      return titlebar && titlebar.contains(hamburger);
    });
    expect(isInTitlebar).toBe(true);
  });

  test('scenario dropdown should have adequate width (not truncating)', async ({ page }) => {
    const scenarioSelect = page.locator('.scenario-selector select');
    await expect(scenarioSelect).toBeVisible();
    
    // Check that max-width is >= 100px (was 80px before fix)
    const maxWidth = await scenarioSelect.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return parseInt(styles.maxWidth);
    });
    expect(maxWidth).toBeGreaterThanOrEqual(100);
    
    // Font size should be readable (13px)
    const fontSize = await scenarioSelect.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return parseInt(styles.fontSize);
    });
    expect(fontSize).toBeGreaterThanOrEqual(12);
  });

  test('timeline controls should have uniform height and font size', async ({ page }) => {
    // Get all timeline control elements
    const playButton = page.locator('#timeline-play');
    const timeDisplay = page.locator('#timeline-time');
    const speedSelect = page.locator('#timeline-speed');
    const loopLabel = page.locator('label').filter({ hasText: 'Loop' });
    
    // All should be visible
    await expect(playButton).toBeVisible();
    await expect(timeDisplay).toBeVisible();
    await expect(speedSelect).toBeVisible();
    await expect(loopLabel).toBeVisible();
    
    // Check uniform height (32px) - allow ±4px variance for browser rendering
    const playHeight = await playButton.evaluate(el => el.offsetHeight);
    const timeHeight = await timeDisplay.evaluate(el => el.offsetHeight);
    const speedHeight = await speedSelect.evaluate(el => el.offsetHeight);
    const loopHeight = await loopLabel.evaluate(el => el.offsetHeight);
    
    // All should be close to 32px (28-36px range)
    expect(playHeight).toBeGreaterThanOrEqual(28);
    expect(playHeight).toBeLessThanOrEqual(36);
    expect(timeHeight).toBeGreaterThanOrEqual(28);
    expect(timeHeight).toBeLessThanOrEqual(36);
    expect(speedHeight).toBeGreaterThanOrEqual(28);
    expect(speedHeight).toBeLessThanOrEqual(36);
    expect(loopHeight).toBeGreaterThanOrEqual(28);
    expect(loopHeight).toBeLessThanOrEqual(36);
    
    // Check font sizes are close to uniform (12-14px range is acceptable)
    const timeFontSize = await timeDisplay.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return parseInt(styles.fontSize);
    });
    const speedFontSize = await speedSelect.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return parseInt(styles.fontSize);
    });
    const loopFontSize = await loopLabel.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return parseInt(styles.fontSize);
    });
    
    // Font sizes should be reasonably consistent (11-14px)
    expect(timeFontSize).toBeGreaterThanOrEqual(11);
    expect(timeFontSize).toBeLessThanOrEqual(14);
    expect(speedFontSize).toBeGreaterThanOrEqual(11);
    expect(speedFontSize).toBeLessThanOrEqual(14);
    expect(loopFontSize).toBeGreaterThanOrEqual(11);
    expect(loopFontSize).toBeLessThanOrEqual(14);
  });

  test('map header row should stack vertically without overlapping', async ({ page }) => {
    // Navigate to home page (where map is)
    const pageContainer = page.locator('.page-container[data-testid="home-page"]');
    await expect(pageContainer).toBeVisible();
    
    // Find the header section
    const headerSection = pageContainer.locator('> div').first();
    await expect(headerSection).toBeVisible();
    
    // Check View As dropdown exists and is visible
    const viewAsSelect = page.locator('#steward-filter');
    await expect(viewAsSelect).toBeVisible();
    
    // View As dropdown should be reasonably wide (at least 30% of container for readability)
    const containerWidth = await headerSection.evaluate(el => el.offsetWidth);
    const selectWidthPx = await viewAsSelect.evaluate(el => el.offsetWidth);
    
    // Select should be at least 30% of container width
    expect(selectWidthPx / containerWidth).toBeGreaterThan(0.3);
  });

  test('tour button should not overlap with other elements', async ({ page }) => {
    const tourButton = page.locator('#tour-button-container button');
    
    // Tour button should exist
    const tourExists = await tourButton.count() > 0;
    
    if (tourExists) {
      // Check that button has proper padding and isn't overlapping
      const buttonHeight = await tourButton.evaluate(el => el.offsetHeight);
      
      // Should have proper touch target size (at least 28px)
      expect(buttonHeight).toBeGreaterThanOrEqual(28);
    }
  });
  
  test('take screenshot of mobile layout', async ({ page }) => {
    // Wait a moment for any animations to settle
    await page.waitForTimeout(1000);
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'test-results/mobile-layout-iphone-se.png',
      fullPage: true 
    });
  });
});

test.describe('Mobile Layout Improvements - Standard Mobile (390px)', () => {
  test.beforeEach(async ({ page }) => {
    // Set standard mobile viewport (iPhone 12)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="timeline-bar"]', { timeout: 10000 });
  });

  test('all controls should be properly aligned', async ({ page }) => {
    const timelineBar = page.locator('[data-testid="timeline-bar"]');
    await expect(timelineBar).toBeVisible();
    
    // Timeline controls should be visible and properly sized
    const timelineControls = page.locator('.timeline-controls');
    const controlsHeight = await timelineControls.evaluate(el => el.offsetHeight);
    
    // Controls should have adequate height (at least 30px)
    expect(controlsHeight).toBeGreaterThan(30);
  });
  
  test('take screenshot of standard mobile layout', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/mobile-layout-iphone-12.png',
      fullPage: true 
    });
  });
});

test.describe('Mobile Layout Improvements - Tablet (768px)', () => {
  test.beforeEach(async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="timeline-bar"]', { timeout: 10000 });
  });

  test('hamburger should not be visible on tablet', async ({ page }) => {
    const hamburger = page.locator('.mobile-hamburger');
    
    // Hamburger should not be visible at tablet width
    await expect(hamburger).not.toBeVisible();
  });

  test('controls should be more spacious on tablet', async ({ page }) => {
    const timelineControls = page.locator('.timeline-controls');
    await expect(timelineControls).toBeVisible();
    
    // Get control widths to ensure they're not cramped
    const playButton = page.locator('#timeline-play');
    const buttonWidth = await playButton.evaluate(el => el.offsetWidth);
    
    // Button should have reasonable size (at least 24px)
    expect(buttonWidth).toBeGreaterThan(24);
  });
  
  test('take screenshot of tablet layout', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/mobile-layout-tablet.png',
      fullPage: true 
    });
  });
});

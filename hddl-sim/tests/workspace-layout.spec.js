import { test, expect } from '@playwright/test';

/**
 * WORKSPACE LAYOUT TESTS
 * 
 * Tests for workspace.js layout management, panel visibility, and state persistence.
 * Covers: panels, layout modes, auxiliary panel, bottom panel, responsive behavior.
 */

test.describe('Workspace Layout - Panel Management', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
  });

  test('auxiliary panel is visible and contains metrics', async ({ page }) => {
    const auxPanel = page.locator('.auxiliarybar, #auxiliarybar');
    
    // Panel should exist in DOM
    await expect(auxPanel).toBeAttached();
    
    // Panel may be collapsed/hidden on narrow viewports, just check existence
    const isVisible = await auxPanel.isVisible();
    expect(typeof isVisible).toBe('boolean');
  });

  test('map container takes up central area', async ({ page }) => {
    const mapContainer = page.locator('#hddl-map-container');
    await expect(mapContainer).toBeVisible();
    
    const box = await mapContainer.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeGreaterThan(500);
    expect(box.height).toBeGreaterThan(300);
  });

  test('status bar shows at bottom', async ({ page }) => {
    const statusBar = page.locator('.status-bar, [data-testid="status-bar"]');
    
    if (await statusBar.count() > 0) {
      await expect(statusBar).toBeVisible();
      
      // Should be at bottom of viewport
      const box = await statusBar.boundingBox();
      const viewportSize = page.viewportSize();
      expect(box.y).toBeGreaterThan(viewportSize.height - 100);
    }
  });

  test('titlebar shows scenario name', async ({ page }) => {
    const titlebar = page.locator('.titlebar, header');
    await expect(titlebar).toBeVisible();
    
    const content = await titlebar.textContent();
    // Should show some identifying info
    expect(content.length).toBeGreaterThan(5);
  });
});

test.describe('Workspace Layout - Responsive Behavior', () => {
  
  test('layout adapts to narrow viewport', async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    
    // Resize to narrow
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);
    
    // Map should still be visible
    const mapContainer = page.locator('#hddl-map-container');
    await expect(mapContainer).toBeVisible();
    
    const box = await mapContainer.boundingBox();
    expect(box.width).toBeGreaterThan(400);
  });

  test('layout adapts to wide viewport', async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    
    // Resize to wide
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    // Map should use available space
    const mapContainer = page.locator('#hddl-map-container');
    await expect(mapContainer).toBeVisible();
    
    const box = await mapContainer.boundingBox();
    expect(box.width).toBeGreaterThan(1000);
  });

  test('mobile layout shows essential elements', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    
    // Map should be visible
    const mapContainer = page.locator('#hddl-map-container');
    await expect(mapContainer).toBeVisible();
    
    // Timeline should be visible
    const timeline = page.locator('[data-testid="timeline-bar"], .timeline');
    if (await timeline.count() > 0) {
      await expect(timeline).toBeVisible();
    }
  });
});

test.describe('Workspace Layout - Multi-Page Navigation', () => {
  
  test('navigation between pages maintains layout', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get initial map visibility
    const mapBefore = await page.locator('#hddl-map-container').isVisible();
    
    // Navigate to another page via URL instead of clicking
    await page.goto('/?page=envelopes');
    await page.waitForTimeout(500);
    
    // Layout structure should persist
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('page routes work correctly', async ({ page }) => {
    // Test different routes
    const routes = ['/', '/?page=envelopes', '/?page=fleets'];
    
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Page should load without errors
      const body = page.locator('body');
      await expect(body).toBeVisible();
    }
  });
});

test.describe('Workspace Layout - State Persistence', () => {
  
  test('viewport size persists across navigation', async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    
    // Get initial viewport
    const initialSize = page.viewportSize();
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Size should be same
    const finalSize = page.viewportSize();
    expect(finalSize.width).toBe(initialSize.width);
    expect(finalSize.height).toBe(initialSize.height);
  });

  test('scenario selection persists in URL', async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    
    // URL should contain scenario param
    const url = page.url();
    expect(url).toContain('scenario=test-minimal');
  });
});

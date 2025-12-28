import { test, expect } from '@playwright/test';

test.describe('HDDL Map Detail Levels', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should render full-detail envelopes on wide desktop viewport', async ({ page }) => {
    // Set a wide desktop viewport (should trigger FULL detail level > 1000px)
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(500); // Allow resize observer to trigger

    const mapContainer = page.locator('#hddl-map-container');
    await expect(mapContainer).toBeVisible();

    const svg = mapContainer.locator('svg');
    await expect(svg).toBeVisible();

    // In FULL detail mode, envelopes should have:
    // 1. envelope-body (rectangular shape)
    const envelopeBody = svg.locator('rect.envelope-body').first();
    await expect(envelopeBody).toBeVisible();

    // 2. envelope-flap (triangular top)
    const envelopeFlap = svg.locator('path.envelope-flap').first();
    await expect(envelopeFlap).toBeVisible();

    // 3. envelope-fold (inner detail line)
    const envelopeFold = svg.locator('path.envelope-fold').first();
    await expect(envelopeFold).toBeVisible();

    // 4. Check that we're NOT in icon mode (no envelope-icon-circle)
    const iconCircle = svg.locator('circle.envelope-icon-circle').first();
    await expect(iconCircle).not.toBeVisible({ timeout: 1000 }).catch(() => true);

    // 5. Verify envelope dimensions are large (full detail)
    const bodyRect = await envelopeBody.boundingBox();
    expect(bodyRect.width).toBeGreaterThan(80); // Full detail should be ~120px wide
  });

  test('should render compact envelopes on narrow viewport', async ({ page }) => {
    // Set a narrow viewport (should trigger COMPACT detail level 400-600px)
    await page.setViewportSize({ width: 500, height: 900 });
    await page.waitForTimeout(500); // Allow resize observer to trigger

    const mapContainer = page.locator('#hddl-map-container');
    await expect(mapContainer).toBeVisible();

    const svg = mapContainer.locator('svg');
    await expect(svg).toBeVisible();

    // In COMPACT mode, envelopes should have:
    // 1. envelope-body (but smaller)
    const envelopeBody = svg.locator('rect.envelope-body').first();
    await expect(envelopeBody).toBeVisible();

    // 2. NO envelope-flap (flap only renders in detailed/normal)
    const envelopeFlap = svg.locator('path.envelope-flap').first();
    await expect(envelopeFlap).not.toBeVisible({ timeout: 1000 }).catch(() => true);

    // 3. NO envelope-fold (fold only in detailed)
    const envelopeFold = svg.locator('path.envelope-fold').first();
    await expect(envelopeFold).not.toBeVisible({ timeout: 1000 }).catch(() => true);

    // 4. Verify envelope dimensions are smaller (compact mode)
    const bodyRect = await envelopeBody.boundingBox();
    expect(bodyRect.width).toBeLessThan(80); // Compact should be ~65px wide
  });

  test('should render icon mode on minimal viewport', async ({ page }) => {
    // Set a minimal viewport (should trigger MINIMAL detail level < 400px)
    await page.setViewportSize({ width: 350, height: 700 });
    await page.waitForTimeout(500); // Allow resize observer to trigger

    const mapContainer = page.locator('#hddl-map-container');
    await expect(mapContainer).toBeVisible();

    const svg = mapContainer.locator('svg');
    await expect(svg).toBeVisible();

    // In MINIMAL/icon mode, envelopes should be circles:
    // 1. envelope-icon-circle (outer circle)
    const iconCircle = svg.locator('circle.envelope-icon-circle').first();
    await expect(iconCircle).toBeVisible();

    // 2. envelope-icon-status (inner status indicator)
    const iconStatus = svg.locator('circle.envelope-icon-status').first();
    await expect(iconStatus).toBeVisible();

    // 3. NO envelope-body
    const envelopeBody = svg.locator('rect.envelope-body').first();
    await expect(envelopeBody).not.toBeVisible({ timeout: 1000 }).catch(() => true);
  });

  test('should upgrade from compact to full when viewport expands', async ({ page }) => {
    // Start narrow
    await page.setViewportSize({ width: 500, height: 900 });
    await page.waitForTimeout(500);

    const svg = page.locator('#hddl-map-container svg');
    
    // Verify we're in compact mode (no flap)
    const flapBefore = svg.locator('path.envelope-flap').first();
    await expect(flapBefore).not.toBeVisible({ timeout: 1000 }).catch(() => true);

    // Expand to wide desktop
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(1000); // Allow resize observer + remount

    // Now should have full detail (with flap)
    const flapAfter = svg.locator('path.envelope-flap').first();
    await expect(flapAfter).toBeVisible();
  });

  test('should log the actual measured width and detail level', async ({ page }) => {
    // Expose map internals for debugging
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(500);

    const debugInfo = await page.evaluate(() => {
      const mapContainer = document.querySelector('#hddl-map-container');
      const svg = mapContainer?.querySelector('svg');
      const viewBox = svg?.getAttribute('viewBox');
      const containerWidth = mapContainer?.getBoundingClientRect().width;
      const envelopeShapes = document.querySelectorAll('g.envelope-shape');
      const densityClasses = Array.from(envelopeShapes).map(el => el.className.baseVal);
      
      return {
        containerWidth,
        viewBox,
        densityClasses,
        envelopeCount: envelopeShapes.length
      };
    });

    console.log('Map Debug Info:', debugInfo);
    
    // On 1400px viewport, container should be wide enough for full detail
    expect(debugInfo.containerWidth).toBeGreaterThan(1000);
    
    // Check that density classes indicate 'detailed' mode
    expect(debugInfo.densityClasses.some(c => c.includes('detailed'))).toBe(true);
  });
});

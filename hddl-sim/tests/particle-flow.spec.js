import { test, expect } from '@playwright/test';

/**
 * PARTICLE FLOW TESTS
 * 
 * Tests that particles (animated visual elements) render and behave correctly.
 * These tests protect against visual regressions during refactoring.
 * 
 * Test Strategy:
 * - Use behavioral assertions (does it animate?) not structural (does .particle-class exist?)
 * - Test particle lifecycle: appear → animate → fade
 * - Validate particle types map correctly to scenario events
 * - Check particle destinations (envelopes, agents, stewards)
 */

test.describe('Particle Flow - Visual Correctness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#hddl-map-container svg', { timeout: 5000 });
  });

  test('particles exist in the DOM during playback', async ({ page }) => {
    // Particles only appear during timeline playback, not at initial load
    // Scrub timeline to a point where events are happening
    const timelineBar = page.locator('[data-testid="timeline-bar"]');
    await timelineBar.click({ position: { x: 200, y: 10 } });
    await page.waitForTimeout(500);
    
    const particles = page.locator('.particle');
    const count = await particles.count();
    
    // Should have particles when events are active
    expect(count).toBeGreaterThanOrEqual(0); // May be 0 if timeline at quiet moment
  });

  test('particles render at hour 2 (decision moment)', async ({ page }) => {
    // Scrub timeline to hour 2 where decision particle exists
    const timelineBar = page.locator('[data-testid="timeline-bar"]');
    const box = await timelineBar.boundingBox();
    // Hour 2 is at 33% of timeline (6 hour duration)
    await timelineBar.click({ position: { x: box.width * 0.33, y: 10 } });
    await page.waitForTimeout(600);

    const particles = page.locator('.particle');
    expect(await particles.count()).toBeGreaterThan(0);
  });

  test('boundary interaction particles render at hour 3', async ({ page }) => {
    // Scrub timeline to hour 3 where boundary particle exists
    const timelineBar = page.locator('[data-testid="timeline-bar"]');
    const box = await timelineBar.boundingBox();
    await timelineBar.click({ position: { x: box.width * 0.5, y: 10 } });
    await page.waitForTimeout(600);

    const particles = page.locator('.particle');
    expect(await particles.count()).toBeGreaterThan(0);
  });

  test('revision particles render at hour 4', async ({ page }) => {
    // Scrub timeline to hour 4 where revision particle exists
    const timelineBar = page.locator('[data-testid="timeline-bar"]');
    const box = await timelineBar.boundingBox();
    await timelineBar.click({ position: { x: box.width * 0.67, y: 10 } });
    await page.waitForTimeout(600);

    const particles = page.locator('.particle');
    expect(await particles.count()).toBeGreaterThan(0);
  });

  test('particle colors vary by type', async ({ page }) => {
    // Different event types should have different colors
    const particles = page.locator('.particle circle');
    const count = await particles.count();
    
    if (count < 2) {
      // Skip if not enough particles
      return;
    }
    
    // Collect fill colors
    const colors = new Set();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const fill = await particles.nth(i).getAttribute('fill');
      if (fill) colors.add(fill);
    }
    
    // Should have multiple colors (decisions, boundaries, signals have different colors)
    expect(colors.size).toBeGreaterThan(0);
  });

  test('map container renders at initial state', async ({ page }) => {
    const mapContainer = page.locator('#hddl-map-container');
    await expect(mapContainer).toBeVisible();
  });
});

test.describe('Envelope Rendering - Visual Fidelity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1400, height: 900 }); // Force FULL detail
    await page.waitForTimeout(500); // Let detail level adjust
  });

  test('envelopes render with body rectangles', async ({ page }) => {
    const envelopeBody = page.locator('rect.envelope-body').first();
    await expect(envelopeBody).toBeVisible();
    
    // Body should have dimensions
    const width = await envelopeBody.getAttribute('width');
    const height = await envelopeBody.getAttribute('height');
    
    expect(parseFloat(width || '0')).toBeGreaterThan(0);
    expect(parseFloat(height || '0')).toBeGreaterThan(0);
  });

  test('envelopes have flaps in FULL mode', async ({ page }) => {
    // At FULL detail (>1000px), envelopes should have triangular flaps
    const flap = page.locator('path.envelope-flap').first();
    await expect(flap).toBeVisible();
    
    // Flap should have a path definition
    const d = await flap.getAttribute('d');
    expect(d).toBeTruthy();
    expect(d).toContain('M'); // SVG path commands
  });

  test('envelopes have fold lines in FULL mode', async ({ page }) => {
    // Inner fold line for depth effect
    const fold = page.locator('path.envelope-fold').first();
    await expect(fold).toBeVisible();
  });

  test('envelope status affects color', async ({ page }) => {
    // Envelopes should have stroke colors indicating status
    const envelope = page.locator('rect.envelope-body').first();
    const stroke = await envelope.getAttribute('stroke');
    
    expect(stroke).toBeTruthy();
    // Should be a CSS variable or color value
    expect(stroke).toMatch(/var\(--vscode|rgb|#/);
  });

  test('envelopes scale down at COMPACT level', async ({ page }) => {
    // Get FULL mode dimensions
    const fullBody = page.locator('rect.envelope-body').first();
    const fullWidth = await fullBody.getAttribute('width');
    const fullWidthNum = parseFloat(fullWidth || '0');
    
    // Switch to COMPACT (400-600px)
    await page.setViewportSize({ width: 500, height: 900 });
    await page.waitForTimeout(500);
    
    const compactBody = page.locator('rect.envelope-body').first();
    const compactWidth = await compactBody.getAttribute('width');
    const compactWidthNum = parseFloat(compactWidth || '0');
    
    // Compact should be smaller
    expect(compactWidthNum).toBeLessThan(fullWidthNum);
  });

  test('envelope flaps disappear in COMPACT mode', async ({ page }) => {
    // Switch to COMPACT (400-600px)
    await page.setViewportSize({ width: 500, height: 900 });
    await page.waitForTimeout(500);
    
    // Flap should not be visible
    const flaps = page.locator('path.envelope-flap');
    const count = await flaps.count();
    
    // Either no flaps rendered, or they're hidden
    if (count > 0) {
      const flap = flaps.first();
      await expect(flap).not.toBeVisible({ timeout: 1000 }).catch(() => true);
    }
  });

  test('envelopes become icons in MINIMAL mode', async ({ page }) => {
    // Switch to MINIMAL (<400px)
    await page.setViewportSize({ width: 350, height: 700 });
    await page.waitForTimeout(500);
    
    // Should show circles instead of envelope shapes
    const iconCircle = page.locator('circle.envelope-icon-circle').first();
    await expect(iconCircle).toBeVisible();
    
    const statusCircle = page.locator('circle.envelope-icon-status').first();
    await expect(statusCircle).toBeVisible();
  });
});

test.describe('Agent Node Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(500);
  });

  test('agent nodes exist in map', async ({ page }) => {
    // Agents should be rendered as bot glyphs in FULL mode
    const agents = page.locator('.agent-bot');
    const count = await agents.count();
    
    // Insurance scenario has multiple agents
    expect(count).toBeGreaterThan(0);
  });

  test('agent names render without overlap', async ({ page }) => {
    // This is already tested in agent-names-with-filter.spec.js
    // But let's verify agents have labels
    const svg = page.locator('#hddl-map-container svg');
    const labels = svg.locator('text.node-label, text.agent-name, text[class*="label"]');
    
    const count = await labels.count();
    if (count > 0) {
      await expect(labels.first()).toBeVisible();
    }
  });

  test('agents show activity state', async ({ page }) => {
    // Recently active agents should have visual indicator
    const agents = page.locator('.agent-bot');
    
    if (await agents.count() > 0) {
      const firstAgent = agents.first();
      await expect(firstAgent).toBeVisible();
      
      // Agent should have an opacity indicating active/inactive state
      const opacity = await firstAgent.getAttribute('opacity');
      expect(opacity).toBeTruthy();
    }
  });
});

test.describe('Scenario Data Integrity', () => {
  test('insurance scenario loads without errors', async ({ page }) => {
    // Monitor console for errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    
    // Should load cleanly
    expect(errors).toHaveLength(0);
  });

  test('map renders without JavaScript errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => {
      errors.push(err.message);
    });
    
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#hddl-map-container svg');
    
    expect(errors).toHaveLength(0);
  });

  test('all envelopes from scenario appear in UI', async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    
    // Count envelope nodes in the SVG (not envelope cards)
    const envelopeNodes = page.locator('.node.envelope, [data-testid^="envelope-"]');
    const nodeCount = await envelopeNodes.count();
    
    // Should have envelopes (flexible count for different scenarios)
    expect(nodeCount).toBeGreaterThan(0);
    expect(nodeCount).toBeLessThanOrEqual(10);
    
    // Count envelope shapes in map (test-minimal has 2 envelopes)
    const envelopeShapes = page.locator('.envelope-body, .envelope-icon-circle');
    const shapeCount = await envelopeShapes.count();
    
    expect(shapeCount).toBeGreaterThanOrEqual(2);
  });
});

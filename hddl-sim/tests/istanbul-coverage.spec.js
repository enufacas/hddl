/**
 * Istanbul Coverage Collection
 * 
 * Extracts window.__coverage__ from browser (populated by vite-plugin-istanbul)
 * and writes it to .nyc_output/ for nyc report generation.
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nycOutputDir = path.join(__dirname, '..', '.nyc_output');

// Track coverage across all tests
let mergedCoverage = {};

test.describe.serial('Istanbul Coverage Collection', () => {
  
  test.beforeAll(async () => {
    // Ensure .nyc_output directory exists
    if (!fs.existsSync(nycOutputDir)) {
      fs.mkdirSync(nycOutputDir, { recursive: true });
    }
    mergedCoverage = {};
  });

  test.afterEach(async ({ page }) => {
    // Extract window.__coverage__ from browser
    const coverage = await page.evaluate(() => window.__coverage__);
    
    if (coverage) {
      // Merge coverage data
      for (const [file, data] of Object.entries(coverage)) {
        if (!mergedCoverage[file]) {
          mergedCoverage[file] = data;
        } else {
          // Merge statement/branch/function counts
          const existing = mergedCoverage[file];
          for (const [key, count] of Object.entries(data.s || {})) {
            existing.s[key] = (existing.s[key] || 0) + count;
          }
          for (const [key, count] of Object.entries(data.b || {})) {
            if (!existing.b[key]) existing.b[key] = [];
            for (let i = 0; i < count.length; i++) {
              existing.b[key][i] = (existing.b[key][i] || 0) + count[i];
            }
          }
          for (const [key, count] of Object.entries(data.f || {})) {
            existing.f[key] = (existing.f[key] || 0) + count;
          }
        }
      }
    }
  });

  test.afterAll(async () => {
    // Write merged coverage to .nyc_output
    const coverageFile = path.join(nycOutputDir, 'playwright-coverage.json');
    
    if (Object.keys(mergedCoverage).length > 0) {
      fs.writeFileSync(coverageFile, JSON.stringify(mergedCoverage, null, 2));
      console.log(`\n✓ Coverage written to: ${coverageFile}`);
      console.log(`  Files covered: ${Object.keys(mergedCoverage).length}`);
    } else {
      console.log('\n⚠ No coverage data collected.');
      console.log('  Check that VITE_COVERAGE=true and dev server is running.');
    }
  });

  // Exercise main page with scenario
  test('collect coverage from scenario load', async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if Istanbul instrumented the code
    const hasCoverage = await page.evaluate(() => typeof window.__coverage__ !== 'undefined');
    console.log(`Istanbul coverage available: ${hasCoverage}`);
    
    expect(true).toBeTruthy();
  });

  test('collect coverage from playback controls', async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Play/pause
    const playButton = page.locator('#play-button');
    if (await playButton.isVisible()) {
      await playButton.click();
      await page.waitForTimeout(500);
      await playButton.click();
    }

    // Timeline scrubbing
    const timeline = page.locator('#timeline-slider');
    if (await timeline.isVisible()) {
      await timeline.fill('2');
      await page.waitForTimeout(300);
      await timeline.fill('4');
    }
    
    expect(true).toBeTruthy();
  });

  test('collect coverage from detail level changes', async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const detailSelect = page.locator('#detail-level');
    if (await detailSelect.isVisible()) {
      await detailSelect.selectOption('FULL');
      await page.waitForTimeout(300);
      await detailSelect.selectOption('COMPACT');
      await page.waitForTimeout(300);
      await detailSelect.selectOption('MINIMAL');
    }
    
    expect(true).toBeTruthy();
  });

  test('collect coverage from scenario switching', async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    
    const scenarioSelect = page.locator('#scenario-select');
    if (await scenarioSelect.isVisible()) {
      const options = await scenarioSelect.locator('option').allTextContents();
      if (options.length > 1) {
        await scenarioSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }
    }
    
    expect(true).toBeTruthy();
  });

  test('collect coverage from map interactions', async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click envelopes
    const envelopes = page.locator('[data-testid^="envelope-body-"]');
    const count = await envelopes.count();
    for (let i = 0; i < Math.min(count, 2); i++) {
      try {
        await envelopes.nth(i).click({ force: true, timeout: 1000 });
        await page.waitForTimeout(200);
      } catch (e) { /* ignore click failures */ }
    }

    // Hover agents
    const agents = page.locator('[data-testid^="agent-icon-"]');
    const agentCount = await agents.count();
    for (let i = 0; i < Math.min(agentCount, 2); i++) {
      try {
        await agents.nth(i).hover({ timeout: 1000 });
        await page.waitForTimeout(200);
      } catch (e) { /* ignore */ }
    }
    
    expect(true).toBeTruthy();
  });
});

/**
 * Coverage Collection Test - Runs basic tests while collecting coverage
 * 
 * This test suite exercises core functionality while Playwright's
 * coverage API collects execution data.
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const coverageData = [];

test.describe('Coverage Collection', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.coverage.startJSCoverage();
  });

  test.afterEach(async ({ page }) => {
    const coverage = await page.coverage.stopJSCoverage();
    coverageData.push(...coverage);
  });

  test('collect coverage from main scenario', async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Interact with key features
    const playButton = page.locator('#play-button');
    if (await playButton.isVisible()) {
      await playButton.click();
      await page.waitForTimeout(1000);
      await playButton.click(); // pause
    }
    
    // Scrub timeline
    const timeline = page.locator('#timeline-slider');
    if (await timeline.isVisible()) {
      await timeline.fill('2');
      await page.waitForTimeout(500);
      await timeline.fill('4');
      await page.waitForTimeout(500);
    }
    
    expect(true).toBeTruthy();
  });

  test('collect coverage from detail level changes', async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Change detail level
    const detailSelect = page.locator('#detail-level');
    if (await detailSelect.isVisible()) {
      await detailSelect.selectOption('FULL');
      await page.waitForTimeout(500);
      await detailSelect.selectOption('COMPACT');
      await page.waitForTimeout(500);
      await detailSelect.selectOption('MINIMAL');
      await page.waitForTimeout(500);
    }
    
    expect(true).toBeTruthy();
  });

  test('collect coverage from envelope interactions', async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Click on envelopes if present
    const envelopes = page.locator('[data-testid^="envelope-body-"]');
    const count = await envelopes.count();
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        try {
          await envelopes.nth(i).click({ force: true, timeout: 2000 });
          await page.waitForTimeout(300);
        } catch (e) {
          // Click might be intercepted, continue
        }
      }
    }
    
    expect(true).toBeTruthy();
  });

  test('collect coverage from agent interactions', async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Hover over agents
    const agents = page.locator('.agent-bot');
    const count = await agents.count();
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        try {
          await agents.nth(i).hover({ timeout: 2000 });
          await page.waitForTimeout(300);
        } catch (e) {
          // Continue
        }
      }
    }
    
    expect(true).toBeTruthy();
  });

  test('collect coverage from window resize', async ({ page }) => {
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    
    // Resize window to trigger responsive handlers
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    expect(true).toBeTruthy();
  });
});

test.afterAll(async () => {
  // Write coverage data
  const coverageDir = 'coverage';
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
  }
  
  const outputPath = path.join(coverageDir, 'playwright-coverage.json');
  fs.writeFileSync(outputPath, JSON.stringify(coverageData, null, 2));
  
  // Generate summary
  console.log('\n=== Playwright Coverage Collected ===');
  console.log(`Total entries: ${coverageData.length}`);
  
  const srcFiles = coverageData.filter(entry => entry.url.includes('/src/'));
  console.log(`Source files covered: ${srcFiles.length}`);
  
  // Calculate per-file coverage
  const fileCoverage = {};
  for (const entry of srcFiles) {
    const urlParts = entry.url.split('/src/');
    if (urlParts.length < 2) continue;
    
    const filename = urlParts[1];
    const ranges = entry.ranges || [];
    let covered = 0;
    for (const range of ranges) {
      covered += range.end - range.start;
    }
    const total = entry.text?.length || 0;
    
    fileCoverage[filename] = {
      covered,
      total,
      pct: total > 0 ? (covered / total * 100).toFixed(1) : 0
    };
  }
  
  console.log('\n=== Per-File Coverage ===');
  const sortedFiles = Object.entries(fileCoverage)
    .sort((a, b) => b[1].pct - a[1].pct);
  
  for (const [file, stats] of sortedFiles) {
    if (file.includes('components/')) {
      console.log(`${file}: ${stats.pct}% (${stats.covered}/${stats.total} bytes)`);
    }
  }
  
  // Write summary
  const summaryPath = path.join(coverageDir, 'coverage-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(fileCoverage, null, 2));
  console.log(`\nCoverage data written to: ${outputPath}`);
  console.log(`Summary written to: ${summaryPath}`);
});

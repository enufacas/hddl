/**
 * Coverage Reporter - Generates code coverage from Playwright tests
 * 
 * Uses Playwright's page.coverage API to collect JavaScript coverage
 * during test execution.
 */
import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const coverageDir = 'coverage';
const coverageData = [];

// Ensure coverage directory exists
if (!fs.existsSync(coverageDir)) {
  fs.mkdirSync(coverageDir, { recursive: true });
}

test.beforeEach(async ({ page }) => {
  // Start collecting coverage
  await page.coverage.startJSCoverage();
});

test.afterEach(async ({ page }) => {
  // Collect coverage data
  const coverage = await page.coverage.stopJSCoverage();
  coverageData.push(...coverage);
});

test.afterAll(async () => {
  // Write raw coverage data
  const outputPath = path.join(coverageDir, 'coverage-raw.json');
  fs.writeFileSync(outputPath, JSON.stringify(coverageData, null, 2));
  
  // Generate summary report
  const summary = generateCoverageSummary(coverageData);
  const summaryPath = path.join(coverageDir, 'coverage-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log('\n=== Coverage Summary ===');
  for (const [file, stats] of Object.entries(summary)) {
    if (file.includes('src/')) {
      console.log(`${file}: ${stats.pct.toFixed(1)}% (${stats.covered}/${stats.total} lines)`);
    }
  }
});

function generateCoverageSummary(coverage) {
  const summary = {};
  
  for (const entry of coverage) {
    const url = entry.url;
    if (!url.includes('/src/')) continue;
    
    const filename = url.split('/src/')[1] || url;
    
    // Count covered vs total ranges
    const ranges = entry.ranges || [];
    let coveredBytes = 0;
    for (const range of ranges) {
      coveredBytes += range.end - range.start;
    }
    
    const totalBytes = entry.text?.length || 0;
    const pct = totalBytes > 0 ? (coveredBytes / totalBytes) * 100 : 0;
    
    summary[filename] = {
      total: totalBytes,
      covered: coveredBytes,
      pct: pct
    };
  }
  
  return summary;
}

export { test };

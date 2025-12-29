#!/usr/bin/env node

/**
 * PERFORMANCE METRICS
 * 
 * Measures browser rendering performance of the HDDL visualization:
 * - FPS (frames per second during animation)
 * - Render time (initial SVG construction)
 * - Memory usage (heap size during playback)
 * - SVG complexity (DOM node count, path segments)
 * 
 * Requires running Playwright browser automation.
 * Does NOT measure information design (see cognitive-load-metrics.mjs)
 */

import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scenarioName = process.argv[2] || 'insurance-underwriting';
const devServerUrl = process.argv[3] || 'http://localhost:5173';

console.log(`\n⚡ PERFORMANCE METRICS: ${scenarioName.toUpperCase()}`);
console.log('═'.repeat(70));
console.log(`Testing against: ${devServerUrl}`);
console.log('═'.repeat(70));

async function measurePerformance() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n🌐 Loading scenario...');
  
  // Navigate to scenario
  const startTime = Date.now();
  await page.goto(`${devServerUrl}/?scenario=${scenarioName}`);
  
  // Wait for initial render
  await page.waitForSelector('.hddl-map', { timeout: 10000 });
  const loadTime = Date.now() - startTime;
  
  console.log(`  ✅ Loaded in ${loadTime}ms`);

  // ============================================================================
  // SVG COMPLEXITY - Count DOM nodes
  // ============================================================================
  
  console.log('\n\n📐 SVG COMPLEXITY');
  console.log('─'.repeat(70));
  
  const svgStats = await page.evaluate(() => {
    const svg = document.querySelector('.hddl-map svg');
    if (!svg) return null;
    
    // Count nodes by type
    const counts = {
      total: svg.querySelectorAll('*').length,
      circles: svg.querySelectorAll('circle').length,
      paths: svg.querySelectorAll('path').length,
      lines: svg.querySelectorAll('line').length,
      text: svg.querySelectorAll('text').length,
      groups: svg.querySelectorAll('g').length
    };
    
    // Measure path complexity (total d attribute length)
    const paths = svg.querySelectorAll('path');
    let totalPathLength = 0;
    paths.forEach(path => {
      const d = path.getAttribute('d');
      if (d) totalPathLength += d.length;
    });
    
    return { ...counts, totalPathLength };
  });
  
  if (svgStats) {
    console.log(`  Total SVG nodes:              ${svgStats.total}`);
    console.log(`  Circles (particles, nodes):   ${svgStats.circles}`);
    console.log(`  Paths (orbits, connections):  ${svgStats.paths}`);
    console.log(`  Lines:                        ${svgStats.lines}`);
    console.log(`  Text labels:                  ${svgStats.text}`);
    console.log(`  Groups:                       ${svgStats.groups}`);
    console.log(`  Total path length:            ${svgStats.totalPathLength.toLocaleString()} chars`);
    
    const complexity = svgStats.total > 1000 ? '⚠️  VERY COMPLEX' :
                      svgStats.total > 500 ? '✅ MODERATE' :
                      '✅ SIMPLE';
    console.log(`\n  Assessment:                   ${complexity}`);
  }

  // ============================================================================
  // RENDER TIME - Initial draw performance
  // ============================================================================
  
  console.log('\n\n⏱️  RENDER TIME');
  console.log('─'.repeat(70));
  
  // Measure time to first meaningful paint
  const paintMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      domInteractive: navigation.domInteractive - navigation.fetchStart,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
    };
  });
  
  console.log(`  DOM Interactive:              ${paintMetrics.domInteractive.toFixed(0)}ms`);
  console.log(`  DOM Content Loaded:           ${paintMetrics.domContentLoaded.toFixed(0)}ms`);
  console.log(`  First Paint:                  ${paintMetrics.firstPaint.toFixed(0)}ms`);
  console.log(`  First Contentful Paint:       ${paintMetrics.firstContentfulPaint.toFixed(0)}ms`);
  
  const renderAssessment = paintMetrics.firstContentfulPaint < 1000 ? '✅ FAST' :
                           paintMetrics.firstContentfulPaint < 2000 ? '✅ GOOD' :
                           '⚠️  SLOW';
  console.log(`\n  Assessment:                   ${renderAssessment}`);

  // ============================================================================
  // ANIMATION PERFORMANCE - FPS during playback
  // ============================================================================
  
  console.log('\n\n🎬 ANIMATION PERFORMANCE');
  console.log('─'.repeat(70));
  console.log('  Starting 5-second playback sample...');
  
  // Start playback
  await page.click('[data-testid="play-button"]', { timeout: 5000 }).catch(() => {
    console.log('  ℹ️  Play button not found, skipping FPS test');
  });
  
  // Measure FPS over 5 seconds
  const fpsData = await page.evaluate(() => {
    return new Promise((resolve) => {
      const frames = [];
      let lastTime = performance.now();
      let rafId;
      
      function measureFrame() {
        const now = performance.now();
        const delta = now - lastTime;
        frames.push(1000 / delta); // Convert to FPS
        lastTime = now;
        
        if (frames.length < 150) { // ~5 seconds at 30fps
          rafId = requestAnimationFrame(measureFrame);
        } else {
          const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
          const min = Math.min(...frames);
          const max = Math.max(...frames);
          resolve({ avg, min, max, samples: frames.length });
        }
      }
      
      rafId = requestAnimationFrame(measureFrame);
      
      // Safety timeout
      setTimeout(() => {
        cancelAnimationFrame(rafId);
        const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
        const min = Math.min(...frames);
        const max = Math.max(...frames);
        resolve({ avg, min, max, samples: frames.length });
      }, 6000);
    });
  });
  
  console.log(`  Average FPS:                  ${fpsData.avg.toFixed(1)}`);
  console.log(`  Min FPS:                      ${fpsData.min.toFixed(1)}`);
  console.log(`  Max FPS:                      ${fpsData.max.toFixed(1)}`);
  console.log(`  Samples:                      ${fpsData.samples}`);
  
  const fpsAssessment = fpsData.avg >= 50 ? '✅ SMOOTH (50+ fps)' :
                        fpsData.avg >= 30 ? '✅ GOOD (30+ fps)' :
                        '⚠️  CHOPPY (< 30 fps)';
  console.log(`\n  Assessment:                   ${fpsAssessment}`);

  // ============================================================================
  // MEMORY USAGE
  // ============================================================================
  
  console.log('\n\n💾 MEMORY USAGE');
  console.log('─'.repeat(70));
  
  const memoryMetrics = await page.evaluate(() => {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  });
  
  if (memoryMetrics) {
    const usedMB = (memoryMetrics.usedJSHeapSize / 1024 / 1024).toFixed(1);
    const totalMB = (memoryMetrics.totalJSHeapSize / 1024 / 1024).toFixed(1);
    const limitMB = (memoryMetrics.jsHeapSizeLimit / 1024 / 1024).toFixed(1);
    
    console.log(`  Used JS Heap:                 ${usedMB} MB`);
    console.log(`  Total JS Heap:                ${totalMB} MB`);
    console.log(`  Heap Limit:                   ${limitMB} MB`);
    
    const memoryAssessment = usedMB < 50 ? '✅ LIGHT' :
                            usedMB < 100 ? '✅ MODERATE' :
                            '⚠️  HEAVY';
    console.log(`\n  Assessment:                   ${memoryAssessment}`);
  } else {
    console.log('  ℹ️  Memory metrics not available (Chrome only)');
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  
  console.log('\n\n📋 PERFORMANCE SUMMARY');
  console.log('═'.repeat(70));
  
  const summary = {
    'Initial Load Time': {
      value: `${loadTime}ms`,
      target: '< 2000ms',
      status: loadTime < 2000 ? '✅' : '⚠️'
    },
    'First Contentful Paint': {
      value: `${paintMetrics.firstContentfulPaint.toFixed(0)}ms`,
      target: '< 1000ms',
      status: paintMetrics.firstContentfulPaint < 1000 ? '✅' : '⚠️'
    },
    'SVG Node Count': {
      value: svgStats.total,
      target: '< 1000',
      status: svgStats.total < 1000 ? '✅' : '⚠️'
    },
    'Average FPS': {
      value: fpsData.avg.toFixed(1),
      target: '> 30',
      status: fpsData.avg >= 30 ? '✅' : '⚠️'
    }
  };
  
  console.log('\nMetric                     | Value      | Target      | Status');
  console.log('─'.repeat(70));
  
  Object.entries(summary).forEach(([name, data]) => {
    const namePad = name.padEnd(26);
    const valuePad = String(data.value).padEnd(10);
    const targetPad = data.target.padEnd(11);
    console.log(`${namePad} | ${valuePad} | ${targetPad} | ${data.status}`);
  });
  
  console.log('\n' + '═'.repeat(70));
  console.log('✅ Performance metrics complete');
  console.log('💡 For information design metrics, run: npm run cognitive-load');
  console.log('═'.repeat(70) + '\n');

  await browser.close();
}

// Run measurements
measurePerformance().catch(err => {
  console.error('\n❌ Performance measurement failed:');
  console.error(err.message);
  console.error('\n💡 Make sure dev server is running: npm run dev');
  process.exit(1);
});

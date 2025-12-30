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
import { preview } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scenarioName = process.argv[2] || 'test-minimal';
const devServerUrl = process.argv[3] || 'http://localhost:5173';

console.log(`\n⚡ PERFORMANCE METRICS: ${scenarioName.toUpperCase()}`);
console.log('═'.repeat(70));
console.log(`Testing against: ${devServerUrl}`);
console.log('═'.repeat(70));

/**
 * Check if dev server is running
 */
async function isServerRunning(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Start dev server and wait for it to be ready
 */
async function startDevServer() {
  console.log('\n🚀 Starting dev server...');
  
  return new Promise((resolve, reject) => {
    const serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: join(__dirname, '..'),
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' }
    });

    let serverReady = false;
    const timeout = setTimeout(() => {
      if (!serverReady) {
        serverProcess.kill();
        reject(new Error('Server failed to start within 30 seconds'));
      }
    }, 30000);

    const checkOutput = (data) => {
      const output = data.toString();
      // Look for Vite ready message
      if ((output.includes('Local:') || output.includes('ready in')) && !serverReady) {
        clearTimeout(timeout);
        serverReady = true;
        console.log('  ✅ Dev server ready');
        // Give it a moment to fully bind to port
        setTimeout(() => resolve(serverProcess), 2000);
      }
    };

    serverProcess.stdout.on('data', checkOutput);
    serverProcess.stderr.on('data', checkOutput);

    serverProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    serverProcess.on('exit', (code) => {
      if (!serverReady) {
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code} before becoming ready`));
      }
    });
  });
}

async function measurePerformance() {
  // Check if server is already running
  const serverAlreadyRunning = await isServerRunning(devServerUrl);
  let serverProcess = null;

  if (!serverAlreadyRunning) {
    try {
      serverProcess = await startDevServer();
    } catch (err) {
      console.error('\n❌ Failed to start dev server:');
      console.error(err.message);
      console.error('\n💡 Try starting it manually: npm run dev');
      process.exit(1);
    }
  } else {
    console.log('\n✅ Using existing dev server');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n🌐 Loading scenario...');
  
  // Navigate to scenario
  const startTime = Date.now();
  // Listen to console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });
  
  await page.goto(`${devServerUrl}/?scenario=${scenarioName}`, { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });
  
  console.log('  Page loaded, checking for errors...');
  
  // Wait a bit for async scenario loading
  await page.waitForTimeout(2000);
  
  if (consoleMessages.length > 0) {
    console.log('  Browser console:');
    consoleMessages.forEach(msg => console.log(`    ${msg}`));
  }
  
  console.log('  Waiting for scenario to load...');
  
  // Wait for scenario to actually load (check for valid scenario data)
  try {
    await page.waitForFunction(() => {
      if (typeof window.getScenario !== 'function') return false;
      const scenario = window.getScenario();
      // Valid scenario has either old format (title + durationHours) or new format (metadata.name)
      const hasOldFormat = scenario && scenario.title && scenario.durationHours > 0;
      const hasNewFormat = scenario && scenario.metadata && scenario.metadata.name && scenario.durationHours > 0;
      return hasOldFormat || hasNewFormat;
    }, { timeout: 15000 });
    console.log('  Scenario loaded successfully');
  } catch (err) {
    // If timeout, check what's in the scenario
    const debugInfo = await page.evaluate(() => {
      const scenario = typeof window.getScenario === 'function' ? window.getScenario() : null;
      return {
        hasGetScenario: typeof window.getScenario === 'function',
        scenario: scenario ? {
          hasMetadata: !!scenario.metadata,
          metadataName: scenario.metadata?.name,
          durationHours: scenario.durationHours,
          timelineLength: scenario.timeline?.length
        } : null
      };
    });
    console.log('  Debug info:', JSON.stringify(debugInfo, null, 2));
    console.log('  Console messages:', consoleMessages);
    throw err;
  }
  
  // Wait for initial render - be more generous with timeout
  await page.waitForSelector('#hddl-map-container svg', { timeout: 30000 });
  const loadTime = Date.now() - startTime;
  
  console.log(`  ✅ Loaded in ${loadTime}ms`);

  // ============================================================================
  // SVG COMPLEXITY - Count DOM nodes
  // ============================================================================
  
  console.log('\n\n📐 SVG COMPLEXITY');
  console.log('─'.repeat(70));
  
  const svgStats = await page.evaluate(() => {
    const svg = document.querySelector('#hddl-map-container svg');
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
  console.log('  Advancing timeline to ensure particles spawn...');
  
  // Verify correct scenario loaded
  const scenarioInfo = await page.evaluate(() => {
    const getScenario = window.getScenario || (() => null);
    const scenario = getScenario();
    return {
      title: scenario?.title || scenario?.metadata?.name,
      duration: scenario?.durationHours,
      eventCount: scenario?.events?.length || scenario?.timeline?.length || 0
    };
  });
  
  console.log(`  Loaded scenario: "${scenarioInfo.title}" (${scenarioInfo.duration}h, ${scenarioInfo.eventCount} events)`);
  
  if (scenarioInfo.duration !== 6 && scenarioName === 'test-minimal') {
    console.log('  ⚠️  WARNING: Expected test-minimal (6h), got different duration!');
  }
  
  // Advance timeline directly to middle of scenario where particles exist
  const timelineSetup = await page.evaluate(() => {
    // Import from store if available globally
    const setTimeHour = window.setTimeHour || 
      (() => { console.warn('setTimeHour not found globally'); });
    const getScenario = window.getScenario || 
      (() => ({ durationHours: 48 }));
    
    const scenario = getScenario();
    const maxHour = scenario?.durationHours || 48;
    const targetHour = Math.min(maxHour * 0.5, 3.0); // Middle of scenario or hour 3
    
    // Set timeline to target hour
    if (typeof setTimeHour === 'function') {
      setTimeHour(targetHour);
    }
    
    // Start playback
    const playBtn = document.querySelector('#timeline-play');
    if (playBtn && playBtn.innerHTML.includes('play')) {
      playBtn.click();
    }
    
    return {
      maxHour,
      targetHour,
      buttonFound: !!playBtn,
      storeAvailable: typeof setTimeHour === 'function'
    };
  });
  
  console.log(`  Timeline set to hour ${timelineSetup.targetHour} of ${timelineSetup.maxHour}`);
  console.log(`  Store available: ${timelineSetup.storeAvailable ? 'yes' : 'no'}`);
  console.log(`  Starting playback from this position...`);
  
  // Let particles render from the advanced timeline position
  console.log('  Waiting for particles to render...');
  await new Promise(resolve => setTimeout(resolve, 3000)); // Extended wait for particle spawn
  
  // Verify particles are animating
  const animationCheck = await page.evaluate(() => {
    const particles = document.querySelectorAll('g.particle');
    const particleCount = particles.length;
    
    // Check if simulation is running by looking at the button state
    const playBtn = document.querySelector('#timeline-play');
    const isPlaying = playBtn?.innerHTML.includes('pause');
    
    // Get current simulation time
    const timeDisplay = document.querySelector('.timeline-time');
    const currentTime = timeDisplay?.textContent || 'unknown';
    
    // Count visible SVG elements with particle data attributes
    const dataParticles = document.querySelectorAll('[data-particle-type]').length;
    
    // Check SVG container exists
    const svgContainer = document.querySelector('#hddl-map-container svg');
    const svgExists = !!svgContainer;
    
    // Count all circle elements (might be particles)
    const allCircles = svgContainer ? svgContainer.querySelectorAll('circle').length : 0;
    
    return {
      particleCount,
      dataParticles,
      isPlaying,
      currentTime,
      svgExists,
      allCircles
    };
  });
  
  console.log(`  Animation status: ${animationCheck.isPlaying ? '▶️ PLAYING' : '⏸️ PAUSED'}`);
  console.log(`  SVG container exists: ${animationCheck.svgExists ? 'yes' : 'NO'}`);
  console.log(`  Total circles in SVG: ${animationCheck.allCircles}`);
  console.log(`  Particles visible: ${animationCheck.particleCount} (data-attributes: ${animationCheck.dataParticles})`);
  console.log(`  Simulation time: ${animationCheck.currentTime}`);
  
  if (!animationCheck.isPlaying) {
    console.log('  ⚠️  WARNING: Playback may not be running!');
  }
  
  if (animationCheck.particleCount === 0) {
    console.log('  ⚠️  WARNING: No particles found - may not spawn in this scenario/timeline position!');
  }
  
  // Wait a bit more to ensure particles are moving
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Measure FPS over 5 seconds WHILE VERIFYING animation continues
  const fpsData = await page.evaluate(() => {
    return new Promise((resolve) => {
      const frames = [];
      let lastTime = performance.now();
      let rafId;
      let particlePositionChanges = 0;
      
      // Track if particles are actually moving
      let lastParticlePositions = null;
      
      function checkParticlesMoving() {
        const particles = document.querySelectorAll('g.particle');
        if (particles.length === 0) return false;
        
        const currentPositions = Array.from(particles).slice(0, Math.min(5, particles.length)).map(p => {
          const transform = p.getAttribute('transform') || '';
          const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
          return {
            x: match ? parseFloat(match[1]) : 0,
            y: match ? parseFloat(match[2]) : 0
          };
        });
        
        if (lastParticlePositions && lastParticlePositions.length === currentPositions.length) {
          const moved = currentPositions.some((curr, i) => {
            const last = lastParticlePositions[i];
            return Math.abs(curr.x - last.x) > 0.1 || Math.abs(curr.y - last.y) > 0.1;
          });
          if (moved) particlePositionChanges++;
        }
        
        lastParticlePositions = currentPositions;
      }
      
      function measureFrame() {
        const now = performance.now();
        const delta = now - lastTime;
        frames.push(1000 / delta); // Convert to FPS
        lastTime = now;
        
        // Check particle movement every 10 frames
        if (frames.length % 10 === 0) {
          checkParticlesMoving();
        }
        
        if (frames.length < 150) { // ~5 seconds at 30fps
          rafId = requestAnimationFrame(measureFrame);
        } else {
          const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
          const min = Math.min(...frames);
          const max = Math.max(...frames);
          resolve({ 
            avg, 
            min, 
            max, 
            samples: frames.length,
            particleMovementDetected: particlePositionChanges > 5
          });
        }
      }
      
      rafId = requestAnimationFrame(measureFrame);
      
      // Safety timeout
      setTimeout(() => {
        cancelAnimationFrame(rafId);
        const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
        const min = Math.min(...frames);
        const max = Math.max(...frames);
        resolve({ 
          avg, 
          min, 
          max, 
          samples: frames.length,
          particleMovementDetected: particlePositionChanges > 5
        });
      }, 6000);
    });
  });
  
  console.log(`  Average FPS:                  ${fpsData.avg.toFixed(1)}`);
  console.log(`  Min FPS:                      ${fpsData.min.toFixed(1)}`);
  console.log(`  Max FPS:                      ${fpsData.max.toFixed(1)}`);
  console.log(`  Samples:                      ${fpsData.samples}`);
  console.log(`  Particle movement detected:   ${fpsData.particleMovementDetected ? '✅ YES' : '❌ NO (idle)'}`);
  
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
      value: svgStats?.total || 'N/A',
      target: '< 1000',
      status: svgStats && svgStats.total < 1000 ? '✅' : '⚠️'
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

  // Clean up server if we started it
  if (serverProcess) {
    console.log('🛑 Shutting down dev server...');
    serverProcess.kill('SIGTERM');
    // Don't wait - just force exit
    setTimeout(() => {
      if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
      process.exit(0);
    }, 500);
  } else {
    // No server to clean up, exit immediately
    process.exit(0);
  }
}

// Run measurements
measurePerformance().catch(err => {
  console.error('\n❌ Performance measurement failed:');
  console.error(err.message);
  process.exit(1);
});

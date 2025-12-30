#!/usr/bin/env node

/**
 * Performance Test Suite Runner
 * Runs performance tests multiple times and aggregates results
 */

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

const RUNS = 5;

console.log('\n========================================');
console.log('CLEAN PERFORMANCE TEST SUITE');
console.log('========================================\n');

const results = [];

async function runTest(runNumber) {
  return new Promise((resolve, reject) => {
    console.log(`▶ Run ${runNumber}/${RUNS}...`);
    
    let output = '';
    
    const proc = spawn('node', ['./analysis/performance-metrics.mjs'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    proc.on('close', (code) => {
      // Extract metrics from output
      const loadMatch = output.match(/Loaded in (\d+)ms/);
      const fcpMatch = output.match(/First Contentful Paint:\s+(\d+)ms/);
      const avgFpsMatch = output.match(/Average FPS:\s+([\d.]+)/);
      const minFpsMatch = output.match(/Min FPS:\s+([\d.]+)/);
      const maxFpsMatch = output.match(/Max FPS:\s+([\d.]+)/);
      const memMatch = output.match(/Used JS Heap:\s+([\d.]+) MB/);
      
      const result = {
        run: runNumber,
        load: loadMatch ? parseInt(loadMatch[1]) : 0,
        fcp: fcpMatch ? parseInt(fcpMatch[1]) : 0,
        avgFps: avgFpsMatch ? parseFloat(avgFpsMatch[1]) : 0,
        minFps: minFpsMatch ? parseFloat(minFpsMatch[1]) : 0,
        maxFps: maxFpsMatch ? parseFloat(maxFpsMatch[1]) : 0,
        memory: memMatch ? parseFloat(memMatch[1]) : 0
      };
      
      console.log(`  ✓ Load: ${result.load}ms | FCP: ${result.fcp}ms | Avg: ${result.avgFps} fps | Min: ${result.minFps} | Max: ${result.maxFps} | Mem: ${result.memory}MB\n`);
      
      if (code === 0) {
        resolve(result);
      } else {
        console.error(`  ✗ Test failed with code ${code}`);
        resolve(result); // Still resolve to continue
      }
    });
    
    proc.on('error', (err) => {
      console.error(`  ✗ Error running test: ${err.message}`);
      reject(err);
    });
  });
}

async function runAllTests() {
  for (let i = 1; i <= RUNS; i++) {
    const result = await runTest(i);
    results.push(result);
  }
  
  // Calculate statistics
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const stdDev = (arr) => {
    const mean = avg(arr);
    const squareDiffs = arr.map(value => Math.pow(value - mean, 2));
    return Math.sqrt(avg(squareDiffs));
  };
  
  const loads = results.map(r => r.load);
  const fcps = results.map(r => r.fcp);
  const avgFpss = results.map(r => r.avgFps);
  const minFpss = results.map(r => r.minFps);
  const maxFpss = results.map(r => r.maxFps);
  const mems = results.map(r => r.memory);
  
  console.log('\n========================================');
  console.log('RESULTS');
  console.log('========================================\n');
  
  console.log('Run | Load (ms) | FCP (ms) | Avg FPS | Min FPS | Max FPS | Mem (MB)');
  console.log('----|-----------|----------|---------|---------|---------|----------');
  results.forEach(r => {
    console.log(`${r.run}   | ${r.load.toString().padStart(9)} | ${r.fcp.toString().padStart(8)} | ${r.avgFps.toFixed(1).padStart(7)} | ${r.minFps.toFixed(1).padStart(7)} | ${r.maxFps.toFixed(1).padStart(7)} | ${r.memory.toFixed(1).padStart(8)}`);
  });
  
  console.log('\n========================================');
  console.log('STATISTICS');
  console.log('========================================\n');
  
  console.log(`Load Time:    ${Math.round(avg(loads))}ms ± ${Math.round(stdDev(loads))}ms`);
  console.log(`FCP:          ${Math.round(avg(fcps))}ms ± ${Math.round(stdDev(fcps))}ms`);
  console.log(`Avg FPS:      ${avg(avgFpss).toFixed(1)} ± ${stdDev(avgFpss).toFixed(1)}`);
  console.log(`Min FPS:      ${avg(minFpss).toFixed(1)} ± ${stdDev(minFpss).toFixed(1)}`);
  console.log(`Max FPS:      ${avg(maxFpss).toFixed(1)} ± ${stdDev(maxFpss).toFixed(1)}`);
  console.log(`Memory:       ${avg(mems).toFixed(1)}MB ± ${stdDev(mems).toFixed(1)}MB`);
  
  // Save results as JSON
  const summary = {
    timestamp: new Date().toISOString(),
    runs: results,
    statistics: {
      load: { mean: Math.round(avg(loads)), stdDev: Math.round(stdDev(loads)) },
      fcp: { mean: Math.round(avg(fcps)), stdDev: Math.round(stdDev(fcps)) },
      avgFps: { mean: parseFloat(avg(avgFpss).toFixed(1)), stdDev: parseFloat(stdDev(avgFpss).toFixed(1)) },
      minFps: { mean: parseFloat(avg(minFpss).toFixed(1)), stdDev: parseFloat(stdDev(minFpss).toFixed(1)) },
      maxFps: { mean: parseFloat(avg(maxFpss).toFixed(1)), stdDev: parseFloat(stdDev(maxFpss).toFixed(1)) },
      memory: { mean: parseFloat(avg(mems).toFixed(1)), stdDev: parseFloat(stdDev(mems).toFixed(1)) }
    }
  };
  
  writeFileSync('perf-results.json', JSON.stringify(summary, null, 2));
  console.log('\n✓ Results saved to perf-results.json\n');
}

runAllTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Coverage Report Generator
 * 
 * Runs Playwright tests with Istanbul instrumentation enabled
 * and generates an HTML coverage report.
 * 
 * Usage:
 *   npm run test:coverage           # Full workflow
 *   npm run test:coverage -- -v     # Verbose output
 *   npm run test:coverage -- -s     # Skip opening browser
 */
import { spawn } from 'child_process';
import { existsSync, rmSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { platform } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const skipOpen = args.includes('--skip-open') || args.includes('-s');

// ANSI colors
const c = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m'
};

const log = (msg, color = c.reset) => console.log(`${color}${msg}${c.reset}`);
const step = msg => log(`▶ ${msg}`, c.cyan);
const ok = msg => log(`✓ ${msg}`, c.green);
const err = msg => log(`✗ ${msg}`, c.red);
const info = msg => log(`  ${msg}`, c.gray);

// Windows needs .cmd extension for npm/npx
const cmd = base => platform() === 'win32' ? `${base}.cmd` : base;

function clean() {
  step('Cleaning old coverage data...');
  const dirs = ['.nyc_output', 'coverage'];
  for (const dir of dirs) {
    const path = join(projectRoot, dir);
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
    }
  }
  ok('Coverage directories cleaned');
}

function runTests() {
  return new Promise((resolve, reject) => {
    step('Running tests with Istanbul coverage...');
    info('This runs istanbul-coverage.spec.js to collect coverage data');
    
    // Run just the istanbul coverage spec
    const testArgs = ['playwright', 'test', 'tests/istanbul-coverage.spec.js', '--reporter=line'];
    
    const test = spawn(cmd('npx'), testArgs, {
      cwd: projectRoot,
      env: { ...process.env, VITE_COVERAGE: 'true' },
      stdio: verbose ? 'inherit' : 'pipe',
      shell: true
    });
    
    let output = '';
    
    if (!verbose) {
      test.stdout?.on('data', d => { output += d.toString(); });
      test.stderr?.on('data', d => { output += d.toString(); });
    }
    
    test.on('close', code => {
      if (code === 0) {
        ok('Tests completed successfully');
        resolve();
      } else {
        err(`Tests failed with code ${code}`);
        if (!verbose && output) console.log(output);
        reject(new Error('Tests failed'));
      }
    });
    
    test.on('error', reject);
  });
}

function checkCoverage() {
  const nycDir = join(projectRoot, '.nyc_output');
  
  if (!existsSync(nycDir)) {
    err('No .nyc_output directory found');
    info('Istanbul instrumentation may not be working.');
    info('Make sure VITE_COVERAGE=true is set when dev server starts.');
    return false;
  }
  
  const files = readdirSync(nycDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    err('No coverage JSON files in .nyc_output/');
    return false;
  }
  
  ok(`Found ${files.length} coverage file(s)`);
  return true;
}

function generateReport() {
  return new Promise((resolve, reject) => {
    step('Generating coverage report...');
    
    const nyc = spawn(cmd('npx'), ['nyc', 'report', '--reporter=html', '--reporter=text'], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true
    });
    
    nyc.on('close', code => {
      if (code === 0) {
        ok('Coverage report generated');
        resolve();
      } else {
        err('Report generation failed');
        reject(new Error('nyc report failed'));
      }
    });
    
    nyc.on('error', reject);
  });
}

function openReport() {
  const reportPath = join(projectRoot, 'coverage', 'index.html');
  
  if (!existsSync(reportPath)) {
    info('Report file not found');
    return;
  }
  
  step('Opening coverage report...');
  
  if (platform() === 'win32') {
    spawn('cmd', ['/c', 'start', '', reportPath], { stdio: 'ignore', detached: true }).unref();
  } else if (platform() === 'darwin') {
    spawn('open', [reportPath], { stdio: 'ignore', detached: true }).unref();
  } else {
    spawn('xdg-open', [reportPath], { stdio: 'ignore', detached: true }).unref();
  }
  
  ok('Opened coverage/index.html');
}

async function main() {
  console.log(`\n${c.yellow}=== HDDL Coverage Report Generator ===${c.reset}\n`);
  
  try {
    clean();
    await runTests();
    
    if (!checkCoverage()) {
      err('Coverage collection failed');
      process.exit(1);
    }
    
    await generateReport();
    
    if (!skipOpen) {
      openReport();
    }
    
    console.log(`\n${c.green}✓ Coverage report ready: coverage/index.html${c.reset}\n`);
  } catch (error) {
    err(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();

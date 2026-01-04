#!/usr/bin/env node

/**
 * Pre-generate AI Narratives for All Scenarios
 * 
 * This script generates LLM-powered narratives for all scenario files
 * and stores them as .narrative.json files alongside the scenarios.
 * 
 * Pre-generated narratives enable instant display in the UI while still
 * allowing users to regenerate with custom prompts.
 * 
 * Usage:
 *   node scripts/generate-narratives.mjs [options]
 * 
 * Options:
 *   --scenario <name>   Generate for specific scenario only
 *   --dry-run           Show what would be generated without making LLM calls
 *   --force             Regenerate even if narrative already exists
 *   --use-api           Generate via HTTP API instead of direct module call
 *   --api-url <url>     Narrative API base URL (default: http://localhost:8080)
 *   --origin <origin>   Origin header for API calls (default: http://localhost:5173)
 * 
 * Examples:
 *   node scripts/generate-narratives.mjs --dry-run
 *   node scripts/generate-narratives.mjs --scenario insurance-underwriting
 *   node scripts/generate-narratives.mjs --force
 *   node scripts/generate-narratives.mjs --scenario default --force --use-api
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { analyzeScenario, generateLLMNarrative } from '../api/narrative-generator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const useApi = args.includes('--use-api');
const scenarioFilter = args.includes('--scenario') 
  ? args[args.indexOf('--scenario') + 1] 
  : null;

const apiUrl = args.includes('--api-url')
  ? args[args.indexOf('--api-url') + 1]
  : (process.env.NARRATIVE_API_URL || 'http://localhost:8080');

const apiOrigin = args.includes('--origin')
  ? args[args.indexOf('--origin') + 1]
  : (process.env.NARRATIVE_API_ORIGIN || 'http://localhost:5173');

// Paths
const SCENARIOS_DIR = join(__dirname, '..', 'src', 'sim', 'scenarios');

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Load all scenario files
 */
async function loadScenarios() {
  const files = await readdir(SCENARIOS_DIR);
  const scenarioFiles = files
    .filter(f => f.endsWith('.scenario.json'))
    .map(f => f.replace('.scenario.json', ''));
  
  // Apply filter if specified
  if (scenarioFilter) {
    if (!scenarioFiles.includes(scenarioFilter)) {
      throw new Error(`Scenario "${scenarioFilter}" not found. Available: ${scenarioFiles.join(', ')}`);
    }
    return [scenarioFilter];
  }
  
  return scenarioFiles;
}

/**
 * Check if narrative already exists
 */
async function narrativeExists(scenarioName) {
  const narrativePath = join(SCENARIOS_DIR, `${scenarioName}.narrative.json`);
  try {
    await readFile(narrativePath, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Load scenario JSON
 */
async function loadScenario(scenarioName) {
  const scenarioPath = join(SCENARIOS_DIR, `${scenarioName}.scenario.json`);
  const content = await readFile(scenarioPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Generate and save narrative for a scenario
 */
async function generateNarrativeForScenario(scenarioName) {
  log(`\n${'='.repeat(80)}`, 'blue');
  log(`Processing: ${scenarioName}`, 'blue');
  log('='.repeat(80), 'blue');
  
  // Check if already exists
  const exists = await narrativeExists(scenarioName);
  if (exists && !force) {
    log('⏭️  Narrative already exists (use --force to regenerate)', 'yellow');
    return { skipped: true };
  }
  
  if (dryRun) {
    log('🔍 DRY RUN: Would generate narrative', 'yellow');
    const scenario = await loadScenario(scenarioName);
    const analysis = analyzeScenario(scenario);
    log(`  Title: ${analysis.metadata.name}`, 'gray');
    log(`  Domain: ${analysis.metadata.domain}`, 'gray');
    log(`  Events: ${analysis.metadata.totalEvents}`, 'gray');
    log(`  Estimated cost: ~$0.01-0.02`, 'gray');
    return { skipped: true };
  }
  
  // Load scenario
  log('📄 Loading scenario...', 'gray');
  const scenario = await loadScenario(scenarioName);
  const analysis = analyzeScenario(scenario);
  log(`  Title: ${analysis.metadata.name}`, 'gray');
  log(`  Domain: ${analysis.metadata.domain}`, 'gray');
  log(`  Events: ${analysis.metadata.totalEvents}`, 'gray');
  
  // Generate narrative
  log(useApi ? `🌐 Generating narrative via API (${apiUrl})...` : '🤖 Generating narrative with Gemini...', 'yellow');
  const startTime = Date.now();
  
  try {
    let result;
    if (useApi) {
      const response = await fetch(new URL('/generate', apiUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': apiOrigin
        },
        body: JSON.stringify({
          scenario: scenarioName,
          fullContext: true
        })
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`API request failed (${response.status}): ${text || response.statusText}`);
      }

      const apiResult = await response.json();
      result = {
        markdown: apiResult.narrative,
        citations: apiResult.citations || [],
        metadata: apiResult.metadata || {}
      };
    } else {
      result = await generateLLMNarrative(analysis, scenario, {
        fullContext: true
      });
    }
    
    const duration = Date.now() - startTime;
    
    // Build output structure
    const output = {
      scenarioId: scenario.id,
      scenarioName: scenarioName,
      title: analysis.metadata.name,
      narrative: result.markdown,
      citations: result.citations,
      metadata: {
        ...result.metadata,
        generatedAt: new Date().toISOString(),
        generatedBy: 'scripts/generate-narratives.mjs',
        scenarioVersion: scenario.schemaVersion,
        duration
      }
    };
    
    // Save to file
    const narrativePath = join(SCENARIOS_DIR, `${scenarioName}.narrative.json`);
    await writeFile(narrativePath, JSON.stringify(output, null, 2), 'utf-8');
    
    log(`✅ Generated in ${(duration / 1000).toFixed(2)}s`, 'green');
    log(`  Cost: $${result.metadata.cost.toFixed(6)}`, 'green');
    log(`  Tokens: ${result.metadata.tokensIn} in / ${result.metadata.tokensOut} out`, 'green');
    log(`  Citations: ${result.citations.length} event references`, 'green');
    log(`  Saved: ${basename(narrativePath)}`, 'green');
    
    // Show preview
    log(`\n  Preview (first 200 chars):`, 'gray');
    log(`  ${result.markdown.substring(0, 200).replace(/\n/g, '\n  ')}...\n`, 'gray');
    
    return {
      success: true,
      cost: result.metadata.cost,
      tokens: result.metadata.tokensIn + result.metadata.tokensOut,
      citations: result.citations.length,
      duration
    };
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return { error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  log('\n' + '='.repeat(80), 'blue');
  log('HDDL NARRATIVE PRE-GENERATION SCRIPT', 'blue');
  log('='.repeat(80), 'blue');
  
  // Check environment
  if (!dryRun && !useApi && !process.env.GOOGLE_CLOUD_PROJECT) {
    log('\n❌ GOOGLE_CLOUD_PROJECT not set', 'red');
    log('   Either set GOOGLE_CLOUD_PROJECT (direct mode) or use the local API:', 'yellow');
    log('   node scripts/generate-narratives.mjs --scenario <name> --force --use-api\n', 'gray');
    process.exit(1);
  }
  
  if (dryRun) {
    log('\n🔍 DRY RUN MODE - No LLM calls will be made\n', 'yellow');
  }

  if (useApi) {
    log(`\n🌐 API MODE - Using ${apiUrl} (Origin: ${apiOrigin})\n`, 'yellow');
  }
  
  if (force) {
    log('\n🔄 FORCE MODE - Will regenerate existing narratives\n', 'yellow');
  }
  
  // Load scenarios
  log('\n📋 Loading scenarios...', 'gray');
  const scenarios = await loadScenarios();
  log(`  Found ${scenarios.length} scenario(s)\n`, 'gray');
  
  if (scenarioFilter) {
    log(`  Filtering to: ${scenarioFilter}\n`, 'yellow');
  }
  
  // Generate narratives
  const results = [];
  let totalCost = 0;
  let totalTokens = 0;
  let totalCitations = 0;
  let totalDuration = 0;
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const scenario of scenarios) {
    const result = await generateNarrativeForScenario(scenario);
    results.push({ scenario, ...result });
    
    if (result.success) {
      successCount++;
      totalCost += result.cost;
      totalTokens += result.tokens;
      totalCitations += result.citations;
      totalDuration += result.duration;
    } else if (result.skipped) {
      skippedCount++;
    } else {
      errorCount++;
    }
  }
  
  // Summary
  log('\n' + '='.repeat(80), 'blue');
  log('SUMMARY', 'blue');
  log('='.repeat(80), 'blue');
  
  log(`\nScenarios processed: ${scenarios.length}`, 'yellow');
  log(`  ✅ Generated: ${successCount}`, 'green');
  if (skippedCount > 0) {
    log(`  ⏭️  Skipped: ${skippedCount}`, 'yellow');
  }
  if (errorCount > 0) {
    log(`  ❌ Errors: ${errorCount}`, 'red');
  }
  
  if (successCount > 0 && !dryRun) {
    log(`\nCost Summary:`, 'yellow');
    log(`  Total cost: $${totalCost.toFixed(6)}`, 'green');
    log(`  Total tokens: ${totalTokens.toLocaleString()}`, 'green');
    log(`  Total citations: ${totalCitations}`, 'green');
    log(`  Total time: ${(totalDuration / 1000).toFixed(1)}s`, 'green');
    log(`  Average cost per narrative: $${(totalCost / successCount).toFixed(6)}`, 'gray');
  }
  
  log('\nNext steps:', 'yellow');
  log('  1. Review generated narratives in src/sim/scenarios/*.narrative.json', 'gray');
  log('  2. Commit narrative files to repository', 'gray');
  log('  3. Update workspace.js to load pre-generated narratives', 'gray');
  
  if (dryRun) {
    log('\nTo generate for real:', 'yellow');
    log('  node scripts/generate-narratives.mjs', 'gray');
  }
  
  log('');
}

// Run
main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});

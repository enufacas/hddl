/**
 * Test script to measure scenario generation speed with different parameters
 * 
 * Tests different combinations of temperature, topP, and maxOutputTokens
 * to find the fastest configuration that still produces valid scenarios.
 * 
 * Usage: node test-generation-speed.mjs
 */

import { generateScenario } from './scenario-generator.mjs';
import { VertexAI } from '@google-cloud/vertexai';

// Test configurations to try
const configurations = [
  // Current production settings
  { name: 'Current (0.7 temp, 0.9 topP)', temperature: 0.7, topP: 0.9, maxOutputTokens: 16384 },
  
  // Lower temperature = faster, more deterministic
  { name: 'Low temp (0.3 temp, 0.9 topP)', temperature: 0.3, topP: 0.9, maxOutputTokens: 16384 },
  { name: 'Very low temp (0.1 temp, 0.9 topP)', temperature: 0.1, topP: 0.9, maxOutputTokens: 16384 },
  
  // Lower topP = more focused sampling
  { name: 'Low topP (0.7 temp, 0.7 topP)', temperature: 0.7, topP: 0.7, maxOutputTokens: 16384 },
  { name: 'Very low topP (0.7 temp, 0.5 topP)', temperature: 0.7, topP: 0.5, maxOutputTokens: 16384 },
  
  // Combined optimizations
  { name: 'Both low (0.3 temp, 0.7 topP)', temperature: 0.3, topP: 0.7, maxOutputTokens: 16384 },
  
  // Lower max tokens (risky - may truncate)
  { name: 'Lower tokens (0.7 temp, 0.9 topP, 12k)', temperature: 0.7, topP: 0.9, maxOutputTokens: 12288 },
];

// Simple test prompt
const testPrompt = "Create a scenario for a pizza delivery service managing customer orders and delivery routes";

// Store original generateWithGemini function
let originalGenerateWithGemini;

/**
 * Patch the scenario-generator to use test configuration
 */
async function patchGeneratorWithConfig(config) {
  const module = await import('./scenario-generator.mjs');
  
  // We need to override the generateWithGemini function
  // Since we can't directly patch the imported function, we'll use a workaround
  // by modifying the module's behavior through environment variables
  
  return {
    temperature: config.temperature,
    topP: config.topP,
    maxOutputTokens: config.maxOutputTokens
  };
}

/**
 * Run a single test with given configuration
 */
async function runTest(config) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${config.name}`);
  console.log(`  temperature: ${config.temperature}`);
  console.log(`  topP: ${config.topP}`);
  console.log(`  maxOutputTokens: ${config.maxOutputTokens}`);
  console.log(`${'='.repeat(80)}`);
  
  // Temporarily override generation config
  const project = process.env.GOOGLE_CLOUD_PROJECT || 'hddl-narrative-gen';
  const vertexAI = new VertexAI({ 
    project, 
    location: 'global',
    apiEndpoint: 'aiplatform.googleapis.com'
  });
  
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      maxOutputTokens: config.maxOutputTokens,
      temperature: config.temperature,
      topP: config.topP,
    },
  });
  
  const startTime = Date.now();
  
  try {
    // Note: This test bypasses generateScenario to directly test the model
    // We'll just generate a simple prompt to measure pure model speed
    const simplePrompt = `Generate a simple JSON object with: title (string), description (string), count (number 1-10).
Respond with only JSON, no markdown.`;
    
    const result = await model.generateContent(simplePrompt);
    const duration = (Date.now() - startTime) / 1000;
    
    const text = result.response.candidates[0].content.parts[0].text;
    const finishReason = result.response.candidates[0].finishReason;
    const usage = result.response.usageMetadata || {};
    
    const tokensIn = usage.promptTokenCount || 0;
    const tokensOut = usage.candidatesTokenCount || 0;
    const inputCost = (tokensIn * 0.50 / 1_000_000);
    const outputCost = (tokensOut * 3.00 / 1_000_000);
    const totalCost = inputCost + outputCost;
    
    console.log(`✓ Success`);
    console.log(`  Duration: ${duration.toFixed(2)}s`);
    console.log(`  Tokens: ${tokensIn} in / ${tokensOut} out`);
    console.log(`  Cost: $${totalCost.toFixed(6)}`);
    console.log(`  Finish reason: ${finishReason}`);
    console.log(`  Output length: ${text.length} chars`);
    
    return {
      success: true,
      duration,
      tokensIn,
      tokensOut,
      cost: totalCost,
      finishReason,
      outputLength: text.length
    };
    
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    console.log(`✗ Failed: ${error.message}`);
    console.log(`  Duration: ${duration.toFixed(2)}s`);
    
    return {
      success: false,
      duration,
      error: error.message
    };
  }
}

/**
 * Run full scenario generation test
 */
async function runFullScenarioTest(config) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`FULL SCENARIO TEST: ${config.name}`);
  console.log(`${'='.repeat(80)}`);
  
  // We need to patch the module - this is tricky with ES modules
  // Instead, let's just time the full generation and report
  console.log(`Note: This uses current code settings. Manually edit scenario-generator.mjs to test different configs.`);
  
  const startTime = Date.now();
  
  try {
    const result = await generateScenario(testPrompt);
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`✓ Full scenario generated`);
    console.log(`  Duration: ${duration.toFixed(2)}s`);
    console.log(`  Events: ${result.scenario.events.length}`);
    console.log(`  Agents: ${result.scenario.fleets.reduce((sum, f) => sum + f.agents.length, 0)}`);
    console.log(`  Warnings: ${result.validationWarnings.length}`);
    console.log(`  Tokens: ${result.metadata.tokensIn} in / ${result.metadata.tokensOut} out`);
    console.log(`  Cost: $${result.metadata.cost}`);
    
    return {
      success: true,
      duration,
      warnings: result.validationWarnings.length,
      metadata: result.metadata
    };
    
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    console.log(`✗ Failed: ${error.message}`);
    
    return {
      success: false,
      duration,
      error: error.message
    };
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('SCENARIO GENERATION SPEED TEST');
  console.log('==============================\n');
  console.log(`Test prompt: "${testPrompt}"\n`);
  
  const results = [];
  
  // Run simple model tests for each config
  console.log('PHASE 1: Simple generation tests (not full scenarios)');
  console.log('These test pure model speed without full scenario validation\n');
  
  for (const config of configurations) {
    const result = await runTest(config);
    results.push({ config: config.name, ...result });
    
    // Wait a bit between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY - Simple Tests');
  console.log(`${'='.repeat(80)}`);
  console.log(`\n${'Config'.padEnd(40)} ${'Duration'.padEnd(12)} ${'Tokens Out'.padEnd(12)} Status`);
  console.log('-'.repeat(80));
  
  const successfulResults = results.filter(r => r.success);
  for (const result of results) {
    const status = result.success ? '✓' : '✗';
    const duration = result.duration ? `${result.duration.toFixed(2)}s` : 'N/A';
    const tokens = result.tokensOut ? `${result.tokensOut}` : 'N/A';
    console.log(`${result.config.padEnd(40)} ${duration.padEnd(12)} ${tokens.padEnd(12)} ${status}`);
  }
  
  if (successfulResults.length > 0) {
    const fastest = successfulResults.reduce((min, r) => r.duration < min.duration ? r : min);
    console.log(`\n🏆 Fastest: ${fastest.config} (${fastest.duration.toFixed(2)}s)`);
    
    const current = results.find(r => r.config.startsWith('Current'));
    if (current && fastest.config !== current.config) {
      const speedup = ((current.duration - fastest.duration) / current.duration * 100).toFixed(1);
      console.log(`   ${speedup}% faster than current settings`);
    }
  }
  
  // Full scenario test with current settings
  console.log('\n\nPHASE 2: Full scenario generation test');
  console.log('This uses the actual scenario-generator.mjs with current settings\n');
  
  await runFullScenarioTest({ name: 'Current settings' });
  
  console.log('\n\nNEXT STEPS:');
  console.log('1. Review the fastest configuration above');
  console.log('2. Edit scenario-generator.mjs with those settings');
  console.log('3. Test a full scenario generation in the UI');
  console.log('4. Verify quality is still acceptable');
}

// Run tests
main().catch(console.error);

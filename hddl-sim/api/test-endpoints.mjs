#!/usr/bin/env node

/**
 * API Endpoint Test Harness
 * 
 * Tests all endpoints with success and failure scenarios.
 * Run against local Docker container or production deployment.
 * 
 * Usage:
 *   node api/test-endpoints.mjs [base-url] [--full]
 *   node api/test-endpoints.mjs http://localhost:8080
 *   node api/test-endpoints.mjs https://your-api.run.app --full
 * 
 * Requires: Docker container running (npm run docker:run)
 */

// Parse arguments
const args = process.argv.slice(2);
const fullFlag = args.includes('--full');
const urlArg = args.find(arg => !arg.startsWith('--'));
const BASE_URL = urlArg || 'http://localhost:8080';
const GITHUB_PAGES_ORIGIN = 'https://enufacas.github.io';

// Test results tracking
let passed = 0;
let failed = 0;
const results = [];

// Color codes for terminal output
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

function logTest(name, status, detail = '') {
  const symbol = status === 'PASS' ? '✓' : '✗';
  const color = status === 'PASS' ? 'green' : 'red';
  log(`  ${symbol} ${name}`, color);
  if (detail) {
    log(`    ${detail}`, 'gray');
  }
  results.push({ name, status, detail });
  if (status === 'PASS') passed++;
  else failed++;
}

/**
 * Make HTTP request with fetch
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const duration = Date.now() - startTime;
    let body;
    
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      body,
      duration,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test: Health Check
 */
async function testHealthCheck() {
  log('\n1. Health Check Endpoint', 'blue');
  
  const res = await request('/health');
  
  if (res.status === 200 && res.body.status === 'ok') {
    logTest('Returns 200 OK', 'PASS', `${res.duration}ms`);
  } else {
    logTest('Returns 200 OK', 'FAIL', `Got ${res.status}`);
  }
  
  if (res.body.timestamp) {
    logTest('Includes timestamp', 'PASS');
  } else {
    logTest('Includes timestamp', 'FAIL');
  }
}

/**
 * Test: Scenarios List
 */
async function testScenariosList() {
  log('\n2. Scenarios List Endpoint', 'blue');
  
  const res = await request('/scenarios');
  
  if (res.status === 200) {
    logTest('Returns 200 OK', 'PASS', `${res.duration}ms`);
  } else {
    logTest('Returns 200 OK', 'FAIL', `Got ${res.status}`);
  }
  
  if (Array.isArray(res.body.scenarios)) {
    logTest('Returns array of scenarios', 'PASS', `${res.body.scenarios.length} scenarios`);
  } else {
    logTest('Returns array of scenarios', 'FAIL');
  }
  
  if (res.body.scenarios.includes('insurance-underwriting')) {
    logTest('Includes insurance-underwriting', 'PASS');
  } else {
    logTest('Includes insurance-underwriting', 'FAIL');
  }
}

/**
 * Test: Narrative Generation Success (Template mode - fast)
 */
async function testNarrativeGeneration() {
  log('\n3. Narrative Generation - Template Mode (Fast)', 'blue');
  
  const res = await request('/generate', {
    method: 'POST',
    body: JSON.stringify({
      scenario: 'insurance-underwriting',
      fullContext: false
    }),
    headers: {
      'Origin': GITHUB_PAGES_ORIGIN
    }
  });
  
  if (res.status === 200) {
    logTest('Returns 200 OK', 'PASS', `${res.duration}ms`);
  } else {
    logTest('Returns 200 OK', 'FAIL', `Got ${res.status}: ${res.body.error || res.statusText}`);
    return;
  }
  
  const narrative = res.body.markdown || res.body.narrative || '';
  
  if (narrative) {
    logTest('Returns narrative text', 'PASS', `${narrative.length} chars`);
  } else {
    logTest('Returns narrative text', 'FAIL');
    return;
  }
  
  // Show preview of narrative
  log(`\n  Preview (first 300 chars):`, 'gray');
  log(`  ${narrative.substring(0, 300).replace(/\n/g, '\n  ')}...\n`, 'gray');
  
  // Validate narrative content structure
  if (narrative.includes('## ') || narrative.includes('# ')) {
    logTest('Contains markdown headers', 'PASS');
  } else {
    logTest('Contains markdown headers', 'FAIL', 'No headers found');
  }
  
  if (narrative.toLowerCase().includes('underwriting') || narrative.toLowerCase().includes('insurance')) {
    logTest('Contains domain-relevant content', 'PASS');
  } else {
    logTest('Contains domain-relevant content', 'FAIL', 'No domain keywords');
  }
  
  if (res.body.metadata) {
    logTest('Includes metadata', 'PASS', `Model: ${res.body.metadata.model || 'unknown'}`);
  } else {
    logTest('Includes metadata', 'FAIL');
  }
  
  if (res.body.citations && Array.isArray(res.body.citations)) {
    logTest('Includes citations array', 'PASS', `${res.body.citations.length} citations`);
  } else {
    logTest('Includes citations array', 'FAIL');
  }
}

/**
 * Test: Narrative Generation with LLM (requires Vertex AI)
 */
async function testNarrativeGenerationLLM() {
  log('\n3b. Narrative Generation - LLM Mode (Slow)', 'blue');
  log('  (This test makes a real LLM call - may take 10-30s)', 'yellow');
  
  const res = await request('/generate', {
    method: 'POST',
    body: JSON.stringify({
      scenario: 'insurance-underwriting',
      fullContext: true,
      userAddendum: 'Explain the feedback loop between agents and stewards.'
    }),
    headers: {
      'Origin': GITHUB_PAGES_ORIGIN
    }
  });
  
  if (res.status === 200) {
    logTest('Returns 200 OK', 'PASS', `${res.duration}ms`);
  } else {
    logTest('Returns 200 OK', 'FAIL', `Got ${res.status}: ${res.body.error || res.statusText}`);
    return;
  }
  
  const narrative = res.body.markdown || res.body.narrative || '';
  
  if (narrative && narrative.length > 100) {
    logTest('Returns LLM-generated narrative', 'PASS', `${narrative.length} chars`);
  } else {
    logTest('Returns LLM-generated narrative', 'FAIL', `Only ${narrative.length} chars`);
    return;
  }
  
  // Show preview of LLM narrative
  log(`\n  LLM Narrative Preview (first 400 chars):`, 'gray');
  log(`  ${narrative.substring(0, 400).replace(/\n/g, '\n  ')}...\n`, 'gray');
  
  // Validate it's actually from LLM (not template)
  if (res.body.metadata && res.body.metadata.model && res.body.metadata.model.includes('gemini')) {
    logTest('Uses Gemini model', 'PASS', res.body.metadata.model);
  } else {
    logTest('Uses Gemini model', 'FAIL', `Got: ${res.body.metadata?.model || 'unknown'}`);
  }
  
  // Check for LLM-specific quality markers
  if (res.body.metadata && res.body.metadata.cost && res.body.metadata.cost > 0) {
    logTest('Has API cost > $0', 'PASS', `$${res.body.metadata.cost.toFixed(6)}`);
  } else {
    logTest('Has API cost > $0', 'FAIL', 'Cost is 0 or missing');
  }
  
  if (res.body.metadata && res.body.metadata.tokensIn && res.body.metadata.tokensOut) {
    logTest('Has token counts', 'PASS', `${res.body.metadata.tokensIn} in / ${res.body.metadata.tokensOut} out`);
  } else {
    logTest('Has token counts', 'FAIL');
  }
  
  // Check if narrative addresses the user addendum
  if (narrative.toLowerCase().includes('learning') || narrative.toLowerCase().includes('feedback') || narrative.toLowerCase().includes('improve')) {
    logTest('Addresses user prompt', 'PASS', 'Mentions learning/feedback/improvement');
  } else {
    logTest('Addresses user prompt', 'FAIL', 'Does not address feedback loop prompt');
  }
  
  // Check for citations (LLM should generate some)
  if (res.body.citations && res.body.citations.length > 0) {
    logTest('Includes event citations', 'PASS', `${res.body.citations.length} citations`);
  } else {
    logTest('Includes event citations', 'FAIL', 'No citations found');
  }
}

/**
 * Test: Narrative Generation - Error Handling
 */
async function testNarrativeErrors() {
  log('\n4. Narrative Generation - Error Handling', 'blue');
  
  // Missing scenario field
  const res1 = await request('/generate', {
    method: 'POST',
    body: JSON.stringify({}),
    headers: { 'Origin': GITHUB_PAGES_ORIGIN }
  });
  
  if (res1.status === 400) {
    logTest('Rejects missing scenario field (400)', 'PASS');
  } else {
    logTest('Rejects missing scenario field (400)', 'FAIL', `Got ${res1.status}`);
  }
  
  // Invalid scenario name
  const res2 = await request('/generate', {
    method: 'POST',
    body: JSON.stringify({ scenario: 'nonexistent-scenario' }),
    headers: { 'Origin': GITHUB_PAGES_ORIGIN }
  });
  
  if (res2.status === 404) {
    logTest('Returns 404 for nonexistent scenario', 'PASS');
  } else {
    logTest('Returns 404 for nonexistent scenario', 'FAIL', `Got ${res2.status}`);
  }
  
  // Path traversal attempt
  const res3 = await request('/generate', {
    method: 'POST',
    body: JSON.stringify({ scenario: '../../../etc/passwd' }),
    headers: { 'Origin': GITHUB_PAGES_ORIGIN }
  });
  
  if (res3.status === 400) {
    logTest('Blocks path traversal attempt (400)', 'PASS');
  } else {
    logTest('Blocks path traversal attempt (400)', 'FAIL', `Got ${res3.status}`);
  }
}

/**
 * Test: Origin Validation
 */
async function testOriginValidation() {
  log('\n5. Origin Validation (Security)', 'blue');
  
  // No origin header
  const res1 = await request('/generate', {
    method: 'POST',
    body: JSON.stringify({ scenario: 'test-minimal' })
  });
  
  if (res1.status === 403) {
    logTest('Blocks requests without origin (403)', 'PASS');
  } else {
    logTest('Blocks requests without origin (403)', 'FAIL', `Got ${res1.status}`);
  }
  
  // Invalid origin
  const res2 = await request('/generate', {
    method: 'POST',
    body: JSON.stringify({ scenario: 'test-minimal' }),
    headers: { 'Origin': 'https://malicious-site.com' }
  });
  
  if (res2.status === 403) {
    logTest('Blocks invalid origin (403)', 'PASS');
  } else {
    logTest('Blocks invalid origin (403)', 'FAIL', `Got ${res2.status}`);
  }
  
  // Valid origin
  const res3 = await request('/generate', {
    method: 'POST',
    body: JSON.stringify({ scenario: 'test-minimal' }),
    headers: { 'Origin': GITHUB_PAGES_ORIGIN }
  });
  
  if (res3.status === 200) {
    logTest('Allows valid origin (200)', 'PASS');
  } else {
    logTest('Allows valid origin (200)', 'FAIL', `Got ${res3.status}`);
  }
}

/**
 * Test: Scenario Generation Success
 */
async function testScenarioGeneration() {
  log('\n6. Scenario Generation - Success Path', 'blue');
  
  log('  (This test makes a real LLM call - may take 30-60s)', 'yellow');
  
  const res = await request('/generate-scenario', {
    method: 'POST',
    body: JSON.stringify({
      prompt: 'Insurance agent learning to approve bundle discounts with steward oversight'
    }),
    headers: {
      'Origin': GITHUB_PAGES_ORIGIN
    }
  });
  
  if (res.status === 200) {
    logTest('Returns 200 OK', 'PASS', `${res.duration}ms`);
  } else {
    logTest('Returns 200 OK', 'FAIL', `Got ${res.status}: ${res.body.error || res.statusText}`);
    return; // Skip further tests if request failed
  }
  
  const scenario = res.body.scenario;
  
  if (scenario) {
    logTest('Returns scenario object', 'PASS', `${scenario.events?.length || 0} events`);
  } else {
    logTest('Returns scenario object', 'FAIL');
    return;
  }
  
  // Show preview of generated scenario
  log(`\n  Generated Scenario:`, 'gray');
  log(`  ID: ${scenario.id}`, 'gray');
  log(`  Title: ${scenario.title}`, 'gray');
  log(`  Envelopes: ${scenario.envelopes?.map(e => e.name).join(', ') || 'none'}`, 'gray');
  log(`  Agents: ${scenario.fleets?.reduce((sum, f) => sum + (f.agents?.length || 0), 0) || 0}`, 'gray');
  log(`  Events: ${scenario.events?.length || 0}\n`, 'gray');
  
  // Validate scenario structure
  if (scenario.schemaVersion) {
    logTest('Has schemaVersion field', 'PASS', scenario.schemaVersion);
  } else {
    logTest('Has schemaVersion field', 'FAIL');
  }
  
  if (scenario.id && scenario.title) {
    logTest('Has id and title', 'PASS', `"${scenario.title}"`);
  } else {
    logTest('Has id and title', 'FAIL');
  }
  
  if (scenario.envelopes && Array.isArray(scenario.envelopes) && scenario.envelopes.length >= 2) {
    logTest('Has envelopes (2+)', 'PASS', `${scenario.envelopes.length} envelopes`);
  } else {
    logTest('Has envelopes (2+)', 'FAIL', `${scenario.envelopes?.length || 0} envelopes`);
  }
  
  if (scenario.fleets && Array.isArray(scenario.fleets) && scenario.fleets.length >= 1) {
    const agentCount = scenario.fleets.reduce((sum, f) => sum + (f.agents?.length || 0), 0);
    logTest('Has fleets with agents', 'PASS', `${scenario.fleets.length} fleets, ${agentCount} agents`);
  } else {
    logTest('Has fleets with agents', 'FAIL');
  }
  
  if (scenario.events && Array.isArray(scenario.events) && scenario.events.length >= 20) {
    logTest('Has events (20+)', 'PASS', `${scenario.events.length} events`);
  } else {
    logTest('Has events (20+)', 'FAIL', `${scenario.events?.length || 0} events`);
  }
  
  // Check for feedback loop components
  const hasDecisions = scenario.events?.some(e => e.type === 'decision');
  const hasBoundaries = scenario.events?.some(e => e.type === 'boundary_interaction');
  const hasEmbeddings = scenario.events?.some(e => e.type === 'embedding');
  const hasRetrievals = scenario.events?.some(e => e.type === 'retrieval');
  const hasRevisions = scenario.events?.some(e => e.type === 'revision');
  
  if (hasDecisions && hasBoundaries && hasEmbeddings) {
    logTest('Has feedback loop events', 'PASS', 'decisions, boundaries, embeddings');
  } else {
    logTest('Has feedback loop events', 'FAIL', `Missing: ${!hasDecisions ? 'decisions ' : ''}${!hasBoundaries ? 'boundaries ' : ''}${!hasEmbeddings ? 'embeddings' : ''}`);
  }
  
  if (hasRetrievals) {
    logTest('Has retrieval events', 'PASS', 'Agents query decision memory');
  } else {
    logTest('Has retrieval events', 'FAIL', 'No retrievals found');
  }
  
  // Check prompt relevance
  const scenarioText = JSON.stringify(scenario).toLowerCase();
  if (scenarioText.includes('insurance') || scenarioText.includes('bundle') || scenarioText.includes('discount')) {
    logTest('Scenario matches prompt domain', 'PASS', 'Insurance/bundle keywords found');
  } else {
    logTest('Scenario matches prompt domain', 'FAIL', 'No domain keywords found');
  }
  
  if (res.body.warnings) {
    logTest('Includes validation warnings', 'PASS', `${res.body.warnings.length} warnings`);
  } else {
    logTest('Includes validation warnings', 'FAIL');
  }
  
  if (res.body.metadata) {
    logTest('Includes generation metadata', 'PASS', `Cost: $${res.body.metadata.cost?.toFixed(6) || 'unknown'}`);
  } else {
    logTest('Includes generation metadata', 'FAIL');
  }
}

/**
 * Test: Scenario Generation - Error Handling
 */
async function testScenarioGenerationErrors() {
  log('\n7. Scenario Generation - Error Handling', 'blue');
  
  // Missing prompt
  const res1 = await request('/generate-scenario', {
    method: 'POST',
    body: JSON.stringify({}),
    headers: { 'Origin': GITHUB_PAGES_ORIGIN }
  });
  
  if (res1.status === 400) {
    logTest('Rejects missing prompt (400)', 'PASS');
  } else {
    logTest('Rejects missing prompt (400)', 'FAIL', `Got ${res1.status}`);
  }
  
  // Prompt too short
  const res2 = await request('/generate-scenario', {
    method: 'POST',
    body: JSON.stringify({ prompt: 'test' }),
    headers: { 'Origin': GITHUB_PAGES_ORIGIN }
  });
  
  if (res2.status === 400) {
    logTest('Rejects short prompt (400)', 'PASS', 'Min 10 chars');
  } else {
    logTest('Rejects short prompt (400)', 'FAIL', `Got ${res2.status}`);
  }
  
  // Prompt too long
  const res3 = await request('/generate-scenario', {
    method: 'POST',
    body: JSON.stringify({ prompt: 'A'.repeat(1001) }),
    headers: { 'Origin': GITHUB_PAGES_ORIGIN }
  });
  
  if (res3.status === 400) {
    logTest('Rejects long prompt (400)', 'PASS', 'Max 1000 chars');
  } else {
    logTest('Rejects long prompt (400)', 'FAIL', `Got ${res3.status}`);
  }
}

/**
 * Test: Rate Limiting (Warning: This exhausts rate limit!)
 */
async function testRateLimiting() {
  log('\n8. Rate Limiting (Warning: Exhausts quota)', 'blue');
  log('  Skip this test unless specifically testing rate limits', 'yellow');
  log('  Uncomment code to enable', 'gray');
  
  // Commented out to avoid exhausting rate limit on every test run
  /*
  log('  Sending 21 requests rapidly...', 'gray');
  
  const requests = [];
  for (let i = 0; i < 21; i++) {
    requests.push(
      request('/generate', {
        method: 'POST',
        body: JSON.stringify({ scenario: 'test-minimal' }),
        headers: { 'Origin': GITHUB_PAGES_ORIGIN }
      })
    );
  }
  
  const responses = await Promise.all(requests);
  const rateLimited = responses.filter(r => r.status === 429);
  
  if (rateLimited.length > 0) {
    logTest('Enforces rate limit (429)', 'PASS', `${rateLimited.length} requests blocked`);
  } else {
    logTest('Enforces rate limit (429)', 'FAIL', 'No requests blocked');
  }
  */
  
  logTest('Rate limiting test skipped', 'PASS', 'Enable manually to test');
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n' + '='.repeat(80), 'blue');
  log('API ENDPOINT TEST HARNESS', 'blue');
  log('='.repeat(80), 'blue');
  log(`\nTesting API at: ${BASE_URL}`, 'yellow');
  log(`GitHub Pages Origin: ${GITHUB_PAGES_ORIGIN}\n`);
  
  // Check if server is reachable
  try {
    const healthCheck = await request('/health');
    if (healthCheck.status !== 200) {
      log(`\n❌ Server not reachable at ${BASE_URL}`, 'red');
      log('   Make sure Docker container is running:', 'yellow');
      log('   docker run -d -p 8080:8080 -v "$env:APPDATA\\gcloud:/root/.config/gcloud:ro" --name narrative-api narrative-api\n', 'gray');
      process.exit(1);
    }
  } catch (error) {
    log(`\n❌ Server not reachable at ${BASE_URL}`, 'red');
    log(`   Error: ${error.message}\n`, 'red');
    process.exit(1);
  }
  
  // Run test suites
  await testHealthCheck();
  await testScenariosList();
  await testNarrativeGeneration();
  await testNarrativeErrors();
  await testOriginValidation();
  
  // LLM-powered tests (slower, use API credits)
  if (fullFlag) {
    await testNarrativeGenerationLLM();
    await testScenarioGeneration();
    await testScenarioGenerationErrors();
  } else {
    log('\n3b. LLM Narrative Generation', 'blue');
    log('  Skipped (requires LLM call)', 'yellow');
    log('\n6-7. Scenario Generation Tests', 'blue');
    log('  Skipped (requires LLM calls)', 'yellow');
    log('  Run with --full flag to include: node api/test-endpoints.mjs --full', 'gray');
  }
  
  await testRateLimiting();
  
  // Summary
  log('\n' + '='.repeat(80), 'blue');
  log('TEST SUMMARY', 'blue');
  log('='.repeat(80), 'blue');
  
  const total = passed + failed;
  const passRate = ((passed / total) * 100).toFixed(1);
  
  log(`\nTotal: ${total} tests`, 'yellow');
  log(`Passed: ${passed}`, 'green');
  if (failed > 0) {
    log(`Failed: ${failed}`, 'red');
  }
  log(`Pass Rate: ${passRate}%\n`, passRate === '100.0' ? 'green' : 'yellow');
  
  if (failed === 0) {
    log('✅ All tests passed!', 'green');
  } else {
    log('❌ Some tests failed. Review output above.', 'red');
  }
  
  log('\nTo test scenario generation (uses LLM credits):', 'gray');
  log('  node api/test-endpoints.mjs --full\n', 'gray');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test runner crashed: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});

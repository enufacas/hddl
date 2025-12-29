#!/usr/bin/env node

/**
 * COGNITIVE LOAD METRICS
 * 
 * Analyzes scenario JSON to measure information design complexity:
 * - Element counts (agents, envelopes, concurrent events)
 * - Pattern density (feedback loops, escalations, revisions)
 * - Interaction complexity (hover targets, click paths)
 * 
 * Does NOT measure rendering performance (see performance-metrics.mjs)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line args
const scenarioName = process.argv[2] || 'insurance-underwriting';
const scenarioPath = join(__dirname, '..', 'src', 'sim', 'scenarios', `${scenarioName}.scenario.json`);

let scenario;
try {
  scenario = JSON.parse(readFileSync(scenarioPath, 'utf-8'));
} catch (err) {
  console.error(`❌ Could not load scenario: ${scenarioPath}`);
  console.error(err.message);
  process.exit(1);
}

console.log(`\n🔬 COGNITIVE LOAD METRICS: ${scenarioName.toUpperCase()}`);
console.log('═'.repeat(70));

// ============================================================================
// INFORMATION DENSITY - How many elements compete for attention?
// ============================================================================

console.log('\n📊 INFORMATION DENSITY');
console.log('─'.repeat(70));

const agents = new Set();
const stewards = new Set();
const envelopes = new Set();

scenario.events.forEach(evt => {
  if (evt.agentId) agents.add(evt.agentId);
  if (evt.actorName && evt.actorRole === 'steward') stewards.add(evt.actorName);
  if (evt.envelopeId) envelopes.add(evt.envelopeId);
});

console.log(`  Agents in scenario:           ${agents.size}`);
console.log(`  Stewards in scenario:         ${stewards.size}`);
console.log(`  Envelopes in scenario:        ${envelopes.size}`);
console.log(`  Total events:                 ${scenario.events.length}`);

// Peak concurrent activity (events within 1-hour window)
let maxConcurrent = 0;
let maxConcurrentHour = 0;
const sortedEvents = [...scenario.events].sort((a, b) => a.hour - b.hour);

for (let i = 0; i < sortedEvents.length; i++) {
  const windowStart = sortedEvents[i].hour;
  const windowEnd = windowStart + 1.0;
  const eventsInWindow = sortedEvents.filter(e => e.hour >= windowStart && e.hour < windowEnd);
  
  if (eventsInWindow.length > maxConcurrent) {
    maxConcurrent = eventsInWindow.length;
    maxConcurrentHour = windowStart;
  }
}

console.log(`  Peak concurrent (1h window):  ${maxConcurrent} events @ hour ${maxConcurrentHour.toFixed(1)}`);

// Estimate visible elements by detail level
// FULL: All agents + stewards + envelopes + event labels
// STANDARD: Agents + stewards + envelopes (no event labels)
// COMPACT: Stewards + envelopes only
// MINIMAL: Envelopes only

const elementsAtFull = agents.size + stewards.size + envelopes.size + scenario.events.length;
const elementsAtStandard = agents.size + stewards.size + envelopes.size;
const elementsAtCompact = stewards.size + envelopes.size;
const elementsAtMinimal = envelopes.size;

console.log(`\n  Estimated visible elements by detail level:`);
console.log(`    FULL:       ~${elementsAtFull} (all labels)`);
console.log(`    STANDARD:   ~${elementsAtStandard} (actors + envelopes)`);
console.log(`    COMPACT:    ~${elementsAtCompact} (stewards + envelopes)`);
console.log(`    MINIMAL:    ~${elementsAtMinimal} (envelopes only)`);

// Threshold assessment
const fullAssessment = elementsAtFull > 100 ? '⚠️  HIGH' : 
                       elementsAtFull > 50 ? '✅ GOOD (shows scale)' :
                       '✅ LIGHT (may not demonstrate complexity)';

console.log(`\n  Assessment (FULL mode): ${fullAssessment}`);

// ============================================================================
// PATTERN COMPLEXITY - Can users trace feedback loops?
// ============================================================================

console.log('\n\n🔍 PATTERN COMPLEXITY');
console.log('─'.repeat(70));

// Count feedback loop types
const boundaries = scenario.events.filter(e => e.type === 'boundary_interaction');
const decisions = scenario.events.filter(e => e.type === 'decision');
const revisions = scenario.events.filter(e => e.type === 'revision');
const embeddings = scenario.events.filter(e => e.type === 'embedding');
const retrievals = scenario.events.filter(e => e.type === 'retrieval');

console.log(`  Boundary interactions:        ${boundaries.length}`);
console.log(`  Decisions (allowed/denied):   ${decisions.length}`);
console.log(`  Revisions:                    ${revisions.length}`);
console.log(`  Embeddings:                   ${embeddings.length}`);
console.log(`  Retrievals:                   ${retrievals.length}`);

// Trace complete feedback cycles (boundary → decision → revision → embedding)
let completeCycles = 0;
boundaries.forEach(boundary => {
  const resolution = scenario.events.find(e => 
    (e.type === 'decision' || e.type === 'revision') && 
    e.resolvesEventId === boundary.eventId
  );
  
  if (resolution) {
    const embedding = embeddings.find(e => e.sourceEventId === boundary.eventId);
    if (embedding) {
      completeCycles++;
    }
  }
});

console.log(`\n  Complete feedback cycles:     ${completeCycles}/${boundaries.length} boundaries`);

const cycleRatio = boundaries.length > 0 ? (completeCycles / boundaries.length * 100).toFixed(0) : 0;
const cycleAssessment = cycleRatio >= 80 ? '✅ EXCELLENT (clear learning patterns)' :
                        cycleRatio >= 50 ? '✅ GOOD (most patterns visible)' :
                        '⚠️  SPARSE (patterns harder to trace)';

console.log(`  Cycle visibility:             ${cycleRatio}% - ${cycleAssessment}`);

// ============================================================================
// CONCURRENT PARTICLE LOAD - Animation complexity at peak
// ============================================================================

console.log('\n\n🎬 CONCURRENT PARTICLE LOAD');
console.log('─'.repeat(70));

// Estimate particles visible at various timeline positions
// Particles: signals, decisions, boundaries, revisions (not embeddings/retrievals)
const particleEvents = scenario.events.filter(e => 
  ['signal', 'decision', 'boundary_interaction', 'revision'].includes(e.type)
);

// Find peak particle hour (most particles in flight simultaneously)
let maxParticles = 0;
let maxParticleHour = 0;

for (let hour = 0; hour <= Math.max(...scenario.events.map(e => e.hour)); hour += 0.5) {
  // Count particles that would be visible at this hour
  // Signal: visible for ~0.5h after emission
  // Decision: visible for ~0.5h pulse
  // Boundary: visible until resolved (can be hours)
  // Revision: visible for ~0.5h pulse
  
  const visibleAt = particleEvents.filter(evt => {
    if (evt.type === 'boundary_interaction') {
      // Boundary orbits until resolved
      const resolution = scenario.events.find(e => e.resolvesEventId === evt.eventId);
      const resolvedAt = resolution ? resolution.hour : evt.hour + 24; // assume 24h if unresolved
      return evt.hour <= hour && hour <= resolvedAt;
    } else {
      // Other particles visible for ~0.5 hours
      return evt.hour <= hour && hour <= evt.hour + 0.5;
    }
  }).length;
  
  if (visibleAt > maxParticles) {
    maxParticles = visibleAt;
    maxParticleHour = hour;
  }
}

console.log(`  Peak concurrent particles:    ${maxParticles} @ hour ${maxParticleHour.toFixed(1)}`);

const particleAssessment = maxParticles > 15 ? '⚠️  VERY BUSY (may overlap)' :
                          maxParticles > 8 ? '✅ ACTIVE (demonstrates scale)' :
                          '✅ MODERATE (easy to track)';

console.log(`  Assessment:                   ${particleAssessment}`);

// ============================================================================
// INTERACTION COMPLEXITY - How many things can users click/hover?
// ============================================================================

console.log('\n\n👆 INTERACTION COMPLEXITY');
console.log('─'.repeat(70));

// Interactive targets: agents, stewards, envelopes, events, particles
const hoverTargets = agents.size + stewards.size + envelopes.size + scenario.events.length;
const clickTargets = scenario.events.length; // Each event can be clicked for details

console.log(`  Hover targets (tooltips):     ${hoverTargets}`);
console.log(`  Click targets (details):      ${clickTargets}`);

// Filter UI complexity (how many filter options?)
const filterDimensions = {
  stewards: stewards.size,
  envelopes: envelopes.size,
  agents: agents.size,
  eventTypes: new Set(scenario.events.map(e => e.type)).size
};

console.log(`\n  Filter dimensions:`);
console.log(`    By steward:                 ${filterDimensions.stewards} options`);
console.log(`    By envelope:                ${filterDimensions.envelopes} options`);
console.log(`    By agent:                   ${filterDimensions.agents} options`);
console.log(`    By event type:              ${filterDimensions.eventTypes} options`);

// ============================================================================
// SUMMARY ASSESSMENT
// ============================================================================

console.log('\n\n📋 SUMMARY ASSESSMENT');
console.log('═'.repeat(70));

const metrics = {
  'Information Density (FULL)': {
    value: elementsAtFull,
    target: '30-50 (demonstrate scale)',
    status: elementsAtFull >= 30 && elementsAtFull <= 100 ? '✅ GOOD' : '⚠️  CHECK'
  },
  'Concurrent Particles (peak)': {
    value: maxParticles,
    target: '5-10 (show activity)',
    status: maxParticles >= 3 && maxParticles <= 15 ? '✅ GOOD' : '⚠️  CHECK'
  },
  'Feedback Cycle Visibility': {
    value: `${cycleRatio}%`,
    target: '> 80% (clear patterns)',
    status: cycleRatio >= 80 ? '✅ EXCELLENT' : cycleRatio >= 50 ? '✅ GOOD' : '⚠️  SPARSE'
  },
  'Hover Target Count': {
    value: hoverTargets,
    target: '< 200 (manageable)',
    status: hoverTargets < 200 ? '✅ GOOD' : '⚠️  MANY'
  }
};

console.log('\nMetric                              | Value    | Target              | Status');
console.log('─'.repeat(85));

Object.entries(metrics).forEach(([name, data]) => {
  const namePad = name.padEnd(35);
  const valuePad = String(data.value).padEnd(8);
  const targetPad = data.target.padEnd(19);
  console.log(`${namePad} | ${valuePad} | ${targetPad} | ${data.status}`);
});

console.log('\n' + '═'.repeat(70));
console.log('✅ Cognitive load metrics complete');
console.log('💡 For rendering performance, run: npm run performance-metrics');
console.log('═'.repeat(70) + '\n');

#!/usr/bin/env node
/**
 * Generic HDDL Scenario Analysis Tool
 * 
 * Analyzes any HDDL scenario for:
 * - Event sequencing and timing
 * - Feedback loop completeness
 * - Actor relationships and flows
 * - Particle flow patterns
 * - Potential logical inconsistencies
 * 
 * Usage:
 *   node analysis/scenario-analysis.mjs [scenario-name]
 *   node analysis/scenario-analysis.mjs insurance-underwriting
 *   node analysis/scenario-analysis.mjs default
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Get scenario name from command line args, default to insurance-underwriting
const scenarioName = process.argv[2] || 'insurance-underwriting'
const scenarioPath = path.join(__dirname, `../src/sim/scenarios/${scenarioName}.scenario.json`)

// Load scenario
let scenario
try {
  const raw = await fs.readFile(scenarioPath, 'utf8')
  scenario = JSON.parse(raw)
} catch (error) {
  console.error(`\n❌ Error loading scenario: ${scenarioName}`)
  console.error(`   Path: ${scenarioPath}`)
  console.error(`   ${error.message}\n`)
  process.exit(1)
}

console.log('\n═══════════════════════════════════════════════════════════')
console.log(`HDDL SCENARIO ANALYSIS: ${scenarioName.toUpperCase()}`)
console.log('═══════════════════════════════════════════════════════════\n')

// ============================================================================
// PART 1: SCENARIO STRUCTURE
// ============================================================================

console.log('📊 SCENARIO STRUCTURE')
console.log('─'.repeat(60))
console.log(`Title: ${scenario.title}`)
console.log(`Duration: ${scenario.durationHours} hours`)
console.log(`Total Events: ${scenario.events.length}`)
console.log(`Envelopes: ${scenario.envelopes.length} (unique: ${new Set(scenario.envelopes.map(e => e.envelopeId)).size})`)
console.log(`Steward Roles: ${scenario.fleets.length}`)
console.log(`Total Agents: ${scenario.fleets.reduce((sum, f) => sum + f.agents.length, 0)}\n`)

// ============================================================================
// PART 2: EVENT TYPE DISTRIBUTION
// ============================================================================

console.log('📈 EVENT TYPE DISTRIBUTION')
console.log('─'.repeat(60))

const eventTypes = scenario.events.reduce((acc, e) => {
  acc[e.type] = (acc[e.type] || 0) + 1
  return acc
}, {})

Object.entries(eventTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
  const pct = ((count / scenario.events.length) * 100).toFixed(1)
  console.log(`  ${type.padEnd(25)} ${count.toString().padStart(3)} (${pct}%)`)
})
console.log()

// ============================================================================
// PART 3: TEMPORAL ANALYSIS
// ============================================================================

console.log('⏰ TEMPORAL ANALYSIS')
console.log('─'.repeat(60))

const events = scenario.events
  .filter(e => e.hour !== undefined)
  .sort((a, b) => a.hour - b.hour)

const firstEvent = events[0]
const lastEvent = events[events.length - 1]
const eventsWithNegativeHour = events.filter(e => e.hour < 0)
const eventsInMainWindow = events.filter(e => e.hour >= 0 && e.hour <= scenario.durationHours)

console.log(`First Event: Hour ${firstEvent.hour} (${firstEvent.type})`)
console.log(`Last Event: Hour ${lastEvent.hour} (${lastEvent.type})`)
console.log(`Historical Baseline: ${eventsWithNegativeHour.length} events (hour < 0)`)
console.log(`Main Window: ${eventsInMainWindow.length} events (0 to ${scenario.durationHours})`)
console.log()

// Hour density
const hourBuckets = {}
events.forEach(e => {
  const bucket = Math.floor(e.hour / 12) * 12
  hourBuckets[bucket] = (hourBuckets[bucket] || 0) + 1
})

console.log('Event Density by 12-hour Window:')
Object.entries(hourBuckets).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([hour, count]) => {
  const bar = '█'.repeat(Math.floor(count / 2))
  console.log(`  ${hour.padStart(4)}-${(Number(hour) + 12).toString().padEnd(3)} ${bar} ${count}`)
})
console.log()

// ============================================================================
// PART 4: FEEDBACK LOOP ANALYSIS
// ============================================================================

console.log('🔄 FEEDBACK LOOP ANALYSIS')
console.log('─'.repeat(60))

const boundaries = events.filter(e => e.type === 'boundary_interaction')
const revisions = events.filter(e => e.type === 'revision')
const embeddings = events.filter(e => e.type === 'embedding')
const retrievals = events.filter(e => e.type === 'retrieval')

console.log(`Boundary Interactions: ${boundaries.length}`)
console.log(`Revisions: ${revisions.length}`)
console.log(`Embeddings: ${embeddings.length}`)
console.log(`Retrievals: ${retrievals.length}`)
console.log()

// Check embeddings by type
const embeddingTypes = embeddings.reduce((acc, e) => {
  acc[e.embeddingType || 'unknown'] = (acc[e.embeddingType || 'unknown'] || 0) + 1
  return acc
}, {})

console.log('Embeddings by Type:')
Object.entries(embeddingTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
  console.log(`  ${type.padEnd(25)} ${count}`)
})
console.log()

// Check boundary -> embedding coverage
console.log('Boundary Interaction → Embedding Coverage:')
const boundariesWithEmbeddings = boundaries.filter(b => {
  return embeddings.some(e => e.sourceEventId === b.eventId)
})
console.log(`  ${boundariesWithEmbeddings.length === boundaries.length ? '✅' : '❌'} ${boundariesWithEmbeddings.length}/${boundaries.length} boundaries have embeddings`)
if (boundariesWithEmbeddings.length < boundaries.length) {
  const missing = boundaries.filter(b => !embeddings.some(e => e.sourceEventId === b.eventId))
  console.log(`  ❌ Missing embeddings for:`)
  missing.forEach(b => console.log(`     - ${b.eventId} (hour ${b.hour})`))
}
console.log()

// Check revision -> embedding coverage  
console.log('Revision → Embedding Coverage:')
const revisionsWithEmbeddings = revisions.filter(r => {
  return embeddings.some(e => e.sourceEventId === r.eventId)
})
console.log(`  ${revisionsWithEmbeddings.length === revisions.length ? '✅' : '❌'} ${revisionsWithEmbeddings.length}/${revisions.length} revisions have embeddings`)
if (revisionsWithEmbeddings.length < revisions.length) {
  const missing = revisions.filter(r => !embeddings.some(e => e.sourceEventId === r.eventId))
  console.log(`  ❌ Missing embeddings for:`)
  missing.forEach(r => console.log(`     - ${r.eventId} (hour ${r.hour})`))
}
console.log()

// ============================================================================
// PART 5: COMPLETE FEEDBACK CYCLES
// ============================================================================

console.log('🎯 COMPLETE FEEDBACK CYCLES (Boundary → Decision → Revision)')
console.log('─'.repeat(60))

// Find boundaries that have complete cycles
const completeCycles = boundaries.map(boundary => {
  // Find revision that resolves this boundary
  const revision = revisions.find(r => r.resolvesEventId === boundary.eventId)
  
  // Find embedding for boundary
  const boundaryEmbedding = embeddings.find(e => e.sourceEventId === boundary.eventId)
  
  // Find embedding for revision
  const revisionEmbedding = revision ? embeddings.find(e => e.sourceEventId === revision.eventId) : null
  
  // Find retrieval before boundary (within 1 hour before)
  const retrieval = retrievals.find(r => 
    r.hour < boundary.hour && 
    (boundary.hour - r.hour) <= 1 &&
    r.actorName === boundary.actorName
  )
  
  // Find decision related to boundary
  const decision = events.find(e => 
    e.type === 'decision' &&
    e.hour > boundary.hour &&
    e.hour < (revision?.hour || Infinity) &&
    e.envelopeId === boundary.envelopeId
  )
  
  return {
    boundary,
    retrieval,
    decision,
    revision,
    boundaryEmbedding,
    revisionEmbedding,
    isComplete: !!(boundary && boundaryEmbedding && revision && revisionEmbedding)
  }
}).filter(c => c.boundary)

const complete = completeCycles.filter(c => c.isComplete)
const incomplete = completeCycles.filter(c => !c.isComplete)

console.log(`Complete Cycles: ${complete.length}/${completeCycles.length}\n`)

complete.forEach((cycle, i) => {
  console.log(`Cycle ${i + 1}: ${cycle.boundary.label}`)
  console.log(`  ⏰ Timeline:`)
  if (cycle.retrieval) console.log(`     Hour ${cycle.retrieval.hour.toFixed(2)}: Retrieval by ${cycle.retrieval.actorName}`)
  console.log(`     Hour ${cycle.boundary.hour.toFixed(2)}: Boundary (${cycle.boundary.boundary_kind}) by ${cycle.boundary.actorName}`)
  if (cycle.boundaryEmbedding) console.log(`     Hour ${cycle.boundaryEmbedding.hour.toFixed(2)}: Boundary Embedding (${cycle.boundaryEmbedding.embeddingId})`)
  if (cycle.decision) console.log(`     Hour ${cycle.decision.hour.toFixed(2)}: Decision (${cycle.decision.status}) by ${cycle.decision.actorName}`)
  if (cycle.revision) console.log(`     Hour ${cycle.revision.hour.toFixed(2)}: Revision (${cycle.revision.revisionType})`)
  if (cycle.revisionEmbedding) console.log(`     Hour ${cycle.revisionEmbedding.hour.toFixed(2)}: Revision Embedding (${cycle.revisionEmbedding.embeddingId})`)
  
  console.log(`  📊 Cycle Duration: ${((cycle.revision?.hour || cycle.boundary.hour) - cycle.boundary.hour).toFixed(2)} hours`)
  console.log(`  🎯 Resolved: ${cycle.revision?.reason || 'N/A'}`)
  console.log()
})

if (incomplete.length > 0) {
  console.log('⚠️  Incomplete Cycles:')
  incomplete.forEach(cycle => {
    console.log(`  ${cycle.boundary.label} (hour ${cycle.boundary.hour})`)
    if (!cycle.boundaryEmbedding) console.log(`    ❌ Missing boundary embedding`)
    if (!cycle.revision) console.log(`    ⚠️  No revision found`)
    if (cycle.revision && !cycle.revisionEmbedding) console.log(`    ❌ Missing revision embedding`)
  })
  console.log()
}

// ============================================================================
// PART 6: ACTOR ANALYSIS
// ============================================================================

console.log('👥 ACTOR ANALYSIS')
console.log('─'.repeat(60))

// Count events by actor
const actorEvents = events.reduce((acc, e) => {
  if (!e.actorName) return acc
  if (!acc[e.actorName]) {
    acc[e.actorName] = { total: 0, byType: {} }
  }
  acc[e.actorName].total++
  acc[e.actorName].byType[e.type] = (acc[e.actorName].byType[e.type] || 0) + 1
  return acc
}, {})

console.log('Most Active Actors:')
Object.entries(actorEvents)
  .sort((a, b) => b[1].total - a[1].total)
  .slice(0, 10)
  .forEach(([actor, data]) => {
    const types = Object.entries(data.byType)
      .map(([type, count]) => `${type}(${count})`)
      .join(', ')
    console.log(`  ${actor.padEnd(30)} ${data.total.toString().padStart(2)} events: ${types}`)
  })
console.log()

// ============================================================================
// PART 7: ENVELOPE TIMELINE
// ============================================================================

console.log('📦 ENVELOPE TIMELINE')
console.log('─'.repeat(60))

const envelopeTimeline = {}
scenario.envelopes.forEach(env => {
  const key = `${env.envelopeId}`
  if (!envelopeTimeline[key]) {
    envelopeTimeline[key] = []
  }
  envelopeTimeline[key].push({
    version: env.envelope_version,
    start: env.createdHour,
    end: env.endHour,
    name: env.name,
    ownerRole: env.ownerRole
  })
})

Object.entries(envelopeTimeline).forEach(([envId, versions]) => {
  versions.sort((a, b) => a.start - b.start)
  console.log(`${envId}: ${versions[0].name}`)
  versions.forEach(v => {
    console.log(`  v${v.version}: Hour ${v.start}-${v.end} (${v.end - v.start}h duration)`)
  })
  
  // Check for gaps
  for (let i = 1; i < versions.length; i++) {
    const gap = versions[i].start - versions[i-1].end
    if (gap > 0) {
      console.log(`    ⚠️  GAP: ${gap} hours between v${versions[i-1].version} and v${versions[i].version}`)
    } else if (gap < 0) {
      console.log(`    ⚠️  OVERLAP: ${Math.abs(gap)} hours between v${versions[i-1].version} and v${versions[i].version}`)
    }
  }
  console.log()
})

// ============================================================================
// PART 8: PARTICLE FLOW PATTERNS
// ============================================================================

console.log('🌊 PARTICLE FLOW PATTERNS')
console.log('─'.repeat(60))

// Analyze particle flows based on PARTICLE_FLOW_RULES.md
const particleFlows = {
  'signal': events.filter(e => e.type === 'signal'),
  'decision (allowed)': events.filter(e => e.type === 'decision' && (!e.status || e.status === 'allowed')),
  'decision (denied)': events.filter(e => e.type === 'decision' && e.status === 'denied'),
  'boundary_interaction': boundaries,
  'revision': revisions,
  'retrieval': retrievals
}

console.log('Expected Particle Behaviors:')
Object.entries(particleFlows).forEach(([flowType, evts]) => {
  console.log(`\n${flowType.toUpperCase()} (${evts.length} events)`)
  
  switch(flowType) {
    case 'signal':
      console.log(`  Source: External → Envelope`)
      console.log(`  Behavior: Curves down, fades immediately`)
      break
    case 'decision (allowed)':
      console.log(`  Source: Agent → Envelope`)
      console.log(`  Behavior: Curves to envelope, orbits (18 ticks)`)
      break
    case 'decision (denied)':
      console.log(`  Source: Agent → Envelope → Steward`)
      console.log(`  Behavior: Curves to envelope, PULSES (3x), continues to steward`)
      if (evts.length > 0) {
        evts.forEach(e => {
          console.log(`    - Hour ${e.hour}: ${e.actorName} → ${e.label}`)
        })
      }
      break
    case 'boundary_interaction':
      console.log(`  Source: Agent → Envelope → Steward`)
      console.log(`  Behavior: Curves to envelope, pulses (0.5s), continues to steward, ORBITS steward`)
      if (evts.length > 0) {
        evts.forEach(e => {
          const resolution = revisions.find(r => r.resolvesEventId === e.eventId) ||
                           events.find(ev => ev.type === 'decision' && ev.hour > e.hour && ev.envelopeId === e.envelopeId)
          const orbitDuration = resolution ? ((resolution.hour - e.hour) * 25).toFixed(0) : '?'
          console.log(`    - Hour ${e.hour}: ${e.actorName} → ${e.boundary_kind} (orbit: ${orbitDuration} ticks)`)
        })
      }
      break
    case 'revision':
      console.log(`  Source: Steward → Envelope`)
      console.log(`  Behavior: Curves from steward (lower arc), fades at envelope`)
      break
    case 'retrieval':
      console.log(`  Source: Embedding Store → Agent`)
      console.log(`  Behavior: Dotted curve from embedding store, fades at agent`)
      if (evts.length > 0) {
        evts.forEach(e => {
          const count = e.retrievedEmbeddings?.length || 0
          const maxScore = Math.max(...(e.relevanceScores || [0])) * 100
          console.log(`    - Hour ${e.hour}: ${e.actorName} retrieves ${count} embeddings (top: ${maxScore.toFixed(0)}%)`)
        })
      }
      break
  }
})

// ============================================================================
// PART 8B: PARTICLE FLOW VALIDATION
// ============================================================================

console.log('\n')
console.log('🔍 PARTICLE FLOW VALIDATION (Visual Correctness)')
console.log('─'.repeat(60))

const flowIssues = []

// Validate decisions have agent lookup data
events.filter(e => e.type === 'decision').forEach(e => {
  if (!e.agentId && !e.actorName) {
    flowIssues.push({
      severity: 'warning',
      type: 'missing-agent-lookup',
      message: `Decision at hour ${e.hour} lacks both agentId and actorName - will source from random viewport edge`
    })
  }
})

// Validate boundary_interactions have required fields for proper visualization
boundaries.forEach(e => {
  if (!e.boundary_kind) {
    flowIssues.push({
      severity: 'error',
      type: 'missing-boundary-kind',
      message: `Boundary at hour ${e.hour} missing required boundary_kind field (escalated/deferred/overridden)`
    })
  }
  
  if (!e.actorName) {
    flowIssues.push({
      severity: 'warning',
      type: 'missing-actor-name',
      message: `Boundary at hour ${e.hour} missing actorName - particle won't know source agent`
    })
  }
  
  if (!e.actorRole) {
    flowIssues.push({
      severity: 'warning',
      type: 'missing-actor-role',
      message: `Boundary at hour ${e.hour} missing actorRole - particle won't know target steward`
    })
  }
  
  if (!e.envelopeId) {
    flowIssues.push({
      severity: 'error',
      type: 'missing-envelope-id',
      message: `Boundary at hour ${e.hour} missing envelopeId - particle won't know waypoint`
    })
  }
  
  // Check for resolution to calculate orbit duration
  const resolution = events.find(ev => ev.resolvesEventId === e.eventId)
  if (!resolution) {
    flowIssues.push({
      severity: 'warning',
      type: 'missing-resolution',
      message: `Boundary at hour ${e.hour} (${e.eventId}) has no resolution event - orbit duration will be indeterminate`
    })
  }
})

// Validate revisions have steward source
revisions.forEach(e => {
  if (!e.actorRole) {
    flowIssues.push({
      severity: 'warning',
      type: 'missing-steward-source',
      message: `Revision at hour ${e.hour} missing actorRole - particle won't know source steward`
    })
  }
  if (!e.envelopeId) {
    flowIssues.push({
      severity: 'error',
      type: 'missing-envelope-target',
      message: `Revision at hour ${e.hour} missing envelopeId - particle won't know destination`
    })
  }
})

// Validate retrievals have agent target
retrievals.forEach(e => {
  if (!e.actorName) {
    flowIssues.push({
      severity: 'warning',
      type: 'missing-retrieval-target',
      message: `Retrieval at hour ${e.hour} missing actorName - particle won't know target agent`
    })
  }
  if (!e.retrievedEmbeddings || e.retrievedEmbeddings.length === 0) {
    flowIssues.push({
      severity: 'info',
      type: 'empty-retrieval',
      message: `Retrieval at hour ${e.hour} has no retrievedEmbeddings array - won't show what was retrieved`
    })
  }
})

// Validate signals have envelope target
events.filter(e => e.type === 'signal').forEach(e => {
  if (!e.envelopeId) {
    flowIssues.push({
      severity: 'error',
      type: 'missing-signal-target',
      message: `Signal at hour ${e.hour} missing envelopeId - particle won't know destination`
    })
  }
})

// Report flow validation results
if (flowIssues.length === 0) {
  console.log('✅ All particle flows have required fields for visualization')
} else {
  const flowGrouped = flowIssues.reduce((acc, issue) => {
    if (!acc[issue.severity]) acc[issue.severity] = []
    acc[issue.severity].push(issue)
    return acc
  }, {})
  
  ['error', 'warning', 'info'].forEach(severity => {
    if (flowGrouped && flowGrouped[severity]) {
      console.log(`\n${severity.toUpperCase()} (${flowGrouped[severity].length}):`)
      flowGrouped[severity].slice(0, 3).forEach(issue => {
        const icon = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️'
        console.log(`  ${icon} ${issue.message}`)
      })
      if (flowGrouped[severity].length > 3) {
        console.log(`  ... and ${flowGrouped[severity].length - 3} more`)
      }
    }
  })
}

// ============================================================================
// PART 9: POTENTIAL ISSUES
// ============================================================================

console.log('\n')
console.log('⚠️  POTENTIAL ISSUES & IMPROVEMENTS')
console.log('─'.repeat(60))

const issues = []

// 1. Check for retrievals without nearby boundaries
retrievals.forEach(r => {
  const nearbyBoundary = boundaries.find(b => 
    Math.abs(b.hour - r.hour) < 1 && 
    b.actorName === r.actorName
  )
  if (!nearbyBoundary) {
    const nearbyDecision = events.find(e =>
      e.type === 'decision' &&
      e.hour > r.hour &&
      e.hour - r.hour < 1 &&
      e.actorName === r.actorName
    )
    if (!nearbyDecision) {
      issues.push({
        severity: 'info',
        type: 'retrieval-orphan',
        message: `Retrieval at hour ${r.hour} by ${r.actorName} not followed by decision or boundary within 1 hour`
      })
    }
  }
})

// 2. Check for boundaries without preceding retrieval
boundaries.forEach(b => {
  const precedingRetrieval = retrievals.find(r =>
    r.hour < b.hour &&
    (b.hour - r.hour) < 1 &&
    r.actorName === b.actorName
  )
  if (!precedingRetrieval) {
    issues.push({
      severity: 'suggestion',
      type: 'boundary-no-retrieval',
      message: `Boundary at hour ${b.hour} by ${b.actorName} lacks preceding retrieval (shows agent "thinking")`
    })
  }
})

// 3. Check for decisions without embeddings (for learning)
const decisionsWithEmbeddings = events.filter(e => e.type === 'decision').filter(d => {
  return embeddings.some(e => e.sourceEventId === d.eventId)
})
if (decisionsWithEmbeddings.length < events.filter(e => e.type === 'decision').length) {
  const pct = (decisionsWithEmbeddings.length / events.filter(e => e.type === 'decision').length * 100).toFixed(0)
  issues.push({
    severity: 'info',
    type: 'decision-embedding-coverage',
    message: `Only ${pct}% of decisions have embeddings (${decisionsWithEmbeddings.length}/${events.filter(e => e.type === 'decision').length}). Consider adding embeddings for key decisions to enable agent learning.`
  })
}

// 4. Check for time paradoxes in retrievals
retrievals.forEach(r => {
  const retrieved = r.retrievedEmbeddings || []
  retrieved.forEach(embId => {
    const emb = embeddings.find(e => e.embeddingId === embId)
    if (emb && emb.hour >= r.hour) {
      issues.push({
        severity: 'error',
        type: 'time-paradox',
        message: `Retrieval at hour ${r.hour} references embedding ${embId} created at hour ${emb.hour} (future knowledge)`
      })
    }
  })
})

// 5. Check for agents appearing in events but not in fleet definitions
const agentNames = new Set()
events.forEach(e => {
  if (e.actorName && e.type !== 'decision' && e.type !== 'revision' && e.type !== 'dsg_session') {
    agentNames.add(e.actorName)
  }
})

const fleetAgentNames = new Set()
scenario.fleets.forEach(f => {
  f.agents.forEach(a => fleetAgentNames.add(a.name))
})

agentNames.forEach(name => {
  if (!fleetAgentNames.has(name)) {
    issues.push({
      severity: 'warning',
      type: 'agent-not-in-fleet',
      message: `Agent "${name}" appears in events but not defined in any fleet`
    })
  }
})

// Group and display issues
const groupedIssues = issues.reduce((acc, issue) => {
  if (!acc[issue.severity]) acc[issue.severity] = []
  acc[issue.severity].push(issue)
  return acc
}, {})

if (issues.length === 0) {
  console.log('✅ No issues found!')
} else {
  ['error', 'warning', 'suggestion', 'info'].forEach(severity => {
    if (groupedIssues[severity]) {
      console.log(`\n${severity.toUpperCase()} (${groupedIssues[severity].length}):`)
      groupedIssues[severity].slice(0, 5).forEach(issue => {
        const icon = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️'
        console.log(`  ${icon} ${issue.message}`)
      })
      if (groupedIssues[severity].length > 5) {
        console.log(`  ... and ${groupedIssues[severity].length - 5} more`)
      }
    }
  })
}

// ============================================================================
// SUMMARY METRICS TABLE
// ============================================================================

console.log('\n')
console.log('📋 SUMMARY METRICS')
console.log('─'.repeat(60))

const metrics = {
  'Closed Loop Compliance': [
    { metric: 'Revisions with embeddings', value: `${revisionsWithEmbeddings.length}/${revisions.length}`, status: revisionsWithEmbeddings.length === revisions.length ? '✅' : '❌', required: 'REQUIRED' },
    { metric: 'Boundaries with embeddings', value: `${boundariesWithEmbeddings.length}/${boundaries.length}`, status: boundariesWithEmbeddings.length === boundaries.length ? '✅' : '❌', required: 'REQUIRED' },
    { metric: 'Time paradoxes', value: groupedIssues.error?.filter(i => i.type === 'time-paradox').length || 0, status: (groupedIssues.error?.filter(i => i.type === 'time-paradox').length || 0) === 0 ? '✅' : '❌', required: 'REQUIRED' },
    { metric: 'Boundaries with retrieval', value: `${boundaries.filter(b => retrievals.some(r => r.hour < b.hour && (b.hour - r.hour) < 1 && r.actorName === b.actorName)).length}/${boundaries.length}`, status: '⚠️', required: 'RECOMMENDED' },
  ],
  'Particle Flow Validation': [
    { metric: 'Missing boundary_kind', value: flowIssues.filter(i => i.type === 'missing-boundary-kind').length, status: flowIssues.filter(i => i.type === 'missing-boundary-kind').length === 0 ? '✅' : '❌' },
    { metric: 'Missing agent lookups', value: flowIssues.filter(i => i.type === 'missing-agent-lookup' || i.type === 'missing-actor-name').length, status: flowIssues.filter(i => i.type === 'missing-agent-lookup' || i.type === 'missing-actor-name').length === 0 ? '✅' : '⚠️' },
    { metric: 'Missing envelope targets', value: flowIssues.filter(i => i.type === 'missing-envelope-id' || i.type === 'missing-envelope-target' || i.type === 'missing-signal-target').length, status: flowIssues.filter(i => i.type === 'missing-envelope-id' || i.type === 'missing-envelope-target' || i.type === 'missing-signal-target').length === 0 ? '✅' : '❌' },
    { metric: 'Unresolved boundaries', value: flowIssues.filter(i => i.type === 'missing-resolution').length, status: flowIssues.filter(i => i.type === 'missing-resolution').length === 0 ? '✅' : '⚠️' },
  ],
  'Scenario Health': [
    { metric: 'Total events', value: scenario.events.length },
    { metric: 'Event types', value: Object.keys(eventTypes).length },
    { metric: 'Complete feedback cycles', value: `${complete.length}/${completeCycles.length}` },
    { metric: 'Historical baseline events', value: eventsWithNegativeHour.length },
  ],
  'Identified Issues': [
    { metric: 'Errors', value: groupedIssues.error?.length || 0, status: (groupedIssues.error?.length || 0) === 0 ? '✅' : '❌' },
    { metric: 'Warnings', value: groupedIssues.warning?.length || 0, status: (groupedIssues.warning?.length || 0) === 0 ? '✅' : '⚠️' },
    { metric: 'Suggestions', value: groupedIssues.suggestion?.length || 0 },
    { metric: 'Info', value: groupedIssues.info?.length || 0 },
  ]
}

Object.entries(metrics).forEach(([category, items]) => {
  console.log(`\n${category}:`)
  items.forEach(item => {
    const status = item.status || ''
    const required = item.required ? ` [${item.required}]` : ''
    console.log(`  ${status} ${item.metric.padEnd(30)} ${item.value}${required}`)
  })
})

console.log('\n')
console.log('═══════════════════════════════════════════════════════════')
console.log('ANALYSIS COMPLETE')
console.log('═══════════════════════════════════════════════════════════\n')

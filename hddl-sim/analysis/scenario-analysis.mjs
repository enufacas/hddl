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
// PART 7: ENVELOPE TIMELINE & VERSIONING VALIDATION
// ============================================================================

console.log('📦 ENVELOPE TIMELINE & VERSIONING VALIDATION')
console.log('─'.repeat(60))

const envelopeTimeline = {}
const envelopeEntries = new Map() // Store full envelope objects keyed by envelopeId-version (best-effort)
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
    ownerRole: env.ownerRole,
    assumptions: env.assumptions,
    constraints: env.constraints,
    revision_id: env.revision_id
  })

  const versionKey = `${env.envelopeId}-v${env.envelope_version}`
  if (envelopeEntries.has(versionKey)) {
    // Two envelope windows with the same envelope_version. This is allowed, but makes version-based lookups ambiguous.
    // Keep first entry and report later.
  } else {
    envelopeEntries.set(versionKey, env)
  }
})

const versioningIssues = []

Object.entries(envelopeTimeline).forEach(([envId, versions]) => {
  versions.sort((a, b) => a.start - b.start)
  console.log(`${envId}: ${versions[0].name}`)

  // Detect repeated envelope_version numbers across windows
  const seenVersions = new Set()
  const repeatedVersions = new Set()
  versions.forEach(v => {
    if (seenVersions.has(v.version)) repeatedVersions.add(v.version)
    seenVersions.add(v.version)
  })
  if (repeatedVersions.size > 0) {
    versioningIssues.push({
      severity: 'warning',
      type: 'duplicate-envelope-version-number',
      envelopeId: envId,
      message: `${envId} repeats envelope_version across windows: ${[...repeatedVersions].map(v => `v${v}`).join(', ')}`
    })
  }
  
  // Multiple entries for an envelopeId typically represent multiple activation windows.
  // This is valid, but we validate the transitions and ensure events don't occur during inactive periods.
  if (versions.length > 1) {
    console.log(`  ℹ️  MULTI-WINDOW ENVELOPE: ${versions.length} activation windows`)
    versioningIssues.push({
      severity: 'info',
      type: 'multi-window-envelope',
      envelopeId: envId,
      message: `${envId} has ${versions.length} activation windows (same envelopeId appears multiple times)`
    })
  }
  
  versions.forEach(v => {
    console.log(`  v${v.version}: Hour ${v.start}-${v.end} (${(v.end - v.start).toFixed(2)}h duration)`)
  })
  
  // Validate ordering and continuity between windows
  for (let i = 1; i < versions.length; i++) {
    const gap = versions[i].start - versions[i-1].end
    if (gap > 0) {
      console.log(`    ℹ️  GAP: ${gap} hours between v${versions[i-1].version} and v${versions[i].version}`)

      const gapStart = versions[i - 1].end
      const gapEnd = versions[i].start
      const eventsDuringGap = events.filter(e =>
        e.envelopeId === envId &&
        typeof e.hour === 'number' &&
        e.hour > gapStart &&
        e.hour < gapEnd
      )

      if (eventsDuringGap.length > 0) {
        versioningIssues.push({
          severity: 'error',
          type: 'events-during-inactive-window',
          envelopeId: envId,
          message: `${envId} has ${eventsDuringGap.length} events during inactive gap (hour ${gapStart}-${gapEnd})`
        })
      } else {
        versioningIssues.push({
          severity: 'info',
          type: 'inactive-gap',
          envelopeId: envId,
          message: `${envId} inactive for ${gap}h between windows (hour ${gapStart}-${gapEnd})`
        })
      }
    } else if (gap < 0) {
      console.log(`    ⚠️  OVERLAP: ${Math.abs(gap)} hours between v${versions[i-1].version} and v${versions[i].version}`)
      versioningIssues.push({
        severity: 'error',
        type: 'envelope-overlap',
        envelopeId: envId,
        message: `${envId} has ${Math.abs(gap)}h overlap between v${versions[i-1].version} and v${versions[i].version} - two versions active simultaneously`
      })
    }

    const prevVersion = versions[i - 1].version
    const nextVersion = versions[i].version
    if (typeof prevVersion === 'number' && typeof nextVersion === 'number' && nextVersion < prevVersion) {
      versioningIssues.push({
        severity: 'error',
        type: 'version-regression',
        envelopeId: envId,
        message: `${envId} version regresses from v${prevVersion} to v${nextVersion}`
      })
    }

    // If the version increases, we expect a revision to document the change (either during the gap or at the next window start).
    if (typeof prevVersion === 'number' && typeof nextVersion === 'number' && nextVersion > prevVersion) {
      const prevEnd = versions[i - 1].end
      const nextStart = versions[i].start
      const transitionRevision = revisions.find(r =>
        r.envelopeId === envId &&
        typeof r.hour === 'number' &&
        r.hour >= prevEnd &&
        r.hour <= nextStart
      )

      if (!transitionRevision) {
        const nextEntry = scenario.envelopes.find(e => e.envelopeId === envId && e.envelope_version === nextVersion && e.createdHour === nextStart)
        const revisionIdHint = nextEntry?.revision_id
        const hint = revisionIdHint ? ` (envelope has revision_id="${revisionIdHint}")` : ''
        versioningIssues.push({
          severity: 'warning',
          type: 'version-change-without-revision',
          envelopeId: envId,
          message: `${envId} transitions v${prevVersion}→v${nextVersion} (hour ${prevEnd}-${nextStart}) without a revision event in that interval${hint}`
        })
      }
    }
  }
  
  // Check if revisions exist for this envelope
  const envelopeRevisions = revisions.filter(r => r.envelopeId === envId).sort((a, b) => a.hour - b.hour)
  if (envelopeRevisions.length > 0) {
    console.log(`  Revisions: ${envelopeRevisions.length}`)
    envelopeRevisions.forEach(rev => {
      const revVersionLabel = rev.envelope_version ?? '?' 
      console.log(`    - Hour ${rev.hour}: v${revVersionLabel} (${rev.label})`)

      if (rev.envelope_version == null) {
        versioningIssues.push({
          severity: 'warning',
          type: 'revision-missing-envelope-version',
          envelopeId: envId,
          message: `${envId} revision at hour ${rev.hour} is missing envelope_version (harder to verify version progression)`
        })
      }
      
      // Check if revision happens during an envelope's lifetime or in a gap
      const activeEnvelope = versions.find(v => v.start <= rev.hour && rev.hour <= v.end)
      if (!activeEnvelope) {
        console.log(`      ℹ️  Revision occurs outside any active window`)

        const prevWindow = [...versions].reverse().find(v => v.end <= rev.hour)
        const nextWindow = versions.find(v => v.start >= rev.hour)
        if (prevWindow && nextWindow && prevWindow.end < rev.hour && rev.hour < nextWindow.start) {
          versioningIssues.push({
            severity: 'info',
            type: 'revision-between-windows',
            envelopeId: envId,
            message: `${envId} revision at hour ${rev.hour} occurs between windows (hour ${prevWindow.end}-${nextWindow.start})`
          })
        } else {
          versioningIssues.push({
            severity: 'warning',
            type: 'revision-outside-windows',
            envelopeId: envId,
            message: `${envId} revision at hour ${rev.hour} occurs outside any defined envelope window`
          })
        }
      }
      
      // If the revision includes nextAssumptions/nextConstraints, validate they match the envelope entry for that version.
      const hasNextAssumptions = Array.isArray(rev.nextAssumptions)
      const hasNextConstraints = Array.isArray(rev.nextConstraints)
      if (rev.envelope_version != null && (hasNextAssumptions || hasNextConstraints)) {
        const matchingEnvelope = envelopeEntries.get(`${envId}-v${rev.envelope_version}`)
        if (!matchingEnvelope) {
          versioningIssues.push({
            severity: 'warning',
            type: 'revision-version-without-envelope-entry',
            envelopeId: envId,
            message: `${envId} revision at hour ${rev.hour} targets v${rev.envelope_version}, but scenario.envelopes has no entry for that version`
          })
        } else {
          const assumptionsMatch = !hasNextAssumptions ||
            (Array.isArray(matchingEnvelope.assumptions) &&
             JSON.stringify([...rev.nextAssumptions].sort()) === JSON.stringify([...matchingEnvelope.assumptions].sort()))

          const constraintsMatch = !hasNextConstraints ||
            (Array.isArray(matchingEnvelope.constraints) &&
             JSON.stringify([...rev.nextConstraints].sort()) === JSON.stringify([...matchingEnvelope.constraints].sort()))
          
          if (!assumptionsMatch || !constraintsMatch) {
            console.log(`      ❌ INCONSISTENCY: Envelope v${rev.envelope_version} does not match revision nextAssumptions/nextConstraints`)
            versioningIssues.push({
              severity: 'error',
              type: 'revision-envelope-mismatch',
              envelopeId: envId,
              message: `${envId} v${rev.envelope_version}: Envelope entry does not reflect revision changes from hour ${rev.hour}`
            })
          }
        }
      } else if (rev.envelope_version != null && !hasNextAssumptions && !hasNextConstraints) {
        versioningIssues.push({
          severity: 'info',
          type: 'revision-missing-next-state',
          envelopeId: envId,
          message: `${envId} revision at hour ${rev.hour} omits nextAssumptions/nextConstraints (cannot validate envelope content alignment)`
        })
      }
    })
  } else if (versions.length > 1) {
    console.log(`  ⚠️  Multiple windows but NO revision events`)
    versioningIssues.push({
      severity: 'warning',
      type: 'no-revisions-for-multi-window',
      envelopeId: envId,
      message: `${envId} has multiple activation windows but no revision events in this scenario`
    })
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
          const scores = Array.isArray(e.relevanceScores) ? e.relevanceScores : []
          const maxScore = scores.length > 0 ? (Math.max(...scores) * 100) : 0
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
  console.log(`Found ${flowIssues.length} particle flow issues`)
  
  try {
    const flowGrouped = flowIssues.reduce((acc, issue) => {
      if (!issue || typeof issue !== 'object') {
        console.error(`⚠️  Malformed issue:`, issue)
        return acc
      }
      const sev = issue.severity || 'warning'
      if (!acc[sev]) acc[sev] = []
      acc[sev].push(issue)
      return acc
    }, {})
    
    const severities = ['error', 'warning', 'info']
    for (const severity of severities) {
      if (flowGrouped[severity] && flowGrouped[severity].length > 0) {
        console.log(`\n${severity.toUpperCase()} (${flowGrouped[severity].length}):`)
        flowGrouped[severity].slice(0, 3).forEach(issue => {
          const icon = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️'
          console.log(`  ${icon} ${issue.message || 'No message'}`)
        })
        if (flowGrouped[severity].length > 3) {
          console.log(`  ... and ${flowGrouped[severity].length - 3} more`)
        }
      }
    }
  } catch (err) {
    console.error('Error processing flow issues:', err.message)
    console.log('Flow issues:', flowIssues)
  }
}

// ============================================================================
// PART 9: SEMANTIC COHERENCE & LEARNING VALIDATION
// ============================================================================

console.log('\n')
console.log('🧠 SEMANTIC COHERENCE & LEARNING')
console.log('─'.repeat(60))

const semanticIssues = []

// Check semantic vector positioning (should be in [0,1] range and diverse)
const vectoredEmbeddings = embeddings.filter(e => e.semanticVector && Array.isArray(e.semanticVector))
if (vectoredEmbeddings.length > 0) {
  console.log(`Embeddings with semantic vectors: ${vectoredEmbeddings.length}/${embeddings.length}`)
  
  // Check vector dimensions
  const invalidVectors = vectoredEmbeddings.filter(e => 
    e.semanticVector.length !== 2 || 
    e.semanticVector.some(v => v < 0 || v > 1)
  )
  if (invalidVectors.length > 0) {
    semanticIssues.push({
      severity: 'error',
      type: 'invalid-semantic-vector',
      message: `${invalidVectors.length} embeddings have invalid semantic vectors (must be 2D with values 0-1)`
    })
  }
  
  // Check semantic diversity (vectors shouldn't all be in same quadrant)
  const quadrants = { q1: 0, q2: 0, q3: 0, q4: 0 }
  vectoredEmbeddings.forEach(e => {
    const [x, y] = e.semanticVector
    if (x >= 0.5 && y >= 0.5) quadrants.q1++
    else if (x < 0.5 && y >= 0.5) quadrants.q2++
    else if (x < 0.5 && y < 0.5) quadrants.q3++
    else quadrants.q4++
  })
  
  const dominantQuadrant = Math.max(...Object.values(quadrants))
  const diversityScore = ((vectoredEmbeddings.length - dominantQuadrant) / vectoredEmbeddings.length * 100).toFixed(0)
  console.log(`Semantic diversity: ${diversityScore}% (vectors spread across quadrants)`)
  
  if (diversityScore < 30) {
    semanticIssues.push({
      severity: 'warning',
      type: 'low-semantic-diversity',
      message: `Only ${diversityScore}% semantic diversity - vectors clustered in one region`
    })
  }
}

// Check retrieval-query alignment
const retrievalsWithQueries = retrievals.filter(r => r.queryText && r.retrievedEmbeddings && r.retrievedEmbeddings.length > 0)
console.log(`\nRetrieval-Query Alignment:`)
console.log(`  Retrievals with queries: ${retrievalsWithQueries.length}/${retrievals.length}`)

retrievalsWithQueries.forEach(r => {
  r.retrievedEmbeddings.forEach((embId, idx) => {
    const emb = embeddings.find(e => e.embeddingId === embId)
    if (emb && emb.semanticContext) {
      const queryWords = new Set(r.queryText.toLowerCase().split(/\s+/))
      const contextWords = new Set(emb.semanticContext.toLowerCase().split(/\s+/))
      const overlap = [...queryWords].filter(w => contextWords.has(w)).length
      const alignmentScore = overlap / Math.max(queryWords.size, 1)
      
      if (alignmentScore < 0.2 && (r.relevanceScores && r.relevanceScores[idx] > 0.8)) {
        semanticIssues.push({
          severity: 'warning',
          type: 'query-mismatch',
          message: `Retrieval at hour ${r.hour}: High relevance (${(r.relevanceScores[idx] * 100).toFixed(0)}%) but low query-context overlap for ${embId}`
        })
      }
    }
  })
})

// Check relevance score realism
const relevanceScores = retrievals.flatMap(r => r.relevanceScores || [])
if (relevanceScores.length > 0) {
  const avgRelevance = (relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length * 100).toFixed(0)
  const perfectScores = relevanceScores.filter(s => s >= 0.95).length
  const perfectPct = (perfectScores / relevanceScores.length * 100).toFixed(0)
  
  console.log(`\nRelevance Score Analysis:`)
  console.log(`  Average relevance: ${avgRelevance}%`)
  console.log(`  Perfect scores (≥95%): ${perfectPct}%`)
  
  if (perfectPct > 50) {
    semanticIssues.push({
      severity: 'suggestion',
      type: 'unrealistic-relevance',
      message: `${perfectPct}% of relevance scores are ≥95% - consider adding more variation for realism`
    })
  }
}

// Historical baseline check
const historicalEmbeddings = embeddings.filter(e => e.hour < 0)
if (historicalEmbeddings.length > 0) {
  console.log(`\nHistorical Baseline: ${historicalEmbeddings.length} embeddings before hour 0`)
  const referencedBaseline = retrievals.filter(r => 
    r.retrievedEmbeddings && r.retrievedEmbeddings.some(id => 
      historicalEmbeddings.some(h => h.embeddingId === id)
    )
  ).length
  console.log(`  Referenced in retrievals: ${referencedBaseline}/${retrievals.length} (${(referencedBaseline / Math.max(retrievals.length, 1) * 100).toFixed(0)}%)`)
  
  if (referencedBaseline === 0 && retrievals.length > 0) {
    semanticIssues.push({
      severity: 'warning',
      type: 'unused-baseline',
      message: `Historical baseline exists but is never retrieved - agents not learning from history`
    })
  }
}

if (semanticIssues.length === 0) {
  console.log('\n✅ Semantic coherence validated')
} else {
  console.log(`\n⚠️  Found ${semanticIssues.length} semantic issues`)
}

// ============================================================================
// PART 10: FEEDBACK LOOP EFFECTIVENESS
// ============================================================================

console.log('\n')
console.log('🔄 FEEDBACK LOOP EFFECTIVENESS')
console.log('─'.repeat(60))

const effectivenessIssues = []

// Check if revisions actually address boundaries
const revisionBoundaryAlignment = revisions.map(rev => {
  if (!rev.resolvesEventId) return null
  
  const boundary = boundaries.find(b => b.eventId === rev.resolvesEventId)
  if (!boundary) return null
  
  // Check semantic alignment between revision reason and boundary reason
  const revisionWords = new Set((rev.reason || '').toLowerCase().split(/\s+/))
  const boundaryContext = `${boundary.label} ${boundary.detail} ${boundary.boundary_reason || ''}`.toLowerCase()
  const boundaryWords = new Set(boundaryContext.split(/\s+/))
  const overlap = [...revisionWords].filter(w => boundaryWords.has(w)).length
  const alignmentScore = overlap / Math.max(revisionWords.size, 1)
  
  return {
    revision: rev,
    boundary: boundary,
    alignmentScore: alignmentScore,
    aligned: alignmentScore > 0.15
  }
}).filter(Boolean)

const alignedRevisions = revisionBoundaryAlignment.filter(r => r.aligned).length
console.log(`Revision-Boundary Alignment: ${alignedRevisions}/${revisionBoundaryAlignment.length} revisions semantically address their boundaries`)

revisionBoundaryAlignment.filter(r => !r.aligned).forEach(item => {
  effectivenessIssues.push({
    severity: 'warning',
    type: 'misaligned-revision',
    message: `Revision at hour ${item.revision.hour} doesn't clearly address boundary at ${item.boundary.hour} (low semantic overlap)`
  })
})

// Check for learning evidence (revisions referenced in later retrievals)
const revisionEmbeddings = embeddings.filter(e => e.embeddingType === 'revision')
const referencedRevisionEmbeddings = revisionEmbeddings.filter(re =>
  retrievals.some(r => 
    r.retrievedEmbeddings && r.retrievedEmbeddings.includes(re.embeddingId) &&
    r.hour > re.hour
  )
)

console.log(`Learning Evidence: ${referencedRevisionEmbeddings.length}/${revisionEmbeddings.length} revision embeddings retrieved in future decisions`)

if (revisionEmbeddings.length > 0 && referencedRevisionEmbeddings.length === 0) {
  effectivenessIssues.push({
    severity: 'warning',
    type: 'no-learning-evidence',
    message: `No revision embeddings are ever retrieved - agents may not be learning from policy changes`
  })
}

// Check for boundary recurrence patterns
const boundaryTypes = boundaries.reduce((acc, b) => {
  const key = `${b.envelopeId}:${b.boundary_reason || 'unknown'}`
  if (!acc[key]) acc[key] = []
  acc[key].push(b)
  return acc
}, {})

const recurringBoundaries = Object.entries(boundaryTypes).filter(([_, items]) => items.length > 1)
console.log(`Recurring Boundary Patterns: ${recurringBoundaries.length} boundary types occur multiple times`)

recurringBoundaries.forEach(([key, items]) => {
  const [envelopeId, reason] = key.split(':')
  const sorted = items.sort((a, b) => a.hour - b.hour)
  const hasRevision = sorted.some(b => revisions.some(r => r.resolvesEventId === b.eventId))
  
  if (hasRevision && sorted.length > 2) {
    effectivenessIssues.push({
      severity: 'info',
      type: 'recurring-despite-revision',
      message: `Boundary "${reason}" in ${envelopeId} recurs ${items.length} times despite revisions - may indicate incomplete policy fix`
    })
  }
})

if (effectivenessIssues.length === 0) {
  console.log('\n✅ Feedback loops appear effective')
} else {
  console.log(`\n⚠️  Found ${effectivenessIssues.length} effectiveness issues`)
}

// ============================================================================
// PART 11: TEMPORAL REALISM
// ============================================================================

console.log('\n')
console.log('⏱️  TEMPORAL REALISM')
console.log('─'.repeat(60))

const temporalIssues = []

// Check embedding delay patterns (should be 0.5-1.5h after source)
const embeddingDelays = embeddings.filter(e => e.sourceEventId).map(e => {
  const sourceEvent = events.find(ev => ev.eventId === e.sourceEventId)
  if (!sourceEvent) return null
  
  const delay = e.hour - sourceEvent.hour
  return {
    embedding: e,
    delay: delay,
    realistic: delay >= 0.2 && delay <= 2
  }
}).filter(Boolean)

const realisticDelays = embeddingDelays.filter(d => d.realistic).length
console.log(`Embedding Delays: ${realisticDelays}/${embeddingDelays.length} have realistic timing (0.2-2h after source)`)

embeddingDelays.filter(d => !d.realistic).forEach(item => {
  if (item.delay < 0.2) {
    temporalIssues.push({
      severity: 'warning',
      type: 'instant-embedding',
      message: `Embedding at hour ${item.embedding.hour} created too quickly (${item.delay.toFixed(2)}h) - embeddings need processing time`
    })
  } else if (item.delay > 2) {
    temporalIssues.push({
      severity: 'info',
      type: 'delayed-embedding',
      message: `Embedding at hour ${item.embedding.hour} created ${item.delay.toFixed(1)}h after source - unusually long delay`
    })
  }
})

// Check retrieval-to-action timing
const retrievalActions = retrievals.map(r => {
  const nextAction = events.find(e => 
    e.hour > r.hour && 
    e.hour - r.hour < 1 &&
    e.actorName === r.actorName &&
    (e.type === 'decision' || e.type === 'boundary_interaction')
  )
  
  if (!nextAction) return null
  
  const gap = nextAction.hour - r.hour
  return {
    retrieval: r,
    action: nextAction,
    gap: gap,
    realistic: gap >= 0.05 && gap <= 0.7
  }
}).filter(Boolean)

const realisticActionGaps = retrievalActions.filter(ra => ra.realistic).length
console.log(`Retrieval-to-Action Timing: ${realisticActionGaps}/${retrievalActions.length} have realistic gap (0.05-0.7h)`)

retrievalActions.filter(ra => !ra.realistic).forEach(item => {
  if (item.gap < 0.05) {
    temporalIssues.push({
      severity: 'warning',
      type: 'instant-action',
      message: `Action at hour ${item.action.hour} occurs ${(item.gap * 60).toFixed(0)}min after retrieval - unrealistically fast`
    })
  }
})

// Check decision latency (escalated should take longer than routine)
const escalatedDecisions = events.filter(e => 
  e.type === 'decision' && 
  boundaries.some(b => b.hour < e.hour && e.hour - b.hour < 4 && b.envelopeId === e.envelopeId)
)
const routineDecisions = events.filter(e => 
  e.type === 'decision' && 
  !escalatedDecisions.includes(e)
)

if (escalatedDecisions.length > 0 && routineDecisions.length > 0) {
  console.log(`\nDecision Latency Patterns:`)
  console.log(`  Escalated decisions: ${escalatedDecisions.length}`)
  console.log(`  Routine decisions: ${routineDecisions.length}`)
  console.log(`  Note: Escalated decisions should show deliberation time`)
}

if (temporalIssues.length === 0) {
  console.log('\n✅ Temporal patterns appear realistic')
} else {
  console.log(`\n⚠️  Found ${temporalIssues.length} temporal realism issues`)
}

// ============================================================================
// PART 12: ACTOR BEHAVIOR PATTERNS
// ============================================================================

console.log('\n')
console.log('👤 ACTOR BEHAVIOR PATTERNS')
console.log('─'.repeat(60))

const behaviorIssues = []

// Check agent specialization (should stick to designated envelopes)
const agentEnvelopeViolations = []
scenario.fleets.forEach(fleet => {
  fleet.agents.forEach(agent => {
    const agentEvents = events.filter(e => e.actorName === agent.name)
    const designatedEnvelopes = new Set(agent.envelopeIds || [])
    
    agentEvents.forEach(e => {
      if (e.envelopeId && !designatedEnvelopes.has(e.envelopeId)) {
        agentEnvelopeViolations.push({
          agent: agent.name,
          event: e,
          violatedEnvelope: e.envelopeId
        })
      }
    })
  })
})

console.log(`Agent Specialization: ${agentEnvelopeViolations.length} events where agents operated outside their designated envelopes`)

if (agentEnvelopeViolations.length > 0) {
  agentEnvelopeViolations.slice(0, 3).forEach(v => {
    behaviorIssues.push({
      severity: 'warning',
      type: 'agent-scope-violation',
      message: `${v.agent} operated in ${v.violatedEnvelope} outside its designated scope at hour ${v.event.hour}`
    })
  })
  if (agentEnvelopeViolations.length > 3) {
    console.log(`  (${agentEnvelopeViolations.length - 3} more violations...)`)
  }
}

// Check decision patterns (should have variety)
const decisionsByActor = {}
events.filter(e => e.type === 'decision').forEach(d => {
  if (!decisionsByActor[d.actorName]) {
    decisionsByActor[d.actorName] = { allowed: 0, denied: 0 }
  }
  if (d.status === 'denied') {
    decisionsByActor[d.actorName].denied++
  } else {
    decisionsByActor[d.actorName].allowed++
  }
})

console.log(`\nDecision Patterns:`)
Object.entries(decisionsByActor).forEach(([actor, decisions]) => {
  const total = decisions.allowed + decisions.denied
  if (total >= 3) {
    const allowedPct = (decisions.allowed / total * 100).toFixed(0)
    console.log(`  ${actor}: ${allowedPct}% allowed (${decisions.allowed}/${total})`)
    
    if (allowedPct === '100' || allowedPct === '0') {
      behaviorIssues.push({
        severity: 'suggestion',
        type: 'monotonic-decisions',
        message: `${actor} shows no decision variety (${total} decisions, all ${allowedPct === '100' ? 'allowed' : 'denied'})`
      })
    }
  }
})

// Check retrieval usage correlation with decision complexity
const agentsWithRetrievals = new Set(retrievals.map(r => r.actorName))
const agentsWithComplexDecisions = new Set(
  events.filter(e => 
    e.type === 'decision' && 
    (e.status === 'denied' || boundaries.some(b => Math.abs(b.hour - e.hour) < 1))
  ).map(e => e.actorName)
)

const complexWithoutRetrieval = [...agentsWithComplexDecisions].filter(a => !agentsWithRetrievals.has(a))
if (complexWithoutRetrieval.length > 0) {
  console.log(`\nRetrieval Usage:`)
  console.log(`  ${complexWithoutRetrieval.length} agents make complex decisions without using retrieval`)
  
  complexWithoutRetrieval.forEach(agent => {
    behaviorIssues.push({
      severity: 'suggestion',
      type: 'missing-retrieval-pattern',
      message: `${agent} makes complex decisions but never retrieves context - consider adding retrieval for realism`
    })
  })
}

if (behaviorIssues.length === 0) {
  console.log('\n✅ Actor behavior patterns are realistic')
} else {
  console.log(`\n⚠️  Found ${behaviorIssues.length} behavior pattern issues`)
}

// ============================================================================
// PART 13: POTENTIAL ISSUES (BASIC VALIDATION)
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

// Group and display issues - combine all issue types
const allValidationIssues = [
  ...semanticIssues,
  ...effectivenessIssues,
  ...temporalIssues,
  ...behaviorIssues,
  ...versioningIssues,
  ...issues
]

const groupedIssues = allValidationIssues.reduce((acc, issue) => {
  const sev = issue.severity || 'info'
  if (!acc[sev]) acc[sev] = []
  acc[sev].push(issue)
  return acc
}, {})

if (allValidationIssues.length === 0) {
  console.log('✅ No issues found!')
} else {
  ['error', 'warning', 'suggestion', 'info'].forEach(severity => {
    if (groupedIssues[severity] && groupedIssues[severity].length > 0) {
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
  'Semantic Coherence': [
    { metric: 'Semantic vector validity', value: semanticIssues.filter(i => i.type === 'invalid-semantic-vector').length, status: semanticIssues.filter(i => i.type === 'invalid-semantic-vector').length === 0 ? '✅' : '❌' },
    { metric: 'Semantic diversity', value: vectoredEmbeddings.length > 0 ? 'Validated' : 'N/A', status: semanticIssues.filter(i => i.type === 'low-semantic-diversity').length === 0 ? '✅' : '⚠️' },
    { metric: 'Historical baseline usage', value: historicalEmbeddings.length > 0 ? 'Present' : 'None', status: semanticIssues.filter(i => i.type === 'unused-baseline').length === 0 ? '✅' : '⚠️' },
  ],
  'Feedback Effectiveness': [
    { metric: 'Revision-boundary alignment', value: revisionBoundaryAlignment.length > 0 ? `${alignedRevisions}/${revisionBoundaryAlignment.length}` : 'N/A', status: effectivenessIssues.filter(i => i.type === 'misaligned-revision').length === 0 ? '✅' : '⚠️' },
    { metric: 'Learning evidence', value: revisionEmbeddings.length > 0 ? `${referencedRevisionEmbeddings.length}/${revisionEmbeddings.length} reused` : 'N/A', status: effectivenessIssues.filter(i => i.type === 'no-learning-evidence').length === 0 ? '✅' : '⚠️' },
  ],
  'Temporal Realism': [
    { metric: 'Embedding timing', value: embeddingDelays.length > 0 ? `${realisticDelays}/${embeddingDelays.length} realistic` : 'N/A', status: temporalIssues.filter(i => i.type === 'instant-embedding' || i.type === 'delayed-embedding').length === 0 ? '✅' : '⚠️' },
    { metric: 'Retrieval-to-action gaps', value: retrievalActions.length > 0 ? `${realisticActionGaps}/${retrievalActions.length} realistic` : 'N/A', status: temporalIssues.filter(i => i.type === 'instant-action').length === 0 ? '✅' : '⚠️' },
  ],
  'Actor Behavior': [
    { metric: 'Agent scope violations', value: agentEnvelopeViolations.length, status: agentEnvelopeViolations.length === 0 ? '✅' : '⚠️' },
    { metric: 'Decision variety', value: 'Validated', status: behaviorIssues.filter(i => i.type === 'monotonic-decisions').length === 0 ? '✅' : '⚠️' },
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

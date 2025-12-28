import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const scenariosDir = path.join(root, 'src', 'sim', 'scenarios')

/**
 * Validates that scenarios have complete closed loops:
 * 1. Every revision has a corresponding embedding
 * 2. Every boundary_interaction has a corresponding embedding
 * 3. Every retrieval only references chronologically valid embeddings
 * 4. Warns if boundary interactions lack preceding retrieval
 * 5. Warns if scenarios lack historical baseline embeddings
 */

function validateClosedLoops(scenario, filename) {
  const errors = []
  const warnings = []
  
  const events = scenario.events || []
  
  // Build maps for quick lookup
  const embeddings = new Map() // embeddingId → embedding event
  const embeddingsBySource = new Map() // sourceEventId → embedding event
  const eventsByHour = new Map() // hour → [events]
  
  for (const event of events) {
    // Index embeddings
    if (event.type === 'embedding') {
      if (event.embeddingId) {
        embeddings.set(event.embeddingId, event)
      }
      if (event.sourceEventId) {
        embeddingsBySource.set(event.sourceEventId, event)
      }
    }
    
    // Index events by hour
    if (event.hour !== undefined) {
      if (!eventsByHour.has(event.hour)) {
        eventsByHour.set(event.hour, [])
      }
      eventsByHour.get(event.hour).push(event)
    }
  }
  
  // 1. Check: Every revision has an embedding
  const revisions = events.filter(e => e.type === 'revision')
  for (const revision of revisions) {
    const hasEmbedding = embeddingsBySource.has(revision.eventId)
    if (!hasEmbedding) {
      errors.push(
        `Revision at hour ${revision.hour} (${revision.eventId}) is missing required embedding. ` +
        `Add embedding with embeddingType: "revision" and sourceEventId: "${revision.eventId}"`
      )
    }
  }
  
  // 2. Check: Every boundary_interaction has an embedding
  const boundaries = events.filter(e => e.type === 'boundary_interaction')
  for (const boundary of boundaries) {
    const hasEmbedding = embeddingsBySource.has(boundary.eventId)
    if (!hasEmbedding) {
      errors.push(
        `Boundary interaction at hour ${boundary.hour} (${boundary.eventId}) is missing required embedding. ` +
        `Add embedding with embeddingType: "boundary_interaction" and sourceEventId: "${boundary.eventId}"`
      )
    }
  }
  
  // 3. Check: Retrievals only reference existing embeddings
  const retrievals = events.filter(e => e.type === 'retrieval')
  for (const retrieval of retrievals) {
    const retrievedEmbeddings = retrieval.retrievedEmbeddings || []
    for (const embId of retrievedEmbeddings) {
      const emb = embeddings.get(embId)
      if (!emb) {
        errors.push(
          `Retrieval at hour ${retrieval.hour} references non-existent embedding: ${embId}`
        )
      } else if (emb.hour >= retrieval.hour) {
        errors.push(
          `Retrieval at hour ${retrieval.hour} references embedding ${embId} ` +
          `created at hour ${emb.hour} (time paradox - can't retrieve future knowledge)`
        )
      }
    }
  }
  
  // 4. Warn: Boundary interactions should have preceding retrieval
  for (const boundary of boundaries) {
    const actorName = boundary.actorName
    const boundaryHour = boundary.hour
    
    // Look for retrieval within 0.5 hours before boundary
    const hasRecentRetrieval = retrievals.some(r => 
      r.actorName === actorName && 
      r.hour < boundaryHour && 
      (boundaryHour - r.hour) <= 0.5
    )
    
    if (!hasRecentRetrieval) {
      warnings.push(
        `Boundary interaction at hour ${boundaryHour} by ${actorName} lacks preceding retrieval. ` +
        `Consider adding retrieval ~0.5 hours before to show agent "thinking with memory".`
      )
    }
  }
  
  // 5. Warn: Scenarios should have historical baseline embeddings
  const historicalEmbeddings = events.filter(e => 
    e.type === 'embedding' && e.hour < 0
  )
  
  if (historicalEmbeddings.length === 0) {
    warnings.push(
      `Scenario lacks historical baseline embeddings (hour < 0). ` +
      `Agents appear to start with blank memory. Consider adding pre-existing knowledge ` +
      `to make agent behavior realistic.`
    )
  }
  
  // 6. Warn: Steward decisions resolving boundaries should have embeddings
  const stewardDecisions = events.filter(e => 
    e.type === 'decision' && 
    e.actorRole && 
    e.actorRole.includes('Steward')
  )
  
  for (const decision of stewardDecisions) {
    const hasEmbedding = embeddingsBySource.has(decision.eventId)
    if (!hasEmbedding) {
      warnings.push(
        `Steward decision at hour ${decision.hour} (${decision.actorName}) lacks embedding. ` +
        `Consider adding embedding to store human judgment pattern for agent learning.`
      )
    }
  }
  
  return { errors, warnings }
}

async function main() {
  let entries
  try {
    entries = await fs.readdir(scenariosDir, { withFileTypes: true })
  } catch {
    console.error(`No scenarios directory found at ${scenariosDir}`)
    process.exitCode = 1
    return
  }

  const files = entries
    .filter(e => e.isFile())
    .map(e => e.name)
    .filter(name => name.endsWith('.scenario.json'))
    .sort()

  if (!files.length) {
    console.error(`No *.scenario.json files found in ${scenariosDir}`)
    process.exitCode = 1
    return
  }

  let hadErrors = false
  
  console.log('\n=== Closed Loop Validation ===\n')

  for (const name of files) {
    const filePath = path.join(scenariosDir, name)
    const raw = await fs.readFile(filePath, 'utf8')
    
    let scenario
    try {
      scenario = JSON.parse(raw)
    } catch (err) {
      console.error(`[FAIL] ${name} - Invalid JSON: ${err.message}`)
      hadErrors = true
      continue
    }
    
    const { errors, warnings } = validateClosedLoops(scenario, name)
    
    if (errors.length > 0) {
      hadErrors = true
      console.error(`\n[FAIL] ${name}`)
      for (const e of errors) {
        console.error(`  ❌ ${e}`)
      }
    }
    
    if (warnings.length > 0) {
      console.warn(`\n[WARN] ${name}`)
      for (const w of warnings) {
        console.warn(`  ⚠️  ${w}`)
      }
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log(`[OK] ${name} - All closed loops validated`)
    }
  }
  
  if (hadErrors) {
    console.error('\n❌ Closed loop validation failed. See errors above.')
    process.exitCode = 1
  } else {
    console.log('\n✅ All closed loop validations passed!')
  }
}

await main()

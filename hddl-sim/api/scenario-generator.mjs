/**
 * HDDL Scenario Generator
 * 
 * Generates complete HDDL scenarios from natural language prompts.
 * Uses Gemini to create structurally valid, conformance-passing scenarios.
 * 
 * Constraints:
 * - 30-40 events (includes envelope lifecycle + feedback loops)
 * - 9-15 agents across 3 fleets (manageable complexity, distributed work)
 * - 3-5 envelopes (clear boundaries, multiple governance domains)
 * - 3 stewards (one per envelope for clear ownership)
 * - Full feedback loops (every revision/boundary gets embedding)
 * - Envelope lifecycle (open at start, close at end)
 * - Chronologically valid retrievals
 */

import { VertexAI } from '@google-cloud/vertexai';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load schema
let scenarioSchema;
async function loadSchema() {
  if (!scenarioSchema) {
    const schemaPath = join(__dirname, '..', 'schemas', 'hddl-scenario.schema.json');
    scenarioSchema = JSON.parse(await readFile(schemaPath, 'utf-8'));
  }
  return scenarioSchema;
}

/**
 * Generate a complete HDDL scenario from a user prompt.
 * 
 * @param {string} userPrompt - Natural language description of desired scenario
 * @returns {Promise<{scenario: Object, validationWarnings: string[]}>}
 */
export async function generateScenario(userPrompt) {
  const startTime = Date.now();
  
  try {
    // Step 1: Create skeleton structure with perfect chronology and counts
    const skeleton = createScenarioSkeleton();
    
    // Step 2: Ask LLM to fill in narrative/creative elements
    const narrativePrompt = buildNarrativePrompt(userPrompt, skeleton);
    const geminiResult = await generateWithGemini(narrativePrompt, '');
    
    // Check if response was truncated
    if (geminiResult.finishReason === 'MAX_TOKENS') {
      throw new Error('Response truncated: Increase maxOutputTokens in generationConfig');
    }
    
    // Parse LLM response
    let jsonText = geminiResult.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    }
    
    let narrativeData;
    try {
      narrativeData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      console.error('Response length:', jsonText.length);
      console.error('Last 200 chars:', jsonText.slice(-200));
      console.error('Finish reason:', geminiResult.finishReason);
      throw new Error(`JSON parse failed: ${parseError.message}. Response may be truncated (length: ${jsonText.length}, finish: ${geminiResult.finishReason})`);
    }

    // Step 2.5: Enforce generator contract: the LLM must not change structure.
    // It may only replace ALL_CAPS placeholder strings.
    validateScenarioMatchesSkeleton(skeleton, narrativeData);
    
    // Step 3: Merge skeleton structure with narrative data
    const scenario = mergeSkeletonWithNarrative(skeleton, narrativeData);

    // Step 3.5: Deterministically ensure envelope objects reflect latest revision state.
    // Aligns with analyzer expectations and prevents envelope/revision drift.
    reconcileEnvelopeStateFromRevisions(scenario);
    
    // Validate structure (strict: fail fast on critical issues)
    const { warnings, errors } = validateScenario(scenario);
    if (errors.length > 0) {
      const topErrors = errors.slice(0, 8).map(e => `- ${e}`).join('\n')
      throw new Error(`Generated scenario failed validation:\n${topErrors}${errors.length > 8 ? `\n- ...and ${errors.length - 8} more` : ''}`)
    }
    
    const duration = (Date.now() - startTime) / 1000;
    
    // Calculate cost: Gemini 3 Flash Preview pricing
    // Input: $0.50 per 1M tokens, Output: $3.00 per 1M tokens
    const inputCost = (geminiResult.tokensIn * 0.50 / 1_000_000);
    const outputCost = (geminiResult.tokensOut * 3.00 / 1_000_000);
    const totalCost = inputCost + outputCost;
    
    return {
      scenario,
      validationWarnings: warnings,
      metadata: {
        model: 'gemini-2.5-flash-lite',
        tokensIn: geminiResult.tokensIn,
        tokensOut: geminiResult.tokensOut,
        cost: parseFloat(totalCost.toFixed(6)),
        duration,
        generatedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    throw new Error(`Scenario generation failed: ${error.message}`);
  }
}

/**
 * Create a perfect skeleton structure with proper chronology and counts
 */
function createScenarioSkeleton() {
  const scenarioId = `generated-scenario-${Date.now()}`;
  
  // Create 9 agents across 3 fleets (3 agents per fleet)
  const fleet1Agents = [
    { agentId: 'agent-001', name: 'AGENT_NAME_1', role: 'AGENT_ROLE_1', envelopeIds: ['ENV-001', 'ENV-002'] },
    { agentId: 'agent-002', name: 'AGENT_NAME_2', role: 'AGENT_ROLE_2', envelopeIds: ['ENV-001'] },
    { agentId: 'agent-003', name: 'AGENT_NAME_3', role: 'AGENT_ROLE_3', envelopeIds: ['ENV-002'] }
  ];
  
  const fleet2Agents = [
    { agentId: 'agent-004', name: 'AGENT_NAME_4', role: 'AGENT_ROLE_4', envelopeIds: ['ENV-002', 'ENV-003'] },
    { agentId: 'agent-005', name: 'AGENT_NAME_5', role: 'AGENT_ROLE_5', envelopeIds: ['ENV-003'] },
    { agentId: 'agent-006', name: 'AGENT_NAME_6', role: 'AGENT_ROLE_6', envelopeIds: ['ENV-001', 'ENV-003'] }
  ];
  
  const fleet3Agents = [
    { agentId: 'agent-007', name: 'AGENT_NAME_7', role: 'AGENT_ROLE_7', envelopeIds: ['ENV-001'] },
    { agentId: 'agent-008', name: 'AGENT_NAME_8', role: 'AGENT_ROLE_8', envelopeIds: ['ENV-002', 'ENV-003'] },
    { agentId: 'agent-009', name: 'AGENT_NAME_9', role: 'AGENT_ROLE_9', envelopeIds: ['ENV-003'] }
  ];
  
  // Create 3 envelopes with 3 different stewards
  const envelopes = [
    {
      envelopeId: 'ENV-001',
      name: 'ENVELOPE_NAME_1',
      domain: 'DOMAIN_NAME',
      ownerRole: 'STEWARD_ROLE_1',
      createdHour: 0,
      endHour: 72,
      envelope_version: 1,
      assumptions: ['ASSUMPTION_1', 'ASSUMPTION_2'],
      constraints: ['CONSTRAINT_1', 'CONSTRAINT_2']
    },
    {
      envelopeId: 'ENV-002',
      name: 'ENVELOPE_NAME_2',
      domain: 'DOMAIN_NAME',
      ownerRole: 'STEWARD_ROLE_2',
      createdHour: 0,
      endHour: 72,
      envelope_version: 1,
      assumptions: ['ASSUMPTION_3', 'ASSUMPTION_4'],
      constraints: ['CONSTRAINT_3', 'CONSTRAINT_4']
    },
    {
      envelopeId: 'ENV-003',
      name: 'ENVELOPE_NAME_3',
      domain: 'DOMAIN_NAME',
      ownerRole: 'STEWARD_ROLE_3',
      createdHour: 0,
      endHour: 72,
      envelope_version: 1,
      assumptions: ['ASSUMPTION_5', 'ASSUMPTION_6'],
      constraints: ['CONSTRAINT_5', 'CONSTRAINT_6']
    }
  ];
  
  // Create exactly 42 events - chronologically sorted
  const events = [
    // Historical baseline embeddings
    { hour: -48, type: 'embedding', eventId: 'EMB-BASE-001', embeddingId: 'EMB-BASE-001', 
      embeddingType: 'revision', sourceEventId: 'historical', envelopeId: 'ENV-001',
      semanticContext: 'CONTEXT_1', semanticVector: [0.25, 0.30], chunkText: 'SUMMARY_1' },
    { hour: -24, type: 'embedding', eventId: 'EMB-BASE-002', embeddingId: 'EMB-BASE-002',
      embeddingType: 'revision', sourceEventId: 'historical', envelopeId: 'ENV-002',
      semanticContext: 'CONTEXT_2', semanticVector: [0.70, 0.25], chunkText: 'SUMMARY_2' },
    { hour: -12, type: 'embedding', eventId: 'EMB-BASE-003', embeddingId: 'EMB-BASE-003',
      embeddingType: 'decision', sourceEventId: 'historical', envelopeId: 'ENV-003',
      semanticContext: 'CONTEXT_3', semanticVector: [0.60, 0.40], chunkText: 'SUMMARY_3' },
    
    // Hour 0: First envelope opens
    { hour: 0, type: 'envelope_promoted', eventId: 'envelope-open:1', envelopeId: 'ENV-001',
      envelope_version: 1, actorRole: 'STEWARD_ROLE_1', actorName: 'STEWARD_NAME_1',
      summary: 'ENVELOPE_OPEN_SUMMARY_1' },
    
    // Hour 2: Early signal
    { hour: 2, type: 'signal', eventId: 'signal:1', envelopeId: 'ENV-001',
      signalType: 'SIGNAL_TYPE_1', signalKey: 'SIGNAL_KEY_1', severity: 'SIGNAL_SEVERITY_1',
      source: 'SIGNAL_SOURCE_1', summary: 'SIGNAL_SUMMARY_1' },
    
    // Hour 8: Second envelope opens
    { hour: 8, type: 'envelope_promoted', eventId: 'envelope-open:2', envelopeId: 'ENV-002',
      envelope_version: 1, actorRole: 'STEWARD_ROLE_2', actorName: 'STEWARD_NAME_2',
      summary: 'ENVELOPE_OPEN_SUMMARY_2' },
    
    // Hour 12-14: First learning cycle - ENV-001
    { hour: 12, type: 'decision', eventId: 'decision:1', actorRole: 'agent', actorName: 'agent-001',
      agentId: 'agent-001', envelopeId: 'ENV-001', status: 'allowed', summary: 'DECISION_SUMMARY_1' },
    { hour: 14, type: 'decision', eventId: 'decision:2', actorRole: 'agent', actorName: 'agent-002',
      agentId: 'agent-002', envelopeId: 'ENV-001', status: 'allowed', summary: 'DECISION_SUMMARY_2' },
    
    // Hour 16: Third envelope opens
    { hour: 16, type: 'envelope_promoted', eventId: 'envelope-open:3', envelopeId: 'ENV-003',
      envelope_version: 1, actorRole: 'STEWARD_ROLE_3', actorName: 'STEWARD_NAME_3',
      summary: 'ENVELOPE_OPEN_SUMMARY_3' },
    
    // Hour 17: Signal before first boundary
    { hour: 17, type: 'signal', eventId: 'signal:2', envelopeId: 'ENV-001',
      signalType: 'SIGNAL_TYPE_2', signalKey: 'SIGNAL_KEY_2', severity: 'SIGNAL_SEVERITY_2',
      source: 'SIGNAL_SOURCE_2', summary: 'SIGNAL_SUMMARY_2' },
    
    // First boundary interaction - ENV-001 (hours 18-22)
    { hour: 18, type: 'boundary_interaction', eventId: 'boundary:1', actorRole: 'agent',
      actorName: 'agent-007', agentId: 'agent-007', envelopeId: 'ENV-001',
      boundary_kind: 'escalated', boundary_reason: 'REASON_1', summary: 'BOUNDARY_SUMMARY_1' },
    { hour: 18.5, type: 'embedding', eventId: 'EMB-001', embeddingId: 'EMB-001',
      embeddingType: 'boundary_interaction', sourceEventId: 'boundary:1', envelopeId: 'ENV-001',
      semanticContext: 'CONTEXT_4', semanticVector: [0.75, 0.70], chunkText: 'SUMMARY_4' },
    { hour: 20, type: 'decision', eventId: 'decision:3', actorRole: 'STEWARD_ROLE_1',
      actorName: 'STEWARD_NAME_1', envelopeId: 'ENV-001', status: 'allowed',
      resolvesEventId: 'boundary:1', summary: 'STEWARD_DECISION_1' },
    { hour: 20.5, type: 'embedding', eventId: 'EMB-002', embeddingId: 'EMB-002',
      embeddingType: 'decision', sourceEventId: 'decision:3', envelopeId: 'ENV-001',
      actorRole: 'STEWARD_ROLE_1', actorName: 'STEWARD_NAME_1',
      semanticContext: 'CONTEXT_5', semanticVector: [0.65, 0.60], chunkText: 'SUMMARY_5' },
    { hour: 22, type: 'revision', eventId: 'revision:1', envelopeId: 'ENV-001',
      envelope_version: 2, revision_id: 'rev-1', resolvesEventId: 'boundary:1',
      actorRole: 'STEWARD_ROLE_1', actorName: 'STEWARD_NAME_1',
      nextAssumptions: ['NEW_ASSUMPTION_1'], nextConstraints: ['NEW_CONSTRAINT_1'],
      summary: 'REVISION_SUMMARY_1' },
    { hour: 22.5, type: 'embedding', eventId: 'EMB-003', embeddingId: 'EMB-003',
      embeddingType: 'revision', sourceEventId: 'revision:1', envelopeId: 'ENV-001',
      actorRole: 'STEWARD_ROLE_1', actorName: 'STEWARD_NAME_1',
      semanticContext: 'CONTEXT_6', semanticVector: [0.35, 0.65], chunkText: 'SUMMARY_6' },
    
    // Timeline gap: hours 23-29 (quiet period)
    
    // Second boundary interaction - ENV-002 (hours 30-36)
    { hour: 30, type: 'retrieval', eventId: 'retrieval:1', actorRole: 'agent',
      actorName: 'agent-003', agentId: 'agent-003', queryText: 'QUERY_1',
      retrievedEmbeddings: ['EMB-BASE-001', 'EMB-001', 'EMB-003'], relevanceScores: [0.85, 0.92, 0.78],
      summary: 'RETRIEVAL_SUMMARY_1' },
    { hour: 31, type: 'boundary_interaction', eventId: 'boundary:2', actorRole: 'agent',
      actorName: 'agent-003', agentId: 'agent-003', envelopeId: 'ENV-002',
      boundary_kind: 'escalated', boundary_reason: 'REASON_2', summary: 'BOUNDARY_SUMMARY_2' },
    { hour: 31.5, type: 'embedding', eventId: 'EMB-004', embeddingId: 'EMB-004',
      embeddingType: 'boundary_interaction', sourceEventId: 'boundary:2', envelopeId: 'ENV-002',
      semanticContext: 'CONTEXT_7', semanticVector: [0.80, 0.75], chunkText: 'SUMMARY_7' },
    { hour: 33, type: 'decision', eventId: 'decision:4', actorRole: 'STEWARD_ROLE_2',
      actorName: 'STEWARD_NAME_2', envelopeId: 'ENV-002', status: 'denied',
      resolvesEventId: 'boundary:2', summary: 'STEWARD_DECISION_2' },
    { hour: 33.5, type: 'embedding', eventId: 'EMB-005', embeddingId: 'EMB-005',
      embeddingType: 'decision', sourceEventId: 'decision:4', envelopeId: 'ENV-002',
      actorRole: 'STEWARD_ROLE_2', actorName: 'STEWARD_NAME_2',
      semanticContext: 'CONTEXT_8', semanticVector: [0.68, 0.62], chunkText: 'SUMMARY_8' },
    { hour: 35, type: 'revision', eventId: 'revision:2', envelopeId: 'ENV-002',
      envelope_version: 2, revision_id: 'rev-2', resolvesEventId: 'boundary:2',
      actorRole: 'STEWARD_ROLE_2', actorName: 'STEWARD_NAME_2',
      nextAssumptions: ['NEW_ASSUMPTION_3'], nextConstraints: ['NEW_CONSTRAINT_3'],
      summary: 'REVISION_SUMMARY_2' },
    { hour: 35.5, type: 'embedding', eventId: 'EMB-006', embeddingId: 'EMB-006',
      embeddingType: 'revision', sourceEventId: 'revision:2', envelopeId: 'ENV-002',
      actorRole: 'STEWARD_ROLE_2', actorName: 'STEWARD_NAME_2',
      semanticContext: 'CONTEXT_9', semanticVector: [0.30, 0.68], chunkText: 'SUMMARY_9' },
    
    // Hour 38: Signal before third envelope activity
    { hour: 38, type: 'signal', eventId: 'signal:3', envelopeId: 'ENV-002',
      signalType: 'SIGNAL_TYPE_3', signalKey: 'SIGNAL_KEY_3', severity: 'SIGNAL_SEVERITY_3',
      source: 'SIGNAL_SOURCE_3', summary: 'SIGNAL_SUMMARY_3' },
    
    // Hour 39.5-44.5: Third boundary interaction - ENV-003
    { hour: 39.5, type: 'retrieval', eventId: 'retrieval:2', actorRole: 'agent',
      actorName: 'agent-005', agentId: 'agent-005', queryText: 'QUERY_2',
      retrievedEmbeddings: ['EMB-BASE-002', 'EMB-BASE-003', 'EMB-004', 'EMB-006'], relevanceScores: [0.88, 0.85, 0.91, 0.83],
      summary: 'RETRIEVAL_SUMMARY_2' },
    { hour: 40, type: 'boundary_interaction', eventId: 'boundary:3', actorRole: 'agent',
      actorName: 'agent-005', agentId: 'agent-005', envelopeId: 'ENV-003',
      boundary_kind: 'escalated', boundary_reason: 'REASON_3', summary: 'BOUNDARY_SUMMARY_3' },
    { hour: 40.5, type: 'embedding', eventId: 'EMB-007', embeddingId: 'EMB-007',
      embeddingType: 'boundary_interaction', sourceEventId: 'boundary:3', envelopeId: 'ENV-003',
      semanticContext: 'CONTEXT_10', semanticVector: [0.82, 0.78], chunkText: 'SUMMARY_10' },
    { hour: 42, type: 'decision', eventId: 'decision:5', actorRole: 'STEWARD_ROLE_3',
      actorName: 'STEWARD_NAME_3', envelopeId: 'ENV-003', status: 'allowed',
      resolvesEventId: 'boundary:3', summary: 'STEWARD_DECISION_3' },
    { hour: 42.5, type: 'embedding', eventId: 'EMB-008', embeddingId: 'EMB-008',
      embeddingType: 'decision', sourceEventId: 'decision:5', envelopeId: 'ENV-003',
      actorRole: 'STEWARD_ROLE_3', actorName: 'STEWARD_NAME_3',
      semanticContext: 'CONTEXT_11', semanticVector: [0.70, 0.65], chunkText: 'SUMMARY_11' },
    { hour: 44, type: 'revision', eventId: 'revision:3', envelopeId: 'ENV-003',
      envelope_version: 2, revision_id: 'rev-3', resolvesEventId: 'boundary:3',
      actorRole: 'STEWARD_ROLE_3', actorName: 'STEWARD_NAME_3',
      nextAssumptions: ['NEW_ASSUMPTION_5'], nextConstraints: ['NEW_CONSTRAINT_5'],
      summary: 'REVISION_SUMMARY_3' },
    { hour: 44.5, type: 'embedding', eventId: 'EMB-009', embeddingId: 'EMB-009',
      embeddingType: 'revision', sourceEventId: 'revision:3', envelopeId: 'ENV-003',
      actorRole: 'STEWARD_ROLE_3', actorName: 'STEWARD_NAME_3',
      semanticContext: 'CONTEXT_12', semanticVector: [0.32, 0.72], chunkText: 'SUMMARY_12' },
    
    // Hours 45-53: Timeline gap (quiet period)
    
    // Hour 54: Signal before envelope closures
    { hour: 54, type: 'signal', eventId: 'signal:4', envelopeId: 'ENV-003',
      signalType: 'SIGNAL_TYPE_4', signalKey: 'SIGNAL_KEY_4', severity: 'SIGNAL_SEVERITY_4',
      source: 'SIGNAL_SOURCE_4', summary: 'SIGNAL_SUMMARY_4' },
    
    // Hours 60-72: Staggered envelope closures
    { hour: 60, type: 'envelope_deprecated', eventId: 'envelope-close:1', envelopeId: 'ENV-001',
      envelope_version: 2, actorRole: 'STEWARD_ROLE_1', actorName: 'STEWARD_NAME_1',
      summary: 'ENVELOPE_CLOSE_SUMMARY_1' },
    { hour: 66, type: 'envelope_deprecated', eventId: 'envelope-close:2', envelopeId: 'ENV-002',
      envelope_version: 2, actorRole: 'STEWARD_ROLE_2', actorName: 'STEWARD_NAME_2',
      summary: 'ENVELOPE_CLOSE_SUMMARY_2' },
    { hour: 72, type: 'envelope_deprecated', eventId: 'envelope-close:3', envelopeId: 'ENV-003',
      envelope_version: 2, actorRole: 'STEWARD_ROLE_3', actorName: 'STEWARD_NAME_3',
      summary: 'ENVELOPE_CLOSE_SUMMARY_3' }
  ];
  
  return {
    schemaVersion: 2,
    id: scenarioId,
    title: 'SCENARIO_TITLE',
    durationHours: 72,
    envelopes,
    fleets: [
      {
        stewardRole: 'STEWARD_ROLE_1',
        agents: fleet1Agents
      },
      {
        stewardRole: 'STEWARD_ROLE_2',
        agents: fleet2Agents
      },
      {
        stewardRole: 'STEWARD_ROLE_3',
        agents: fleet3Agents
      }
    ],
    events
  };
}

/**
 * Build prompt asking LLM to fill in narrative elements
 * Uses schema-only approach for minimal tokens and fast generation
 */
function buildNarrativePrompt(userPrompt, skeleton) {
  // Use NO formatting to minimize tokens
  const compactSkeleton = JSON.stringify(skeleton);
  
  return `You are a JSON generator. Output ONLY valid JSON. No markdown or explanations.

ABSOLUTE RULES (NON-NEGOTIABLE):
- Output must be a single JSON object.
- Do NOT add, remove, reorder, or rename any keys.
- Do NOT add or remove envelopes, fleets, agents, or events.
- Do NOT change any eventId, envelopeId, agentId, hour, type, or resolvesEventId.
- ONLY replace ALL_CAPS placeholder strings with real values.

REQUEST: ${userPrompt}

Replace ALL_CAPS placeholders. Be CONCISE (≤80 chars per string).

${compactSkeleton}

ENVELOPE MODEL (CRITICAL):
- Exactly ONE envelope object per envelopeId (no duplicates in scenario.envelopes).
- Each envelope must be active for the full scenario: createdHour near start (0-2) and endHour = durationHours.
- DO NOT create separate envelope entries for v2/v3. Use revision events to evolve the envelope.

REVISION MODEL (CRITICAL):
- Every revision MUST include: envelopeId, envelope_version (integer), revision_id (string), nextAssumptions (array), nextConstraints (array).
- nextAssumptions/nextConstraints must be the full updated lists (not deltas).
- Revisions that change a version should occur before the changed policy is used by later events.

ENVELOPE STATE (CRITICAL):
- The envelope objects in scenario.envelopes must reflect the LATEST state:
  - envelope.envelope_version must equal the latest version after revisions.
  - envelope.assumptions must match the latest revision.nextAssumptions.
  - envelope.constraints must match the latest revision.nextConstraints.

WINDOW CONSISTENCY (CRITICAL):
- For events at hour >= 0: every event with an envelopeId must occur within that envelope's createdHour..endHour.
- Historical baseline events (hour < 0) may reference envelopes as pre-existing memory.

AGENT SCOPE (CRITICAL):
- If an event has agentId (or actorRole 'agent'), its envelopeId MUST be one of that agent's envelopeIds from fleets[].agents[].
- Do NOT invent new agentIds.

BOUNDARY COMPLETENESS (CRITICAL):
- Every boundary_interaction MUST include boundary_kind (either "escalated" or "overridden").
- Every boundary_interaction MUST be resolved by a steward decision (decision.resolvesEventId = that boundary eventId).
- Every boundary_interaction MUST be followed by a revision (revision.resolvesEventId = that boundary eventId).

AGENT NAMING: Agents are software. Name them after their function or domain object:
- Healthcare: "Triage Bot", "Diagnosis Engine", "Med Checker"
- Insurance: "Claims Validator", "Risk Scorer", "Policy Bot"
- Finance: "Credit Analyzer", "Fraud Detector", "Loan Processor"
- General: "Data Processor", "Workflow Engine", "Query Handler"
- NOT people names: Avoid "Sarah", "Marcus", "John", etc.

CRITICAL: STEWARD_ROLE_1/2/3 MUST be DISTINCT names. Use IDENTICAL names in:
- fleets[0].stewardRole and envelopes[0].ownerRole (both use STEWARD_ROLE_1)
- fleets[1].stewardRole and envelopes[1].ownerRole (both use STEWARD_ROLE_2)
- fleets[2].stewardRole and envelopes[2].ownerRole (both use STEWARD_ROLE_3)
Example: If fleet has "Quality Manager", envelope MUST use "Quality Manager" exactly.

MAX LENGTHS: titles≤60, names≤30, roles≤40, summaries≤100.

Output JSON only.`;
}

/**
 * Merge skeleton structure with LLM-generated narrative
 */
function mergeSkeletonWithNarrative(skeleton, narrative) {
  if (!narrative || typeof narrative !== 'object') return skeleton

  const merged = mergeByPlaceholder(skeleton, narrative)

  // Stabilize array merges by ID to avoid order drift.
  // Envelopes: merge by envelopeId
  if (Array.isArray(skeleton.envelopes)) {
    const narrativeByEnvelopeId = new Map((narrative.envelopes || []).map(e => [e?.envelopeId, e]))
    merged.envelopes = skeleton.envelopes.map(env => mergeByPlaceholder(env, narrativeByEnvelopeId.get(env?.envelopeId) || {}))
  }

  // Fleets/agents: merge fleets by index; agents by agentId
  if (Array.isArray(skeleton.fleets)) {
    merged.fleets = skeleton.fleets.map((fleet, fleetIdx) => {
      const nFleet = (Array.isArray(narrative.fleets) ? narrative.fleets[fleetIdx] : null) || {}
      const outFleet = mergeByPlaceholder(fleet, nFleet)

      if (Array.isArray(fleet?.agents)) {
        const nAgentsById = new Map((nFleet.agents || []).map(a => [a?.agentId, a]))
        outFleet.agents = fleet.agents.map(a => mergeByPlaceholder(a, nAgentsById.get(a?.agentId) || {}))
      }

      return outFleet
    })
  }

  // Events: merge by eventId (preserve skeleton ordering and immutable fields)
  if (Array.isArray(skeleton.events)) {
    const narrativeByEventId = new Map((narrative.events || []).map(e => [e?.eventId, e]))
    merged.events = skeleton.events.map(ev => mergeByPlaceholder(ev, narrativeByEventId.get(ev?.eventId) || {}))
  }

  return merged
}

function isAllCapsPlaceholder(value) {
  return typeof value === 'string' && /^[A-Z0-9_]+$/.test(value)
}

function mergeByPlaceholder(skeletonValue, narrativeValue) {
  // If the skeleton declares a placeholder string, allow replacement.
  if (isAllCapsPlaceholder(skeletonValue)) {
    return (typeof narrativeValue === 'string' && narrativeValue.trim() !== '') ? narrativeValue : skeletonValue
  }

  // Arrays: merge by index, preserving skeleton length and non-placeholder scalars.
  if (Array.isArray(skeletonValue)) {
    const nArr = Array.isArray(narrativeValue) ? narrativeValue : []
    return skeletonValue.map((sv, idx) => mergeByPlaceholder(sv, nArr[idx]))
  }

  // Objects: merge only keys present in skeleton; ignore extra keys from narrative.
  if (skeletonValue && typeof skeletonValue === 'object') {
    const nObj = (narrativeValue && typeof narrativeValue === 'object') ? narrativeValue : {}
    const out = Array.isArray(skeletonValue) ? [] : {}
    for (const key of Object.keys(skeletonValue)) {
      out[key] = mergeByPlaceholder(skeletonValue[key], nObj[key])
    }
    return out
  }

  // Numbers/booleans/null/real strings are treated as immutable.
  return skeletonValue
}

/**
 * Generate content using Vertex AI Gemini
 */
async function generateWithGemini(systemPrompt, userPrompt) {
  const project = process.env.GOOGLE_CLOUD_PROJECT || 'hddl-narrative-gen';
  
  const vertexAI = new VertexAI({ 
    project, 
    location: 'global',
    apiEndpoint: 'aiplatform.googleapis.com'
  });
  
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      maxOutputTokens: 16384,
      temperature: 0.1,  // Lower = faster, more consistent
      topP: 0.95,
    },
  });
  
  const prompt = `${systemPrompt}

USER REQUEST:
${userPrompt}`;
  
  const result = await model.generateContent(prompt);
  const text = result.response.candidates[0].content.parts[0].text;
  const finishReason = result.response.candidates[0].finishReason;
  
  const usage = result.response.usageMetadata || {};
  
  return {
    text,
    tokensIn: usage.promptTokenCount || 0,
    tokensOut: usage.candidatesTokenCount || 0,
    finishReason
  };
}

/**
 * Validate generated scenario structure and patterns
 */
function validateScenario(scenario) {
  const warnings = [];
  const errors = [];
  
  // Check required top-level fields
  if (!scenario.schemaVersion) warnings.push('Missing required field: schemaVersion');
  if (!scenario.id) warnings.push('Missing required field: id');
  if (!scenario.title) warnings.push('Missing required field: title');
  if (!scenario.durationHours) warnings.push('Missing required field: durationHours');
  if (!scenario.envelopes) warnings.push('Missing required field: envelopes');
  if (!scenario.fleets) warnings.push('Missing required field: fleets');
  if (!scenario.events) warnings.push('Missing required field: events');

  // Stop early if structural fields missing
  if (!scenario.envelopes || !scenario.events || !scenario.durationHours) {
    return { warnings, errors: ['Scenario missing envelopes/events/durationHours'] };
  }

  // EnvelopeId uniqueness (generator contract)
  const envelopeIds = scenario.envelopes.map(e => e.envelopeId).filter(Boolean)
  const uniqueEnvelopeIds = new Set(envelopeIds)
  if (uniqueEnvelopeIds.size !== envelopeIds.length) {
    errors.push('Duplicate envelopeId entries found in scenario.envelopes (generator requires one envelope object per envelopeId)')
  }

  // Envelope time bounds
  scenario.envelopes.forEach(env => {
    if (typeof env.createdHour !== 'number' || typeof env.endHour !== 'number') {
      errors.push(`Envelope ${env.envelopeId} missing createdHour/endHour`) 
      return
    }
    if (env.createdHour < 0 || env.endHour > scenario.durationHours || env.createdHour >= env.endHour) {
      errors.push(`Envelope ${env.envelopeId} has invalid time window ${env.createdHour}-${env.endHour} for durationHours=${scenario.durationHours}`)
    }
  })

  // Event-in-envelope-window check
  const envelopeWindowById = new Map(scenario.envelopes.map(env => [env.envelopeId, env]))
  scenario.events.forEach(e => {
    if (!e || !e.envelopeId || typeof e.hour !== 'number') return
    // Historical baseline events (hour < 0) are allowed to reference envelopes as pre-existing memory.
    if (e.hour < 0) return
    const env = envelopeWindowById.get(e.envelopeId)
    if (!env) {
      errors.push(`Event at hour ${e.hour} references unknown envelopeId ${e.envelopeId}`)
      return
    }
    if (e.hour < env.createdHour || e.hour > env.endHour) {
      errors.push(`Event at hour ${e.hour} for ${e.envelopeId} occurs outside envelope window ${env.createdHour}-${env.endHour}`)
    }
  })

  // Agent scope check: event envelopeId must be in agent.envelopeIds
  const allowedEnvelopesByAgentId = new Map()
  scenario.fleets?.forEach(fleet => {
    fleet?.agents?.forEach(agent => {
      if (!agent?.agentId) return
      const allowed = Array.isArray(agent.envelopeIds) ? agent.envelopeIds : []
      allowedEnvelopesByAgentId.set(agent.agentId, new Set(allowed))
    })
  })

  scenario.events.forEach(e => {
    if (!e || typeof e.hour !== 'number') return
    const agentId = e.agentId
    const isAgentEvent = e.actorRole === 'agent' || Boolean(agentId)
    if (!isAgentEvent) return
    if (!agentId) {
      errors.push(`Agent event at hour ${e.hour} is missing agentId`) 
      return
    }
    const allowedSet = allowedEnvelopesByAgentId.get(agentId)
    if (!allowedSet) {
      errors.push(`Event at hour ${e.hour} references unknown agentId ${agentId}`)
      return
    }
    if (e.envelopeId && !allowedSet.has(e.envelopeId)) {
      errors.push(`Agent ${agentId} used outside scope: event at hour ${e.hour} targets ${e.envelopeId}, allowed: ${Array.from(allowedSet).join(', ')}`)
    }
  })
  
  // Check event count
  const eventCount = scenario.events?.length || 0;
  if (eventCount < 40 || eventCount > 50) {
    warnings.push(`Event count ${eventCount} outside recommended range 40-50`);
  }
  
  // Check actor count
  let agentCount = 0;
  scenario.fleets?.forEach(fleet => {
    agentCount += fleet.agents?.length || 0;
  });
  if (agentCount < 9 || agentCount > 15) {
    warnings.push(`Agent count ${agentCount} outside recommended range 9-15`);
  }
  
  // Check envelope count
  const envelopeCount = scenario.envelopes?.length || 0;
  if (envelopeCount < 3 || envelopeCount > 5) {
    warnings.push(`Envelope count ${envelopeCount} outside recommended range 3-5`);
  }
  
  // Validate feedback loops
  const events = scenario.events || [];
  const revisions = events.filter(e => e.type === 'revision');
  const boundaries = events.filter(e => e.type === 'boundary_interaction');
  const embeddings = events.filter(e => e.type === 'embedding');

  // Envelope state must reflect latest revision
  const envById = new Map((scenario.envelopes || []).map(env => [env.envelopeId, env]))
  const revisionsByEnv = new Map()
  revisions.forEach(r => {
    if (!r?.envelopeId) return
    if (!revisionsByEnv.has(r.envelopeId)) revisionsByEnv.set(r.envelopeId, [])
    revisionsByEnv.get(r.envelopeId).push(r)
  })

  for (const [envelopeId, env] of envById.entries()) {
    const envRevs = (revisionsByEnv.get(envelopeId) || []).slice().sort((a, b) => (a.hour ?? 0) - (b.hour ?? 0))
    if (envRevs.length === 0) continue
    const lastRev = envRevs[envRevs.length - 1]

    if (env.envelope_version == null || lastRev.envelope_version == null) {
      errors.push(`Envelope ${envelopeId} or its latest revision is missing envelope_version`)
    } else if (env.envelope_version !== lastRev.envelope_version) {
      errors.push(`Envelope ${envelopeId} envelope_version (${env.envelope_version}) does not match latest revision (${lastRev.envelope_version})`)
    }

    if (Array.isArray(lastRev.nextAssumptions) && JSON.stringify(env.assumptions || []) !== JSON.stringify(lastRev.nextAssumptions)) {
      errors.push(`Envelope ${envelopeId} assumptions do not match latest revision.nextAssumptions (rev ${lastRev.eventId || lastRev.revision_id || 'unknown'})`)
    }
    if (Array.isArray(lastRev.nextConstraints) && JSON.stringify(env.constraints || []) !== JSON.stringify(lastRev.nextConstraints)) {
      errors.push(`Envelope ${envelopeId} constraints do not match latest revision.nextConstraints (rev ${lastRev.eventId || lastRev.revision_id || 'unknown'})`)
    }
  }
  
  const revisionEmbeddings = embeddings.filter(e => e.embeddingType === 'revision');
  const boundaryEmbeddings = embeddings.filter(e => e.embeddingType === 'boundary_interaction');
  
  if (revisionEmbeddings.length < revisions.length) {
    warnings.push(`Missing embeddings: ${revisions.length - revisionEmbeddings.length} revisions lack embeddings`);
  }
  
  if (boundaryEmbeddings.length < boundaries.length) {
    warnings.push(`Missing embeddings: ${boundaries.length - boundaryEmbeddings.length} boundaries lack embeddings`);
  }

  // Boundary kind required + must be valid
  const allowedBoundaryKinds = new Set(['escalated', 'overridden'])
  boundaries.forEach(b => {
    if (!b.eventId) {
      errors.push('boundary_interaction missing eventId')
      return
    }
    if (!b.boundary_kind) {
      errors.push(`Boundary ${b.eventId} missing boundary_kind`)
    } else if (!allowedBoundaryKinds.has(b.boundary_kind)) {
      errors.push(`Boundary ${b.eventId} has invalid boundary_kind: ${b.boundary_kind}`)
    }
  })

  // Boundary must be resolved by steward decision + revision
  const decisions = events.filter(e => e.type === 'decision')
  const revisionByResolves = new Map()
  revisions.forEach(r => {
    if (r?.resolvesEventId) revisionByResolves.set(r.resolvesEventId, r)
  })
  const decisionsByResolves = new Map()
  decisions.forEach(d => {
    if (!d?.resolvesEventId) return
    if (!decisionsByResolves.has(d.resolvesEventId)) decisionsByResolves.set(d.resolvesEventId, [])
    decisionsByResolves.get(d.resolvesEventId).push(d)
  })

  boundaries.forEach(b => {
    const resolvingDecisions = decisionsByResolves.get(b.eventId) || []
    if (resolvingDecisions.length === 0) {
      errors.push(`Boundary ${b.eventId} has no resolving decision (decision.resolvesEventId)`)
    }
    const revision = revisionByResolves.get(b.eventId)
    if (!revision) {
      errors.push(`Boundary ${b.eventId} has no resolving revision (revision.resolvesEventId)`)
    }

    // Temporal ordering sanity
    resolvingDecisions.forEach(d => {
      if (typeof d.hour === 'number' && d.hour < b.hour) {
        warnings.push(`Boundary ${b.eventId} resolved by decision occurring before boundary (decision at ${d.hour}, boundary at ${b.hour})`)
      }
    })
    if (revision && typeof revision.hour === 'number' && revision.hour < b.hour) {
      warnings.push(`Boundary ${b.eventId} resolved by revision occurring before boundary (revision at ${revision.hour}, boundary at ${b.hour})`)
    }
  })

  // Revision completeness (generator contract)
  revisions.forEach(r => {
    if (r.envelope_version == null) errors.push(`Revision ${r.eventId || '(no eventId)'} missing envelope_version`)
    if (!r.revision_id) errors.push(`Revision ${r.eventId || '(no eventId)'} missing revision_id`)
    if (!Array.isArray(r.nextAssumptions)) errors.push(`Revision ${r.eventId || '(no eventId)'} missing nextAssumptions array`)
    if (!Array.isArray(r.nextConstraints)) errors.push(`Revision ${r.eventId || '(no eventId)'} missing nextConstraints array`)
  })
  
  // Check chronological ordering
  for (let i = 1; i < events.length; i++) {
    if (events[i].hour < events[i-1].hour) {
      warnings.push(`Chronological error: event ${i} (hour ${events[i].hour}) before event ${i-1} (hour ${events[i-1].hour})`);
      break;
    }
  }
  
  // Validate retrieval references
  const embeddingIds = new Set();
  const embeddingsByTime = new Map();
  embeddings.forEach(e => {
    if (e.embeddingId) {
      embeddingIds.add(e.embeddingId);
      embeddingsByTime.set(e.embeddingId, e.hour);
    }
  });
  
  const retrievals = events.filter(e => e.type === 'retrieval');
  
  for (const retrieval of retrievals) {
    const retrievalHour = retrieval.hour;
    const referenced = retrieval.retrievedEmbeddings || [];
    
    for (const embId of referenced) {
      if (!embeddingIds.has(embId)) {
        warnings.push(`Retrieval at hour ${retrievalHour} references non-existent embedding ${embId}`);
      } else {
        const embHour = embeddingsByTime.get(embId);
        if (embHour >= retrievalHour) {
          warnings.push(`Time paradox: retrieval at hour ${retrievalHour} references future embedding at hour ${embHour}`);
        }
      }
    }
  }
  
  // Validate semantic vectors
  embeddings.forEach(emb => {
    const vec = (Array.isArray(emb.semanticVector) ? emb.semanticVector
      : Array.isArray(emb.vector) ? emb.vector
      : null)

    if (vec) {
      if (vec.length !== 2) {
        warnings.push(`Embedding ${emb.embeddingId} has invalid vector length (expected 2, got ${vec.length})`);
      }
      vec.forEach((coord, idx) => {
        if (coord < 0 || coord > 1) {
          warnings.push(`Embedding ${emb.embeddingId} vector[${idx}] out of range [0,1]: ${coord}`);
        }
      });
    }
  });
  
  return { warnings, errors };
}

function reconcileEnvelopeStateFromRevisions(scenario) {
  const envelopes = Array.isArray(scenario?.envelopes) ? scenario.envelopes : []
  const events = Array.isArray(scenario?.events) ? scenario.events : []

  const revisionsByEnvelope = new Map()
  for (const ev of events) {
    if (ev?.type !== 'revision') continue
    if (!ev?.envelopeId) continue
    if (!revisionsByEnvelope.has(ev.envelopeId)) revisionsByEnvelope.set(ev.envelopeId, [])
    revisionsByEnvelope.get(ev.envelopeId).push(ev)
  }

  for (const env of envelopes) {
    const envRevs = (revisionsByEnvelope.get(env?.envelopeId) || []).slice().sort((a, b) => (a.hour ?? 0) - (b.hour ?? 0))
    if (envRevs.length === 0) continue
    const lastRev = envRevs[envRevs.length - 1]

    if (lastRev?.envelope_version != null) env.envelope_version = lastRev.envelope_version
    if (Array.isArray(lastRev?.nextAssumptions)) env.assumptions = lastRev.nextAssumptions
    if (Array.isArray(lastRev?.nextConstraints)) env.constraints = lastRev.nextConstraints
  }
}

function validateScenarioMatchesSkeleton(skeleton, candidate) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Generated scenario is not an object')
  }

  // Minimal structural guardrails: we can merge by ID/index even if the model drifts.
  // If these aren't arrays, we can't reliably merge placeholders.
  if (!Array.isArray(candidate.envelopes)) throw new Error('Generated scenario must include scenario.envelopes array')
  if (!Array.isArray(candidate.fleets)) throw new Error('Generated scenario must include scenario.fleets array')
  if (!Array.isArray(candidate.events)) throw new Error('Generated scenario must include scenario.events array')
}

/**
 * Express route handler
 */
export async function handleGenerateScenario(req, res) {
  const startTime = Date.now();
  const MAX_GENERATION_TIME_MS = 120000; // 2 minutes
  
  try {
    const { prompt } = req.body;
    
    // Input validation
    if (!prompt || prompt.trim().length < 10) {
      return res.status(400).json({
        error: 'Prompt must be at least 10 characters'
      });
    }
    
    if (prompt.length > 1000) {
      return res.status(400).json({
        error: 'Prompt too long (max 1000 characters)'
      });
    }
    
    // Set timeout for generation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Generation timeout (120s limit)')), MAX_GENERATION_TIME_MS);
    });
    
    console.log(`[${new Date().toISOString()}] Generating scenario from prompt: "${prompt.substring(0, 50)}..."`);
    
    // Race generation against timeout
    const result = await Promise.race([
      generateScenario(prompt),
      timeoutPromise
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Scenario generated in ${duration}ms: ${result.scenario.id}, ${result.validationWarnings.length} warnings`);
    
    // Log generation metadata
    const m = result.metadata;
    console.log(`Generation Metadata:`);
    console.log(`Model: ${m.model} | Cost: $${m.cost.toFixed(6)} | Tokens: ${m.tokensIn} in / ${m.tokensOut} out | Duration: ${m.duration.toFixed(2)}s`);
    
    res.json({
      scenario: result.scenario,
      warnings: result.validationWarnings,
      meta: {
        generatedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        eventCount: result.scenario.events?.length,
        agentCount: result.scenario.fleets?.reduce((sum, f) => sum + (f.agents?.length || 0), 0),
        envelopeCount: result.scenario.envelopes?.length,
        feedbackLoopsComplete: result.validationWarnings.length === 0
      }
    });
    
  } catch (error) {
    console.error('Scenario generation error:', error);
    
    const duration = Date.now() - startTime;
    const statusCode = error.message.includes('timeout') ? 504 : 500;
    
    res.status(statusCode).json({
      error: error.message,
      duration,
      hint: error.message.includes('timeout') 
        ? 'Generation took too long. Try a simpler prompt.'
        : 'Check that Vertex AI API is accessible and prompt is clear'
    });
  }
}

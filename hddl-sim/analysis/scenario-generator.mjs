/**
 * HDDL Scenario Generator
 * 
 * Generates complete HDDL scenarios from natural language prompts.
 * Uses Gemini to create structurally valid, conformance-passing scenarios.
 * 
 * Constraints:
 * - 20-25 events (good visualization density)
 * - 3-5 actors (manageable complexity)
 * - 2-4 envelopes (clear boundaries)
 * - Full feedback loops (every revision/boundary gets embedding)
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
 * @param {string} domain - Domain hint (insurance/healthcare/lending/custom)
 * @returns {Promise<{scenario: Object, validationWarnings: string[]}>}
 */
export async function generateScenario(userPrompt, domain = 'insurance') {
  
  const schema = await loadSchema();
  const systemPrompt = buildSystemPrompt(domain, schema);
  const enhancedPrompt = `${userPrompt}

Target domain: ${domain}
Generate exactly 20-25 events with complete feedback loops following HDDL patterns.`;

  try {
    const rawResponse = await generateWithGemini(systemPrompt, enhancedPrompt);
    
    // Parse JSON (strip markdown code fences if present)
    let jsonText = rawResponse.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    }
    
    const scenario = JSON.parse(jsonText);
    
    // Validate structure
    const warnings = validateScenario(scenario);
    
    return {
      scenario,
      validationWarnings: warnings
    };
    
  } catch (error) {
    throw new Error(`Scenario generation failed: ${error.message}`);
  }
}

/**
 * Build comprehensive system prompt with schema and patterns
 */
function buildSystemPrompt(domain, schema) {
  return `You are a scenario generator for HDDL (Human-Directed Distributed Learning).
Your task is to generate a complete, valid JSON scenario following this exact schema:

${JSON.stringify(schema, null, 2)}

CRITICAL REQUIREMENTS:

1. STRUCTURE CONSTRAINTS:
   - Exactly 20-25 events total
   - 3-5 actors total (split between agents and stewards)
   - 2-4 policy envelopes
   - All events sorted chronologically by "hour" field
   - All events have unique "eventId" values (use format like "decision:1", "boundary:2:ENV-001")
   - durationHours should be slightly longer than the last event hour

2. FLEETS AND AGENTS:
   - Create 1-2 fleets (groups of agents under a steward role)
   - Each fleet has a "stewardRole" (e.g., "underwriting", "claims", "operations")
   - Each fleet contains 2-3 agents
   - Each agent has: agentId, name, role, envelopeIds (array of envelopes they operate in)
   - Agent names should be realistic (e.g., "Sarah Chen", "Marcus Rodriguez")

3. FEEDBACK LOOP REQUIREMENTS (MANDATORY):
   Every revision event MUST have an embedding:
     {
       "type": "embedding",
       "eventId": "EMB-001",
       "embeddingId": "EMB-001",
       "embeddingType": "revision",
       "sourceEventId": "<revision-event-id>",
       "semanticContext": "brief description of what was learned",
       "vector": [x, y],
       "summary": "one sentence summary",
       "hour": <revision-hour + 0.5>
     }
   
   Every boundary_interaction event MUST have an embedding:
     {
       "type": "embedding",
       "eventId": "EMB-002",
       "embeddingId": "EMB-002",
       "embeddingType": "boundary_interaction",
       "sourceEventId": "<boundary-event-id>",
       "semanticContext": "escalation pattern",
       "vector": [x, y],
       "summary": "one sentence summary",
       "hour": <boundary-hour + 0.5>
     }
   
   Steward decision events SHOULD have embeddings (recommended but not required).

4. RETRIEVAL PATTERN (RECOMMENDED):
   Add retrieval events ~0.5 hours BEFORE boundary interactions:
     {
       "type": "retrieval",
       "eventId": "retrieval:1",
       "hour": <boundary-hour - 0.5>,
       "actorRole": "agent",
       "actorName": "agent name",
       "agentId": "agent-id",
       "queryText": "what the agent is searching for",
       "retrievedEmbeddings": ["EMB-BASELINE-001", "EMB-001"],
       "relevanceScores": [0.93, 0.81],
       "summary": "Agent recalls similar patterns"
     }
   - Shows agent "thinking with memory" before escalating
   - retrievedEmbeddings MUST only reference embeddings with earlier timestamps

5. CHRONOLOGICAL CONSISTENCY:
   - Retrievals can ONLY reference embeddings that exist BEFORE the retrieval
   - Example: retrieval at hour 28.7 can reference embeddings from hours -48, 20.0, 25.5
   - NEVER reference embeddings from the future (causes time paradox)

6. SEMANTIC VECTOR SPACE:
   Place embeddings in 2D space where similar patterns cluster:
   - vector: [x, y] where each coordinate is 0.0 to 1.0
   - X-axis: policy (0.0) ↔ operational (1.0)
     * 0.0-0.3: governance, high-level policy
     * 0.4-0.6: mid-level procedures
     * 0.7-1.0: day-to-day operational decisions
   - Y-axis: routine (0.0) ↔ exceptional (1.0)
     * 0.0-0.3: standard procedures, common patterns
     * 0.4-0.6: moderate complexity
     * 0.7-1.0: unusual cases, edge conditions, escalations
   
   Examples:
   - Bundle discount approval: [0.68, 0.35] (operational + routine)
   - Fraud escalation: [0.80, 0.85] (very operational + very exceptional)
   - Policy revision after escalation: [0.30, 0.65] (policy-level + exceptional)

7. HISTORICAL BASELINE:
   - Include 2-3 embeddings at hour < 0 (e.g., hours -48, -24, -12)
   - These represent pre-existing knowledge agents start with
   - Makes retrieval behavior realistic (not starting with blank memory)
   - Example:
     {
       "hour": -48,
       "type": "embedding",
       "eventId": "EMB-BASELINE-001",
       "embeddingId": "EMB-BASELINE-001",
       "embeddingType": "revision",
       "sourceEventId": "historical-baseline",
       "semanticContext": "historical baseline: standard approval patterns",
       "vector": [0.65, 0.30],
       "summary": "Historical baseline: standard approval patterns"
     }

8. REALISTIC DOMAIN PATTERNS:
   ${getDomainGuidance(domain)}

9. COMPLETE 6-EVENT FEEDBACK CYCLE EXAMPLE:
   hour 28.0: agent makes decision (allowed/denied)
   hour 28.5: boundary_interaction (escalated - exceeds authority)
   hour 29.0: embedding for boundary (REQUIRED)
   hour 29.5: retrieval (agent searches memory, references EMB-BASELINE-001, EMB-001)
   hour 30.0: steward decision (allows/denies the escalation)
   hour 30.5: embedding for decision (recommended)
   hour 31.0: revision (updates policy based on decision, resolvesEventId points to boundary)
   hour 31.5: embedding for revision (REQUIRED)

10. EVENT TYPES AND TYPICAL USAGE:
    - decision: Agent or steward makes a decision (status: allowed/denied/deferred)
    - boundary_interaction: Agent reaches envelope boundary (boundary_kind: escalated/overridden/deferred)
    - revision: Policy envelope updated (nextAssumptions, nextConstraints, resolvesEventId)
    - embedding: Memory record created from an event (embeddingType, sourceEventId, vector)
    - retrieval: Agent queries decision memory (queryText, retrievedEmbeddings, relevanceScores)
    - signal: Observable metric or indicator (signalKey, value)

OUTPUT REQUIREMENTS:
- Valid JSON only, no markdown formatting, no commentary
- Must pass JSON schema validation
- All required fields present (schemaVersion, id, title, durationHours, envelopes, fleets, events)
- Realistic domain-specific content
- Chronologically sorted events
- Complete feedback loops (every revision and boundary has embedding)

Now generate the scenario based on the user's prompt.`;
}

/**
 * Domain-specific guidance for realistic content
 */
function getDomainGuidance(domain) {
  const guidance = {
    insurance: `
   Insurance Domain Guidance:
   - Steward roles: underwriting_steward, claims_steward, risk_analyst
   - Agent roles: underwriter, claims_adjuster, risk_assessor
   - Envelope names: premium_adjustments, coverage_modifications, claim_approvals, risk_assessment
   - Common boundaries: coverage_limit, liability_threshold, fraud_flag, high_value_claim
   - Common boundary_reason codes: exceeds_coverage_limit, fraud_detected, high_risk_score, regulatory_exception
   - Typical decisions: bundle discounts, coverage extensions, claim denials, risk overrides
   - Vocabulary: premium, deductible, liability, underwriting, risk pool, loss ratio, actuarial`,
    
    healthcare: `
   Healthcare Domain Guidance:
   - Steward roles: utilization_review_steward, clinical_steward, care_coordination
   - Agent roles: care_coordinator, utilization_reviewer, clinical_assistant
   - Envelope names: prior_authorizations, referral_protocols, treatment_pathways, medication_management
   - Common boundaries: experimental_treatment, network_exception, dosage_override, off_label_use
   - Common boundary_reason codes: experimental_therapy, out_of_network, dosage_exceeds_guideline, contraindication_detected
   - Typical decisions: authorization approvals, network exceptions, protocol deviations, formulary exceptions
   - Vocabulary: formulary, prior auth, medical necessity, network, utilization, care pathway, diagnosis code`,
    
    lending: `
   Lending Domain Guidance:
   - Steward roles: credit_steward, risk_steward, compliance_steward
   - Agent roles: loan_officer, credit_analyst, underwriter
   - Envelope names: credit_limits, rate_adjustments, exception_approvals, collateral_assessment
   - Common boundaries: dti_ratio, credit_score_minimum, collateral_requirement, regulatory_limit
   - Common boundary_reason codes: dti_exceeds_threshold, credit_score_insufficient, insufficient_collateral, income_verification_failed
   - Typical decisions: rate exceptions, term modifications, approval overrides, collateral waivers
   - Vocabulary: APR, DTI, LTV, FICO, underwriting, creditworthiness, collateral, origination`,
    
    custom: `
   Custom Domain Guidance:
   - Use domain-appropriate terminology from the user's prompt
   - Create realistic steward and agent roles
   - Design policy envelope names that make business sense
   - Include escalation patterns common to the domain
   - Use boundary_reason codes that reflect real business logic`
  };
  
  return guidance[domain] || guidance.custom;
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
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.7,
      topP: 0.95,
    },
  });
  
  const prompt = `${systemPrompt}

USER REQUEST:
${userPrompt}`;
  
  const result = await model.generateContent(prompt);
  const text = result.response.candidates[0].content.parts[0].text;
  
  return text;
}

/**
 * Validate generated scenario structure and patterns
 */
function validateScenario(scenario) {
  const warnings = [];
  
  // Check required top-level fields
  if (!scenario.schemaVersion) warnings.push('Missing required field: schemaVersion');
  if (!scenario.id) warnings.push('Missing required field: id');
  if (!scenario.title) warnings.push('Missing required field: title');
  if (!scenario.durationHours) warnings.push('Missing required field: durationHours');
  if (!scenario.envelopes) warnings.push('Missing required field: envelopes');
  if (!scenario.fleets) warnings.push('Missing required field: fleets');
  if (!scenario.events) warnings.push('Missing required field: events');
  
  // Check event count
  const eventCount = scenario.events?.length || 0;
  if (eventCount < 20 || eventCount > 25) {
    warnings.push(`Event count ${eventCount} outside recommended range 20-25`);
  }
  
  // Check actor count
  let agentCount = 0;
  scenario.fleets?.forEach(fleet => {
    agentCount += fleet.agents?.length || 0;
  });
  if (agentCount < 3 || agentCount > 5) {
    warnings.push(`Agent count ${agentCount} outside recommended range 3-5`);
  }
  
  // Check envelope count
  const envelopeCount = scenario.envelopes?.length || 0;
  if (envelopeCount < 2 || envelopeCount > 4) {
    warnings.push(`Envelope count ${envelopeCount} outside recommended range 2-4`);
  }
  
  // Validate feedback loops
  const events = scenario.events || [];
  const revisions = events.filter(e => e.type === 'revision');
  const boundaries = events.filter(e => e.type === 'boundary_interaction');
  const embeddings = events.filter(e => e.type === 'embedding');
  
  const revisionEmbeddings = embeddings.filter(e => e.embeddingType === 'revision');
  const boundaryEmbeddings = embeddings.filter(e => e.embeddingType === 'boundary_interaction');
  
  if (revisionEmbeddings.length < revisions.length) {
    warnings.push(`Missing embeddings: ${revisions.length - revisionEmbeddings.length} revisions lack embeddings`);
  }
  
  if (boundaryEmbeddings.length < boundaries.length) {
    warnings.push(`Missing embeddings: ${boundaries.length - boundaryEmbeddings.length} boundaries lack embeddings`);
  }
  
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
    if (emb.vector && Array.isArray(emb.vector)) {
      if (emb.vector.length !== 2) {
        warnings.push(`Embedding ${emb.embeddingId} has invalid vector length (expected 2, got ${emb.vector.length})`);
      }
      emb.vector.forEach((coord, idx) => {
        if (coord < 0 || coord > 1) {
          warnings.push(`Embedding ${emb.embeddingId} vector[${idx}] out of range [0,1]: ${coord}`);
        }
      });
    }
  });
  
  return warnings;
}

/**
 * Express route handler
 */
export async function handleGenerateScenario(req, res) {
  const startTime = Date.now();
  const MAX_GENERATION_TIME_MS = 120000; // 2 minutes
  
  try {
    const { prompt, domain = 'insurance' } = req.body;
    
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
    
    console.log(`[${new Date().toISOString()}] Generating scenario from prompt: "${prompt.substring(0, 50)}..." (domain: ${domain})`);
    
    // Race generation against timeout
    const result = await Promise.race([
      generateScenario(prompt, domain),
      timeoutPromise
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Scenario generated in ${duration}ms: ${result.scenario.id}, ${result.validationWarnings.length} warnings`);
    
    res.json({
      scenario: result.scenario,
      warnings: result.validationWarnings,
      meta: {
        generatedAt: new Date().toISOString(),
        domain: domain,
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

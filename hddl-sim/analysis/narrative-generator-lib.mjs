/**
 * Narrative Generator Library
 * 
 * Core generation logic extracted for use by both CLI and API server.
 */

import { VertexAI } from '@google-cloud/vertexai';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Analyze scenario structure  
 */
function analyzeScenario(scenario) {
  const events = scenario.events || [];
  const envelopes = scenario.envelopes || [];
  
  // Extract actors
  const actorMap = new Map();
  events.forEach(event => {
    if (event.actorName) {
      if (!actorMap.has(event.actorName)) {
        actorMap.set(event.actorName, {
          name: event.actorName,
          role: event.actorRole || 'Unknown',
          eventCount: 0
        });
      }
      actorMap.get(event.actorName).eventCount++;
    }
  });
  
  const actors = Array.from(actorMap.values());
  
  // Extract feedback cycles
  const feedbackCycles = [];
  const boundaries = events.filter(e => e.type === 'boundary_interaction');
  boundaries.forEach(boundary => {
    const revision = events.find(e => 
      e.type === 'revision' && e.resolvesEventId === boundary.eventId
    );
    if (revision) {
      feedbackCycles.push({ boundary, revision });
    }
  });
  
  return {
    metadata: {
      name: scenario.title || 'Untitled',
      domain: scenario.domain || 'Unknown',
      totalEvents: events.length,
      timeSpan: {
        start: Math.min(...events.map(e => e.hour || 0)),
        end: Math.max(...events.map(e => e.hour || 0))
      }
    },
    actors,
    feedbackCycles,
    envelopes
  };
}

/**
 * Build narrative prompt for Gemini
 */
function buildNarrativePrompt(analysis, scenario, fullContext) {
  const hddlContext = `
**HDDL Conceptual Framework:**

HDDL (Human-Derived Decision Layer) makes human decision authority explicit, bounded, and revisable so autonomous execution can scale without silently absorbing authority.

Key concepts:
- **Decision Envelope**: A versioned, steward-owned boundary defining what automation/agents may do, under what constraints, and what must be escalated.
- **Steward**: A domain-aligned human who holds bounded decision authority.
- **Boundary Interaction**: When execution reaches an envelope boundary (escalated, overridden, deferred).
- **Revision**: An authoritative change to an envelope's assumptions or constraints.
- **Feedback Loop**: The pattern where boundary interactions trigger steward decisions, leading to envelope revisions.
- **Decision Memory**: AI-assisted recall layer derived from past decisions.

**Voice & Perspective Guidelines:**

1. **Steward Perspective**: Show the decision-making process from the steward's point of view.
2. **Human Impact**: Ground technical decisions in real consequences.
3. **Conversational Tone**: Write like you're explaining this to a colleague over coffee.
`;
  
  const scenarioJson = JSON.stringify(scenario, null, 2);
  
  return `You are writing a narrative summary of an AI governance scenario using the HDDL (Human-Derived Decision Layer) framework.

${hddlContext}

**Complete Scenario Data:**
\`\`\`json
${scenarioJson}
\`\`\`

Write a 3-4 paragraph narrative that:
1. Opens with what this scenario demonstrates
2. Describes the collaboration between agents and stewards
3. Highlights 2-3 specific feedback cycles
4. Concludes with broader implications

**CRITICAL TIME FORMATTING:**
- NEVER write "hour 54.2" - convert to natural language like "on day 3"

**EVENT CITATIONS:**
- Format: detail^[eventId]
- Example: "escalation^[boundary_interaction:5_3:ENV-INS-001:4] early on day one"

Begin with: "# ${scenario.title || analysis.metadata.name}"`;
}

/**
 * Parse citations from narrative
 */
function parseCitations(markdown, scenario) {
  const citations = [];
  const citationRegex = /\^\[([^\]]+)\]/g;
  let match;
  
  while ((match = citationRegex.exec(markdown)) !== null) {
    const eventId = match[1];
    const event = scenario.events?.find(e => e.eventId === eventId);
    
    citations.push({
      eventId,
      offset: match.index,
      hour: event?.hour,
      type: event?.type,
      envelopeId: event?.envelopeId
    });
  }
  
  return citations;
}

/**
 * Generate narrative from scenario data
 */
export async function generateNarrative(scenario, options = {}) {
  const fullContext = options.fullContext ?? true;
  
  const analysis = analyzeScenario(scenario);
  
  const project = process.env.GOOGLE_CLOUD_PROJECT || 'hddl-narrative-gen';
  
  const vertexAI = new VertexAI({ 
    project, 
    location: 'global',
    apiEndpoint: 'aiplatform.googleapis.com'
  });
  
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
    },
  });
  
  const prompt = buildNarrativePrompt(analysis, scenario, fullContext);
  const result = await model.generateContent(prompt);
  const markdown = result.response.candidates[0].content.parts[0].text;
  
  const citations = parseCitations(markdown, scenario);
  
  const metadata = {
    model: 'gemini-3-flash-preview',
    method: fullContext ? 'llm-full-context' : 'llm-summarized',
    tokensIn: 0,
    tokensOut: 0,
    cost: 0,
    generatedAt: new Date().toISOString()
  };
  
  if (result.response.usageMetadata) {
    const { promptTokenCount, candidatesTokenCount } = result.response.usageMetadata;
    const inputCost = (promptTokenCount * 0.50 / 1_000_000);
    const outputCost = (candidatesTokenCount * 3.00 / 1_000_000);
    
    metadata.tokensIn = promptTokenCount;
    metadata.tokensOut = candidatesTokenCount;
    metadata.cost = parseFloat((inputCost + outputCost).toFixed(6));
  }
  
  return {
    markdown,
    citations,
    metadata
  };
}

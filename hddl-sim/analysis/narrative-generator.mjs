#!/usr/bin/env node

/**
 * narrative-generator.mjs
 * 
 * Generates human-readable narratives from HDDL scenario JSON files.
 * Supports template-based generation (default) and LLM-enhanced generation (future).
 * 
 * Usage:
 *   node analysis/narrative-generator.mjs <scenario-name> [--method template|llm|hybrid]
 * 
 * Example:
 *   node analysis/narrative-generator.mjs insurance-underwriting --method template
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { VertexAI } from '@google-cloud/vertexai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const GENERATION_METHODS = {
  TEMPLATE: 'template',
  LLM: 'llm',
  HYBRID: 'hybrid'
};

// ============================================================================
// Scenario Loading
// ============================================================================

async function loadScenario(scenarioName) {
  const scenarioPath = join(__dirname, '..', 'src', 'sim', 'scenarios', `${scenarioName}.scenario.json`);
  
  try {
    const content = await readFile(scenarioPath, 'utf-8');
    const scenario = JSON.parse(content);
    return scenario;
  } catch (error) {
    throw new Error(`Failed to load scenario "${scenarioName}": ${error.message}`);
  }
}

// ============================================================================
// Scenario Analysis
// ============================================================================

/**
 * Analyze scenario structure to extract key narrative elements
 */
function analyzeScenario(scenario) {
  const analysis = {
    metadata: {
      name: scenario.title || scenario.scenario_name || 'Untitled Scenario',
      domain: extractPrimaryDomain(scenario),
      version: scenario.schemaVersion,
      totalEvents: scenario.events.length,
      timeSpan: {
        start: Math.min(...scenario.events.map(e => e.hour)),
        end: Math.max(...scenario.events.map(e => e.hour))
      }
    },
    actors: extractActors(scenario),
    feedbackCycles: extractFeedbackCycles(scenario),
    envelopes: scenario.envelopes || [],
    timeline: buildTimeline(scenario)
  };
  
  return analysis;
}

/**
 * Extract primary domain from envelopes
 */
function extractPrimaryDomain(scenario) {
  if (scenario.domain) return scenario.domain;
  if (!scenario.envelopes || scenario.envelopes.length === 0) return 'Unknown Domain';
  
  // Return first envelope's domain
  return scenario.envelopes[0].domain || 'Unknown Domain';
}

/**
 * Extract unique actors and their activity patterns
 */
function extractActors(scenario) {
  const actorMap = new Map();
  
  for (const event of scenario.events) {
    const actorName = event.actorName || event.actor;
    const actorRole = event.actorRole || event.role || 'Unknown';
    
    if (actorName) {
      if (!actorMap.has(actorName)) {
        actorMap.set(actorName, {
          name: actorName,
          role: actorRole,
          events: [],
          eventTypes: new Set()
        });
      }
      
      const actor = actorMap.get(actorName);
      actor.events.push(event);
      actor.eventTypes.add(event.type);
    }
  }
  
  return Array.from(actorMap.values()).map(actor => ({
    ...actor,
    eventTypes: Array.from(actor.eventTypes),
    eventCount: actor.events.length
  }));
}

/**
 * Extract feedback cycles (boundary → decision → revision)
 */
function extractFeedbackCycles(scenario) {
  const cycles = [];
  const boundaries = scenario.events.filter(e => e.type === 'boundary_interaction');
  
  for (const boundary of boundaries) {
    const cycle = {
      boundary: boundary,
      decision: null,
      revision: null,
      embeddings: []
    };
    
    // Find related decision (if any)
    if (boundary.resolvedByEventId) {
      cycle.decision = scenario.events.find(e => e.eventId === boundary.resolvedByEventId);
    }
    
    // Find related revision (if any)
    const revision = scenario.events.find(e => 
      e.type === 'revision' && e.resolvesEventId === boundary.eventId
    );
    if (revision) {
      cycle.revision = revision;
    }
    
    // Find related embeddings
    cycle.embeddings = scenario.events.filter(e =>
      e.type === 'embedding' && 
      (e.sourceEventId === boundary.eventId || 
       e.sourceEventId === cycle.decision?.eventId ||
       e.sourceEventId === revision?.eventId)
    );
    
    cycles.push(cycle);
  }
  
  return cycles;
}

/**
 * Build chronological timeline with event clustering
 */
function buildTimeline(scenario) {
  const sortedEvents = [...scenario.events].sort((a, b) => a.hour - b.hour);
  const timeline = [];
  
  let currentCluster = null;
  const clusterThreshold = 2; // Hours - events within this window cluster together
  
  for (const event of sortedEvents) {
    if (!currentCluster || event.hour - currentCluster.startHour > clusterThreshold) {
      currentCluster = {
        startHour: event.hour,
        endHour: event.hour,
        events: []
      };
      timeline.push(currentCluster);
    }
    
    currentCluster.events.push(event);
    currentCluster.endHour = event.hour;
  }
  
  return timeline;
}

// ============================================================================
// Template-Based Narrative Generation
// ============================================================================

/**
 * Generate narrative using deterministic templates
 */
function generateTemplateNarrative(analysis) {
  const sections = [];
  
  // Title and metadata
  sections.push(generateTitle(analysis));
  sections.push(generateMetadata(analysis));
  
  // Introduction
  sections.push(generateIntroduction(analysis));
  
  // Actors overview
  sections.push(generateActorsSection(analysis));
  
  // Chronological narrative
  sections.push(generateChronologicalNarrative(analysis));
  
  // Feedback cycles analysis
  sections.push(generateFeedbackCyclesSection(analysis));
  
  // Conclusion
  sections.push(generateConclusion(analysis));
  
  return sections.join('\n\n');
}

function generateTitle(analysis) {
  return `# ${analysis.metadata.name}\n## Narrative Summary`;
}

function generateMetadata(analysis) {
  const duration = (analysis.metadata.timeSpan.end - analysis.metadata.timeSpan.start).toFixed(1);
  
  return `**Domain:** ${analysis.metadata.domain}  
**Version:** ${analysis.metadata.version}  
**Time Span:** ${duration} hours (${analysis.metadata.totalEvents} events)  
**Actors:** ${analysis.actors.length}  
**Feedback Cycles:** ${analysis.feedbackCycles.length}`;
}

function generateIntroduction(analysis) {
  const { metadata, actors, feedbackCycles, envelopes } = analysis;
  
  let intro = `## Overview\n\n`;
  intro += `This scenario explores ${metadata.domain} operations across ${metadata.totalEvents} events. `;
  intro += `It involves ${actors.length} actors making decisions, escalating boundaries, and evolving policies `;
  intro += `through ${feedbackCycles.length} feedback cycles.`;
  
  if (envelopes.length > 0) {
    intro += ` The scenario spans ${envelopes.length} envelope${envelopes.length > 1 ? 's' : ''}, `;
    intro += `showing how governance patterns evolve over time.`;
  }
  
  return intro;
}

function generateActorsSection(analysis) {
  let section = `## Key Actors\n\n`;
  
  // Sort by event count (most active first)
  const sortedActors = [...analysis.actors].sort((a, b) => b.eventCount - a.eventCount);
  
  for (const actor of sortedActors) {
    section += `### ${actor.name}\n`;
    section += `**Role:** ${actor.role}  \n`;
    section += `**Activity:** ${actor.eventCount} events (${actor.eventTypes.join(', ')})  \n\n`;
  }
  
  return section;
}

function generateChronologicalNarrative(analysis) {
  let section = `## Timeline\n\n`;
  
  for (const cluster of analysis.timeline) {
    const hourRange = cluster.startHour === cluster.endHour 
      ? `Hour ${cluster.startHour}`
      : `Hours ${cluster.startHour}-${cluster.endHour}`;
    
    section += `### ${hourRange}\n\n`;
    
    for (const event of cluster.events) {
      section += formatEventNarrative(event, analysis);
      section += '\n\n';
    }
  }
  
  return section;
}

function formatEventNarrative(event, analysis) {
  const hour = event.hour.toFixed(1);
  const actor = event.actorName || event.actor || 'Agent';
  
  switch (event.type) {
    case 'decision':
      return `**Decision** (Hour ${hour}): ${actor} ${event.status === 'allowed' ? 'approved' : 'denied'} a ${event.decision_type || 'decision'}. ${event.reason ? `Reason: ${event.reason}` : ''}`;
    
    case 'boundary_interaction':
      const boundaryKind = event.boundary_kind || 'escalated';
      return `**Boundary** (Hour ${hour}): ${actor} ${boundaryKind} to steward. ${event.boundary_reason ? `Reason: ${event.boundary_reason}` : ''}`;
    
    case 'revision':
      return `**Policy Revision** (Hour ${hour}): ${actor} updated policy. ${event.revision_description || 'Details not specified.'}`;
    
    case 'retrieval':
      const embedCount = event.retrievedEmbeddings?.length || 0;
      return `**Memory Retrieval** (Hour ${hour}): ${actor} queried decision memory (${embedCount} results). Query: "${event.queryText}"`;
    
    case 'embedding':
      return `**Memory Update** (Hour ${hour}): ${event.embeddingType} embedded for future retrieval.`;
    
    default:
      return `**${event.type}** (Hour ${hour}): ${actor} performed ${event.type}.`;
  }
}

function generateFeedbackCyclesSection(analysis) {
  let section = `## Feedback Cycles\n\n`;
  
  if (analysis.feedbackCycles.length === 0) {
    section += `No complete feedback cycles detected in this scenario.\n`;
    return section;
  }
  
  section += `This scenario demonstrates ${analysis.feedbackCycles.length} feedback cycle${analysis.feedbackCycles.length > 1 ? 's' : ''}, `;
  section += `where boundary interactions lead to steward decisions and policy revisions.\n\n`;
  
  for (let i = 0; i < analysis.feedbackCycles.length; i++) {
    const cycle = analysis.feedbackCycles[i];
    section += `### Cycle ${i + 1}\n\n`;
    
    // Boundary
    const boundaryActor = cycle.boundary.actorName || cycle.boundary.actor || 'Agent';
    section += `**Boundary Interaction** (Hour ${cycle.boundary.hour}):  \n`;
    section += `${boundaryActor} encountered a ${cycle.boundary.boundary_kind || 'boundary'} situation. `;
    if (cycle.boundary.boundary_reason) {
      section += `${cycle.boundary.boundary_reason}`;
    }
    section += `\n\n`;
    
    // Decision
    if (cycle.decision) {
      const decisionActor = cycle.decision.actorName || cycle.decision.actor || 'Steward';
      section += `**Steward Decision** (Hour ${cycle.decision.hour}):  \n`;
      section += `${decisionActor} ${cycle.decision.status === 'allowed' ? 'approved' : 'denied'} the request. `;
      if (cycle.decision.reason) {
        section += `${cycle.decision.reason}`;
      }
      section += `\n\n`;
    }
    
    // Revision
    if (cycle.revision) {
      const revisionActor = cycle.revision.actorName || cycle.revision.actor || 'Steward';
      section += `**Policy Revision** (Hour ${cycle.revision.hour}):  \n`;
      section += `${cycle.revision.revision_description || 'Policy updated based on this interaction.'}`;
      section += `\n\n`;
    }
    
    // Embeddings
    if (cycle.embeddings.length > 0) {
      section += `**Learning:** ${cycle.embeddings.length} embedding${cycle.embeddings.length > 1 ? 's' : ''} created for future reference.\n\n`;
    }
  }
  
  return section;
}

function generateConclusion(analysis) {
  let section = `## Conclusion\n\n`;
  
  const { feedbackCycles, actors, metadata } = analysis;
  const stewards = actors.filter(a => a.role.toLowerCase().includes('steward'));
  const agents = actors.filter(a => !a.role.toLowerCase().includes('steward'));
  
  section += `This ${metadata.domain} scenario demonstrates the interplay between automated agents and human stewards. `;
  
  if (agents.length > 0 && stewards.length > 0) {
    section += `${agents.length} agent${agents.length > 1 ? 's' : ''} and ${stewards.length} steward${stewards.length > 1 ? 's' : ''} `;
    section += `collaborated through ${feedbackCycles.length} feedback cycle${feedbackCycles.length > 1 ? 's' : ''}, `;
  }
  
  section += `showing how human judgment shapes AI behavior through continuous learning and policy evolution.`;
  
  return section;
}

// ============================================================================
// LLM-Enhanced Generation
// ============================================================================

/**
 * Generate narrative using Gemini Vertex AI with template fallback
 */
async function generateLLMNarrative(analysis, scenario, options = {}) {
  try {
    // Check environment
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    
    if (!project) {
      console.warn('⚠️  GOOGLE_CLOUD_PROJECT not set. Falling back to template generation.');
      return generateTemplateNarrative(analysis);
    }
    
    console.error('Initializing Vertex AI...');
    const vertexAI = new VertexAI({ project, location });
    
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
      },
    });
    
    // Build constrained prompt
    const contextMode = options.fullContext ? 'full' : 'summarized';
    console.error(`Building ${contextMode} context prompt...`);
    const prompt = buildNarrativePrompt(analysis, scenario, options.fullContext);
    
    console.error('Generating narrative with Gemini 2.0 Flash...');
    const result = await model.generateContent(prompt);
    const narrative = result.response.candidates[0].content.parts[0].text;
    
    // Log usage
    if (result.response.usageMetadata) {
      const { promptTokenCount, candidatesTokenCount, totalTokenCount } = result.response.usageMetadata;
      const inputCost = (promptTokenCount * 0.075 / 1_000_000).toFixed(6);
      const outputCost = (candidatesTokenCount * 0.30 / 1_000_000).toFixed(6);
      const totalCost = (parseFloat(inputCost) + parseFloat(outputCost)).toFixed(6);
      console.error(`✓ Generated (${totalTokenCount} tokens: ${promptTokenCount} in, ${candidatesTokenCount} out)`);
      console.error(`  Cost: $${totalCost} (input: $${inputCost}, output: $${outputCost})`);
    }
    
    return narrative;
    
  } catch (error) {
    console.warn(`⚠️  LLM generation failed: ${error.message}`);
    console.warn('Falling back to template generation...');
    return generateTemplateNarrative(analysis);
  }
}

/**
 * Build constrained prompt for LLM narrative generation
 */
function buildNarrativePrompt(analysis, scenario, fullContext = false) {
  const { metadata, actors, feedbackCycles, envelopes } = analysis;
  
  // HDDL conceptual framing (shared across both prompt modes)
  const hddlContext = `
**HDDL Conceptual Framework:**

HDDL (Human-Derived Decision Layer) makes human decision authority explicit, bounded, and revisable so autonomous execution can scale without silently absorbing authority.

Key concepts:
- **Decision Envelope**: A versioned, steward-owned boundary defining what automation/agents may do, under what constraints, and what must be escalated. Envelopes contain assumptions (conditions for validity) and constraints (explicit rules).
- **Steward**: A domain-aligned human (often an engineer) who holds bounded decision authority. Stewards define and revise envelopes, arbitrate domain conflicts, and preserve human judgment under scale. They are not gatekeepers or approvers.
- **Boundary Interaction**: When execution reaches an envelope boundary (escalated, overridden, deferred). These are key signals for steward review.
- **Revision**: An authoritative change to an envelope's assumptions or constraints. Revisions create lineage and make authority changes inspectable.
- **Feedback Loop**: The pattern where boundary interactions trigger steward decisions, leading to envelope revisions that update agent behavior. This is how governance evolves based on real operational experience.
- **Decision Memory**: AI-assisted recall layer (embeddings) derived from past decisions and events. Supports precedent discovery but does not hold authority.

When writing, use this vocabulary naturally. Explain that stewards "revise envelopes" not "update policies." Agents "operate within envelope constraints" not "follow rules." Boundary interactions "trigger steward review" not "require approval."
`;
  
  if (fullContext) {
    // Full context: Include complete scenario JSON
    const scenarioJson = JSON.stringify(scenario, null, 2);
    
    const prompt = `You are writing a narrative summary of an AI governance scenario using the HDDL (Human-Derived Decision Layer) framework. Use ONLY the facts provided in the scenario data below. Do not invent details.

${hddlContext}

**Complete Scenario Data:**
\`\`\`json
${scenarioJson}
\`\`\`

Write a 3-4 paragraph narrative that:
1. Opens with what this scenario demonstrates (domain + key themes from envelopes using HDDL terminology)
2. Describes the collaboration between automated agents and human stewards (reference specific actors, their roles, and how they work within envelope constraints)
3. Highlights 2-3 specific feedback cycles showing policy evolution (use actual event details like boundary reasons, decision details, and revision descriptions to illustrate envelope updates)
4. Concludes with the broader implications for AI governance using HDDL principles (how this demonstrates scaled autonomy with preserved human authority)

Use professional but accessible language. Reference SPECIFIC DETAILS from the event data. Use HDDL vocabulary (envelopes, stewards, boundary interactions, revisions, feedback loops) naturally in context. Focus on the HUMAN-AI COLLABORATION story through the lens of explicit decision authority. Do not use bullet points or lists—write flowing paragraphs.

Begin with a title: "# ${scenario.title || metadata.name}"`;

    return prompt;
  } else {
    // Summarized context: Extract key facts only
    const actorList = actors.slice(0, 10).map(a => `- ${a.name} (${a.role}): ${a.eventCount} events`).join('\n');
    const cycleList = feedbackCycles.map((c, i) => 
      `Cycle ${i + 1}: Boundary at hour ${c.boundary.hour} → ${c.revision ? `Revision at hour ${c.revision.hour}` : 'No revision'}`
    ).join('\n');
    
    const prompt = `You are writing a narrative summary of an AI governance scenario using the HDDL (Human-Derived Decision Layer) framework. Use ONLY the facts provided below. Do not invent details.

${hddlContext}

**Scenario: ${metadata.name}**
- Domain: ${metadata.domain}
- Duration: ${(metadata.timeSpan.end - metadata.timeSpan.start).toFixed(1)} hours
- Total Events: ${metadata.totalEvents}
- Envelopes: ${envelopes.length}
- Feedback Cycles: ${feedbackCycles.length}

**Key Actors:**
${actorList}

**Feedback Cycles:**
${cycleList}

Write a 3-4 paragraph narrative that:
1. Opens with what this scenario demonstrates (domain + key themes using HDDL terminology)
2. Describes the collaboration between automated agents and human stewards (how they work within envelope constraints)
3. Highlights 2-3 specific feedback cycles showing policy evolution (illustrate envelope revisions based on boundary interactions)
4. Concludes with the broader implications for AI governance using HDDL principles

Use professional but accessible language. Use HDDL vocabulary (envelopes, stewards, boundary interactions, revisions, feedback loops) naturally in context. Focus on the HUMAN-AI COLLABORATION story through the lens of explicit decision authority. Do not use bullet points or lists—write flowing paragraphs.

Begin with a title: "# ${metadata.name}"`;

    return prompt;
  }
}

async function generateHybridNarrative(analysis) {
  // Hybrid: Generate template structure, then enrich key sections with LLM
  console.error('Generating hybrid narrative (template + LLM enrichment)...');
  
  const templateNarrative = generateTemplateNarrative(analysis);
  
  try {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    
    if (!project) {
      console.warn('⚠️  GOOGLE_CLOUD_PROJECT not set. Using template only.');
      return templateNarrative;
    }
    
    const vertexAI = new VertexAI({ project, location });
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.8,
      },
    });
    
    // Enrich the conclusion with LLM
    const { metadata, feedbackCycles } = analysis;
    const prompt = `Based on this AI governance scenario, write a compelling 2-paragraph conclusion:

Scenario: ${metadata.name}
Domain: ${metadata.domain}
Feedback Cycles: ${feedbackCycles.length}

The conclusion should emphasize how human judgment shapes AI behavior through continuous learning and policy evolution. Make it thought-provoking but grounded in the facts above.`;
    
    console.error('Enriching conclusion with Gemini...');
    const result = await model.generateContent(prompt);
    const enrichedConclusion = result.response.candidates[0].content.parts[0].text;
    
    // Replace template conclusion with enriched version
    return templateNarrative.replace(/## Conclusion\n\n[\s\S]*$/, `## Conclusion\n\n${enrichedConclusion}`);
    
  } catch (error) {
    console.warn(`⚠️  LLM enrichment failed: ${error.message}`);
    return templateNarrative;
  }
}

// ============================================================================
// Main CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Usage: node analysis/narrative-generator.mjs <scenario-name> [options]

Options:
  --method <template|llm|hybrid>  Generation method (default: template)
  --full-context                  Use complete scenario JSON in LLM prompt (default: summarized)
  --output <file>                 Save to file (default: stdout)
  --help                          Show this help message

Examples:
  node analysis/narrative-generator.mjs insurance-underwriting
  node analysis/narrative-generator.mjs insurance-underwriting --method llm
  node analysis/narrative-generator.mjs insurance-underwriting --method llm --full-context
  node analysis/narrative-generator.mjs insurance-underwriting --output narratives/insurance.md
    `);
    process.exit(0);
  }
  
  const scenarioName = args[0];
  const method = args.includes('--method') 
    ? args[args.indexOf('--method') + 1] 
    : GENERATION_METHODS.TEMPLATE;
  const fullContext = args.includes('--full-context');
  const outputPath = args.includes('--output')
    ? args[args.indexOf('--output') + 1]
    : null;
  
  console.error(`Loading scenario: ${scenarioName}...`);
  const scenario = await loadScenario(scenarioName);
  
  console.error(`Analyzing scenario structure...`);
  const analysis = analyzeScenario(scenario);
  
  const contextMode = fullContext ? ' (full context)' : '';
  console.error(`Generating narrative using ${method} method${contextMode}...`);
  let narrative;
  
  const options = { fullContext };
  
  switch (method) {
    case GENERATION_METHODS.TEMPLATE:
      narrative = generateTemplateNarrative(analysis);
      break;
    case GENERATION_METHODS.LLM:
      narrative = await generateLLMNarrative(analysis, scenario, options);
      break;
    case GENERATION_METHODS.HYBRID:
      narrative = await generateHybridNarrative(analysis);
      break;
    default:
      throw new Error(`Unknown method: ${method}`);
  }
  
  // Output handling
  if (outputPath) {
    // Save to file
    const resolvedPath = join(__dirname, '..', outputPath);
    const outputDir = dirname(resolvedPath);
    
    // Ensure directory exists
    await mkdir(outputDir, { recursive: true });
    
    // Write file
    await writeFile(resolvedPath, narrative, 'utf-8');
    
    console.error(`\n${'='.repeat(80)}`);
    console.error(`✓ Narrative saved to: ${outputPath}`);
    console.error(`  (${narrative.length} characters)`);
  } else {
    // Output to stdout
    console.error(`\n${'='.repeat(80)}\n`);
    console.log(narrative);
    console.error(`\n${'='.repeat(80)}`);
    console.error(`✓ Narrative generated successfully (${narrative.length} characters)`);
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}

export { analyzeScenario, generateTemplateNarrative };

#!/usr/bin/env node
import { readFile } from 'fs/promises';

const scenario = JSON.parse(await readFile('../src/sim/scenarios/insurance-underwriting.scenario.json', 'utf-8'));

// Simulated analysis structure
const analysis = {
  metadata: {
    name: scenario.title,
    domain: 'Insurance',
    timeSpan: { start: 0, end: 120 },
    totalEvents: scenario.events.length
  },
  actors: [
    { name: 'RiskScorer', role: 'Underwriting Agent', eventCount: 15 },
    { name: 'Rebecca Foster', role: 'Underwriting Steward', eventCount: 8 }
  ],
  feedbackCycles: [
    { boundary: { hour: 5.3 }, revision: { hour: 6.2 } }
  ],
  envelopes: scenario.envelopes
};

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

**CRITICAL TIME FORMATTING:**
- NEVER write "hour 54.2" or "at hour 28.7" - convert hours to natural language
- For scenarios under 48 hours: "early in the scenario", "midway through", "toward the end"
- For scenarios over 48 hours: "on day 2", "three days in", "by the end of the week"
- For specific timing: "early in day three" not "hour 54.2", "late on day one" not "hour 18.4"
- Example: "Three days into the week-long scenario" instead of "At hour 72.5"

**EVENT CITATIONS:**
- When mentioning specific events (boundary interactions, decisions, revisions), include the eventId in superscript citation format
- Format: sentence with detail^[eventId] (no space before caret)
- Example: "A high-risk policy triggered escalation^[boundary_interaction:5_3:ENV-INS-001:4] early on day one."
- Only cite events when you reference specific details from them (not for general statements)
- Citations help readers trace narrative claims back to source data

Use professional but accessible language. Reference SPECIFIC DETAILS from the event data. Use HDDL vocabulary (envelopes, stewards, boundary interactions, revisions, feedback loops) naturally in context. Focus on the HUMAN-AI COLLABORATION story through the lens of explicit decision authority. Do not use bullet points or lists—write flowing paragraphs.

Begin with a title: "# ${scenario.title}"`;

console.log("=".repeat(80));
console.log("COMPLETE PROMPT SENT TO GEMINI 3 FLASH PREVIEW");
console.log("=".repeat(80));
console.log(prompt);
console.log("\n" + "=".repeat(80));
console.log(`Total prompt length: ${prompt.length} characters (~${(prompt.length / 4).toFixed(0)} tokens)`);
console.log("=".repeat(80));

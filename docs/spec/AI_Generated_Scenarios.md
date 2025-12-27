# AI-Generated Scenario Guide

## Overview

The HDDL simulation platform is designed to support AI-generated scenarios through a well-defined JSON schema. This document explains where timeline scenarios are stored, how to iterate over them, and whether the system is ready for AI generation.

## Where Timeline Logic is Stored

### Primary Location
**File:** [hddl-sim/src/sim/scenarios/default.scenario.json](../../hddl-sim/src/sim/scenarios/default.scenario.json)

This JSON file contains:
- **698 lines** of structured event data
- 4 Decision Envelopes (Customer Service, Hiring, Sales, Data)
- 4 Steward fleets with multiple agents
- Chronological event stream over 48 hours

### Schema Definition
**File:** [hddl-sim/schemas/hddl-scenario.schema.json](../../hddl-sim/schemas/hddl-scenario.schema.json)

JSON Schema (Draft 2020-12) that defines:
- Required fields: `schemaVersion`, `id`, `title`, `durationHours`, `envelopes`, `fleets`, `events`
- Event types: `envelope_promoted`, `signal`, `decision`, `revision`, `boundary_interaction`, `escalation`, `dsg_session`, `dsg_message`, `annotation`
- Complete property specifications with types and constraints

### Validation & Export Tools

**Validation:** [hddl-sim/scripts/validate-scenarios.mjs](../../hddl-sim/scripts/validate-scenarios.mjs)
```bash
npm run validate:scenarios
```

**Export:** [hddl-sim/scripts/export-default-scenario.mjs](../../hddl-sim/scripts/export-default-scenario.mjs)
```bash
npm run export:default-scenario
```

## Schema Structure

### Top Level
```json
{
  "schemaVersion": 2,
  "id": "scenario-id",
  "title": "Scenario Title",
  "durationHours": 48,
  "envelopes": [...],
  "fleets": [...],
  "events": [...]
}
```

### Envelope Structure
```json
{
  "envelopeId": "ENV-001",
  "name": "Customer Service Responses",
  "domain": "Customer Service",
  "ownerRole": "Customer Steward",
  "createdHour": 2,
  "endHour": 18,
  "envelope_version": 1,
  "revision_id": null,
  "assumptions": ["Assumption 1", "Assumption 2"],
  "constraints": ["Constraint 1", "Constraint 2"]
}
```

### Fleet Structure
```json
{
  "stewardRole": "Customer Steward",
  "agents": [
    {
      "agentId": "AG-001",
      "name": "EscalationRouter",
      "role": "Escalation routing + prediction",
      "envelopeIds": ["ENV-001"]
    }
  ]
}
```

### Event Structure (Example: Decision)
```json
{
  "type": "decision",
  "hour": 11.02,
  "envelopeId": "ENV-001",
  "agentId": "AG-CS-01",
  "actorRole": "Customer Steward",
  "status": "allowed",
  "label": "Agent executed a decision",
  "detail": "Action: Refund $89 → CS-REFUND",
  "decision_id": "dec-abc123"
}
```

### Event Structure (Example: Revision)
```json
{
  "type": "revision",
  "hour": 13.8,
  "envelopeId": "ENV-001",
  "actorRole": "Customer Steward",
  "label": "Revision issued",
  "detail": "Refund pressure rising → boundary touched",
  "revision_id": "rev-xyz789",
  "envelope_version": 2,
  "nextAssumptions": ["Updated assumption"],
  "nextConstraints": ["Updated constraint"]
}
```

## Can You Iterate Over It Easily?

**YES.** The scenario is a plain JSON structure that's easy to iterate:

### JavaScript Example
```javascript
import scenario from './scenarios/default.scenario.json'

// Iterate envelopes
for (const envelope of scenario.envelopes) {
  console.log(`${envelope.envelopeId}: ${envelope.name}`)
  console.log(`  Owner: ${envelope.ownerRole}`)
  console.log(`  Window: ${envelope.createdHour}h → ${envelope.endHour}h`)
}

// Iterate events chronologically
const sortedEvents = scenario.events.slice().sort((a, b) => a.hour - b.hour)
for (const event of sortedEvents) {
  console.log(`${event.hour}h: ${event.type} - ${event.label}`)
}

// Filter events by type
const decisions = scenario.events.filter(e => e.type === 'decision')
const revisions = scenario.events.filter(e => e.type === 'revision')
const boundaryEvents = scenario.events.filter(e => e.type === 'boundary_interaction')
```

### Python Example (for AI generation)
```python
import json

with open('default.scenario.json') as f:
    scenario = json.load(f)

# Generate new events
new_events = []
for hour in range(0, 48, 2):
    new_events.append({
        "type": "signal",
        "hour": hour + 0.5,
        "envelopeId": "ENV-001",
        "signalKey": "refund_pressure",
        "value": 0.72,
        "label": "Refund pressure signal"
    })

scenario['events'].extend(new_events)

# Write updated scenario
with open('generated.scenario.json', 'w') as f:
    json.dump(scenario, f, indent=2)
```

## Is the System Ready for AI Generation?

**YES.** The system is well-designed for AI-generated scenarios:

### ✅ Strengths

1. **Formal JSON Schema**
   - Machine-readable validation rules
   - Clear type specifications
   - Extensible via `additionalProperties: true`

2. **Validation Pipeline**
   - Automated validation via `validate-scenarios.mjs`
   - Schema parser in [scenario-schema.js](../../hddl-sim/src/sim/scenario-schema.js)
   - Errors and warnings reported clearly

3. **Event Type Enumeration**
   - 9 well-defined event types
   - Clear semantic boundaries
   - Documented in Decision Telemetry Spec

4. **Bounded Time Model**
   - Events occur at specific `hour` values (0-48 by default)
   - Envelopes have `createdHour` and `endHour` windows
   - Chronological replay is deterministic

5. **Steward Color Consistency**
   - [steward-colors.js](../../hddl-sim/src/sim/steward-colors.js) provides shared palette
   - 8 distinct steward roles with assigned colors
   - Used consistently across UI components

6. **Canon Alignment**
   - Vocabulary from [Glossary.md](../Glossary.md)
   - Terms: Decision Envelope, Steward, Revision, Boundary Interaction, DSG
   - Telemetry aligned with [Decision_Telemetry_Specification.md](../foundations/Decision_Telemetry_Specification.md)

### 🎯 AI Generation Recommendations

#### 1. Use Schema as Contract
```bash
# Validate generated scenarios
npm run validate:scenarios
```

#### 2. Follow Naming Conventions
- Envelope IDs: `ENV-001`, `ENV-002`, `DE-001`, `DE-002`
- Agent IDs: `AG-CS-01`, `AG-HR-02`, `AG-SALES-03`
- Session IDs: `dsg-session-001`
- Decision IDs: `dec-{uuid}`
- Revision IDs: `rev-{uuid}`

#### 3. Event Type Patterns

**Signal:** Runtime telemetry (metrics, thresholds)
```json
{
  "type": "signal",
  "hour": 10.5,
  "envelopeId": "ENV-001",
  "signalKey": "latency_p95",
  "value": 2.1,
  "label": "Latency signal"
}
```

**Decision:** Agent executes within envelope
```json
{
  "type": "decision",
  "hour": 11.0,
  "envelopeId": "ENV-001",
  "agentId": "AG-CS-01",
  "status": "allowed",
  "label": "Refund approved"
}
```

**Boundary Interaction:** Constraint approached/touched
```json
{
  "type": "boundary_interaction",
  "hour": 12.0,
  "envelopeId": "ENV-001",
  "boundary_kind": "constraint",
  "boundary_refs": ["Max response time: 2min"],
  "label": "Constraint boundary touched"
}
```

**Revision:** Envelope updated by steward
```json
{
  "type": "revision",
  "hour": 13.0,
  "envelopeId": "ENV-001",
  "actorRole": "Customer Steward",
  "revision_id": "rev-abc123",
  "envelope_version": 2,
  "nextConstraints": ["Max response time: 3min"],
  "label": "Revised constraint"
}
```

**DSG Session:** Decision Stewardship Group convenes
```json
{
  "type": "dsg_session",
  "hour": 15.0,
  "sessionId": "dsg-001",
  "facilitatorRole": "Engineering Steward",
  "trigger": "Multiple boundary interactions",
  "involvedEnvelopeIds": ["ENV-001", "ENV-003"],
  "title": "Discount & Refund Policy Alignment"
}
```

#### 4. Temporal Coherence Rules

1. **Envelope Timing**
   - Events must occur within envelope window (`createdHour` ≤ `event.hour` ≤ `endHour`)
   - Revisions should precede version-bumped events

2. **Agent Assignment**
   - Agents must be assigned to envelopes in fleet definitions
   - `agentId` in events must match fleet agent IDs

3. **Causal Ordering**
   - Boundary interactions → often trigger DSG sessions
   - DSG sessions → may result in revisions
   - Revisions → bump `envelope_version`

4. **Steward Consistency**
   - `ownerRole` must match one of the steward roles in fleets
   - Supported roles: Customer Steward, HR Steward, Sales Steward, Data Steward, Domain Engineer, Engineering Steward, Resiliency Steward, Business Domain Steward

#### 5. Sample AI Prompt

```
Generate a valid HDDL scenario JSON file following these rules:

1. Use schema version 2
2. Create 3-5 decision envelopes spanning 48 hours
3. Define steward fleets with 2-4 agents each
4. Generate 20-40 events including:
   - Signals (metric observations)
   - Decisions (agent actions)
   - Boundary interactions (constraint warnings)
   - At least 1 revision (steward updates envelope)
   - Optional: 1 DSG session (multi-steward coordination)
5. Ensure events occur within envelope time windows
6. Use realistic hour values (0.0 to 48.0)
7. Make event labels human-readable narratives
8. Follow naming conventions (ENV-XXX, AG-XXX-XX, etc.)

Output valid JSON matching hddl-scenario.schema.json.
```

### 📚 Reference Documentation

- **Schema:** [hddl-scenario.schema.json](../../hddl-sim/schemas/hddl-scenario.schema.json)
- **Format Spec:** [Scenario_Replay_Wire_Format.md](Scenario_Replay_Wire_Format.md)
- **Interactive Format:** [Scenario_Interaction_Format.md](Scenario_Interaction_Format.md)
- **Telemetry Spec:** [Decision_Telemetry_Specification.md](../foundations/Decision_Telemetry_Specification.md)
- **Canon Registry:** [Canon_Registry.md](../Canon_Registry.md)
- **Glossary:** [Glossary.md](../Glossary.md)

### 🔧 Validation Workflow

```bash
# 1. Generate scenario (AI or manual)
# 2. Save as .scenario.json in hddl-sim/src/sim/scenarios/

# 3. Validate schema compliance
cd hddl-sim
npm run validate:scenarios

# 4. Load in simulator
# The app auto-loads from scenarios/ directory

# 5. Verify visually
npm run dev
# Open http://localhost:5173
```

## Conclusion

**The system is production-ready for AI-generated scenarios.** The combination of formal JSON schema, validation tools, clear event types, and comprehensive documentation makes it straightforward for AI systems to generate compliant, realistic timeline scenarios.

The schema is intentionally **UI-agnostic** — generated scenarios are portable and can be consumed by any HDDL-compliant implementation, not just this simulation platform.

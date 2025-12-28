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
  "resolvesEventId": "boundary_interaction:12_0:ENV-001:5",
  "label": "Revised constraint"
}
```

**Embedding:** Stores decision/revision in memory for agent retrieval
```json
{
  "type": "embedding",
  "hour": 13.5,
  "envelopeId": "ENV-001",
  "embeddingId": "EMB-001",
  "embeddingType": "revision",
  "sourceEventId": "rev-abc123",
  "actorRole": "Customer Steward",
  "semanticContext": "response time constraint relaxed from 2min to 3min to reduce escalations",
  "semanticVector": [0.35, 0.55],
  "label": "Policy change embedded"
}
```

**Retrieval:** Agent queries decision memory before making decision
```json
{
  "type": "retrieval",
  "hour": 14.8,
  "envelopeId": "ENV-001",
  "actorName": "ResponseTimeMonitor",
  "actorRole": "Customer Steward",
  "queryText": "response time constraint escalation patterns",
  "retrievedEmbeddings": ["EMB-HIST-001", "EMB-001"],
  "relevanceScores": [0.89, 0.94],
  "label": "Queried historical patterns"
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

---

## Closed Loop Requirements (CRITICAL)

**Last Updated:** 2025-12-28

### ⚠️ REQUIRED Embeddings

HDDL scenarios MUST demonstrate complete feedback loops. The following are **normative requirements**:

#### 1. Every Revision MUST Have an Embedding

```json
// Hour 30.5: Revision
{
  "type": "revision",
  "eventId": "revision:30_5:ENV-003:13a",
  "hour": 30.5,
  "envelopeId": "ENV-003",
  "revisionType": "constraint_relaxation",
  "resolvesEventId": "boundary_interaction:28_7:ENV-003:12"
}

// Hour 31: Revision Embedding (REQUIRED!)
{
  "type": "embedding",
  "hour": 31,
  "embeddingId": "EMB-011",
  "embeddingType": "revision",
  "sourceEventId": "revision:30_5:ENV-003:13a",
  "envelopeId": "ENV-003",
  "actorRole": "Pricing Steward",
  "semanticContext": "premium threshold increased to 20% when paired with retention incentives",
  "semanticVector": [0.30, 0.65],
  "label": "Policy change stored"
}
```

**Why:** Policy changes must be retrievable for agents to understand governance evolution.

#### 2. Every Boundary Interaction MUST Have an Embedding

```json
// Hour 28.7: Boundary Interaction
{
  "type": "boundary_interaction",
  "eventId": "boundary:28_7:ENV-003:12",
  "hour": 28.7,
  "envelopeId": "ENV-003",
  "actorName": "QuoteGenerator",
  "boundary_kind": "escalated",
  "boundary_reason": "price_threshold_exceeded"
}

// Hour 29: Boundary Embedding (REQUIRED!)
{
  "type": "embedding",
  "hour": 29,
  "embeddingId": "EMB-009",
  "embeddingType": "boundary_interaction",
  "sourceEventId": "boundary:28_7:ENV-003:12",
  "envelopeId": "ENV-003",
  "actorRole": "Pricing Steward",
  "actorName": "QuoteGenerator",
  "semanticContext": "renewal premium increase exceeding 15% threshold requiring approval",
  "semanticVector": [0.80, 0.75],
  "label": "Escalation pattern stored"
}
```

**Why:** Escalation patterns teach agents their authority boundaries.

### 🎯 RECOMMENDED Patterns

#### 3. Retrieval Before Boundary Interactions

Show agents "thinking with memory" before escalating:

```json
// Hour 78.35: Retrieval
{
  "type": "retrieval",
  "hour": 78.35,
  "actorName": "QuoteGenerator",
  "queryText": "premium increase threshold escalation approval",
  "retrievedEmbeddings": ["EMB-009", "EMB-010", "EMB-HIST-004"],
  "relevanceScores": [0.94, 0.88, 0.72]
}

// Hour 78.4: Boundary (shows agent consulted memory)
{
  "type": "boundary_interaction",
  "hour": 78.4,
  "actorName": "QuoteGenerator",
  "boundary_kind": "escalated"
}
```

#### 4. Historical Baseline Embeddings

Agents should start with pre-existing knowledge (hour < 0):

```json
{
  "type": "embedding",
  "hour": -48,
  "embeddingId": "EMB-HIST-001",
  "embeddingType": "decision",
  "sourceEventId": "historical",
  "envelopeId": "ENV-001",
  "actorRole": "Customer Steward",
  "label": "Historical baseline: Standard refund patterns",
  "detail": "Pre-existing decision memory: Common refund scenarios and resolution patterns.",
  "semanticContext": "customer refund approval patterns with documentation requirements",
  "semanticVector": [0.65, 0.35]
}
```

**Why:** Makes agent behavior realistic (not starting with blank memory).

#### 5. Steward Decisions Should Have Embeddings

Especially decisions resolving boundary interactions:

```json
// Hour 29.1: Steward Decision
{
  "type": "decision",
  "eventId": "decision:29_1:ENV-003:13",
  "hour": 29.1,
  "status": "allowed",
  "actorName": "Alicia Rodriguez",
  "actorRole": "Pricing Steward"
}

// Hour 29.5: Decision Embedding (recommended)
{
  "type": "embedding",
  "hour": 29.5,
  "embeddingId": "EMB-010",
  "embeddingType": "decision",
  "sourceEventId": "decision:29_1:ENV-003:13",
  "semanticContext": "18% premium increase approved with accident forgiveness retention program",
  "semanticVector": [0.65, 0.65]
}
```

---

## The 6-Event Feedback Cycle

Complete pattern for boundary → approval → policy evolution:

```json
// 1. Retrieval (hour X-0.5) - recommended
{
  "type": "retrieval",
  "hour": 28.65,
  "queryText": "similar situations + resolution",
  "retrievedEmbeddings": ["EMB-HIST-004", "EMB-001"],
  "relevanceScores": [0.93, 0.81]
}

// 2. Boundary Interaction (hour X)
{
  "type": "boundary_interaction",
  "eventId": "boundary:28_7",
  "hour": 28.7,
  "boundary_kind": "escalated"
}

// 3. Boundary Embedding (hour X+0.5) - REQUIRED
{
  "type": "embedding",
  "hour": 29,
  "embeddingType": "boundary_interaction",
  "sourceEventId": "boundary:28_7"
}

// 4. Steward Decision (hour X+1)
{
  "type": "decision",
  "eventId": "decision:29_1",
  "hour": 29.1,
  "status": "allowed"
}

// 5. Decision Embedding (hour X+1.5) - recommended
{
  "type": "embedding",
  "hour": 29.5,
  "embeddingType": "decision",
  "sourceEventId": "decision:29_1"
}

// 6. Revision (hour X+2)
{
  "type": "revision",
  "eventId": "revision:30_5",
  "hour": 30.5,
  "resolvesEventId": "boundary:28_7"
}

// 7. Revision Embedding (hour X+2.5) - REQUIRED
{
  "type": "embedding",
  "hour": 31,
  "embeddingType": "revision",
  "sourceEventId": "revision:30_5"
}
```

See [Canonical_Event_Patterns.md](Canonical_Event_Patterns.md) for complete details.

---

## Semantic Vector Space

The `semanticVector: [x, y]` field positions embeddings in 2D space where similar patterns cluster:

- **X-axis**: `policy (0) ↔ operational (1)`
  - 0.0-0.3: High-level governance, policy definitions
  - 0.7-1.0: Day-to-day operational decisions

- **Y-axis**: `routine (0) ↔ exceptional (1)`
  - 0.0-0.3: Standard procedures, common patterns
  - 0.7-1.0: Unusual cases, edge conditions, escalations

**Examples:**
- Standard approval: `[0.65, 0.25]` - operational + routine
- Threshold escalation: `[0.80, 0.75]` - very operational + exceptional
- Policy revision: `[0.30, 0.65]` - policy-level + exceptional

---

#### 4. Temporal Coherence Rules

1. **Envelope Timing**
   - Events must occur within envelope window (`createdHour` ≤ `event.hour` ≤ `endHour`)
   - Revisions should precede version-bumped events

2. **Chronological Consistency (CRITICAL)**
   - Retrievals MUST only reference embeddings with `hour < retrieval.hour`
   - Time paradoxes (retrieving future knowledge) will fail validation

3. **Agent Assignment**
   - Agents must be assigned to envelopes in fleet definitions
   - `agentId` in events must match fleet agent IDs

4. **Causal Ordering**
   - Boundary interactions → often trigger DSG sessions
   - DSG sessions → may result in revisions
   - Revisions → bump `envelope_version`
   - Revisions → MUST have embeddings (+0.5 to +1 hour later)
   - Boundary interactions → MUST have embeddings (+0.5 to +1 hour later)

5. **Steward Consistency**
   - `ownerRole` must match one of the steward roles in fleets
   - Supported roles: Customer Steward, HR Steward, Sales Steward, Data Steward, Domain Engineer, Engineering Steward, Resiliency Steward, Business Domain Steward

#### 5. Sample AI Prompt (Updated for Closed Loops)

```
Generate a valid HDDL scenario JSON file following these rules:

1. Use schema version 2
2. Create 3-5 decision envelopes spanning 48 hours
3. Define steward fleets with 2-4 agents each
4. Generate 30-50 events including:
   - Historical baseline embeddings at hour -48 (2-4 per domain)
   - Signals (metric observations)
   - Decisions (agent actions)
   - Retrieval events before boundary interactions
   - Boundary interactions (constraint warnings)
   - Boundary embeddings (+0.5 hour after each boundary) - REQUIRED
   - At least 2 revisions (steward updates envelope)
   - Revision embeddings (+0.5 hour after each revision) - REQUIRED
   - Optional: 1 DSG session (multi-steward coordination)
5. Ensure CLOSED LOOPS:
   - Every revision has embedding with sourceEventId
   - Every boundary_interaction has embedding with sourceEventId
   - Retrievals only reference embeddings with hour < retrieval.hour
6. Use realistic hour values (0.0 to 48.0)
7. Make event labels human-readable narratives
8. Follow naming conventions (ENV-XXX, AG-XXX-XX, EMB-XXX)
9. Position embeddings in semantic vector space [x, y]
   - x: policy(0) ↔ operational(1)
   - y: routine(0) ↔ exceptional(1)

Output valid JSON matching hddl-scenario.schema.json with complete feedback loops.
```

### 📚 Reference Documentation

- **Schema:** [hddl-scenario.schema.json](../../hddl-sim/schemas/hddl-scenario.schema.json)
- **Format Spec:** [Scenario_Replay_Wire_Format.md](Scenario_Replay_Wire_Format.md)
- **Canonical Patterns:** [Canonical_Event_Patterns.md](Canonical_Event_Patterns.md) ⭐ **Start here for closed loops**
- **Feedback Loop Architecture:** [Agent_Learning_Feedback_Loop.md](Agent_Learning_Feedback_Loop.md)
- **Implementers Guide:** [Implementers_Guide.md](Implementers_Guide.md)
- **Interactive Format:** [Scenario_Interaction_Format.md](Scenario_Interaction_Format.md)
- **Telemetry Spec:** [Decision_Telemetry_Specification.md](../foundations/Decision_Telemetry_Specification.md)
- **Canon Registry:** [Canon_Registry.md](../Canon_Registry.md)
- **Glossary:** [Glossary.md](../Glossary.md)

### 🔧 Validation Workflow

```bash
# 1. Generate scenario (AI or manual)
# 2. Save as .scenario.json in hddl-sim/src/sim/scenarios/

# 3. Validate schema compliance AND closed loops
cd hddl-sim
npm run conformance

# This runs:
# - validate-scenarios.mjs (schema validation)
# - validate-closed-loops.mjs (embedding requirements)

# 4. Load in simulator
# The app auto-loads from scenarios/ directory

# 5. Verify visually
npm run dev
# Open http://localhost:5173
```

**📖 For detailed validation documentation, see [hddl-sim/VALIDATION.md](../../hddl-sim/VALIDATION.md)** - includes error explanations, fix examples, and integration patterns.

### ✅ Conformance Checklist

Your scenario MUST pass these validations:

- ✅ **Schema valid** - Conforms to hddl-scenario.schema.json
- ✅ **Every revision has embedding** - With matching sourceEventId
- ✅ **Every boundary has embedding** - With matching sourceEventId
- ✅ **Chronologically consistent** - Retrievals only reference existing embeddings
- ⚠️ **Boundaries have retrieval** - Shows agent thinking (recommended)
- ⚠️ **Historical baseline exists** - Pre-existing knowledge (recommended)
- ⚠️ **Steward decisions have embeddings** - Judgment patterns (recommended)

Run `npm run conformance` to see detailed validation results.

## Living Reference: Insurance Underwriting Scenario

The most complete example of a closed-loop scenario is:

**[insurance-underwriting.scenario.json](../../hddl-sim/src/sim/scenarios/insurance-underwriting.scenario.json)**

This scenario demonstrates:
- 4 envelopes across insurance domains
- 4 steward fleets with multiple agents
- Historical baseline embeddings (hour -48)
- Complete 6-event feedback cycles
- Retrieval events before decisions
- Semantic vector positioning
- ~1050 lines of realistic event data

**Use this as your reference when generating new scenarios.**

## Conclusion

**The system is production-ready for AI-generated scenarios.** The combination of formal JSON schema, validation tools, clear event types, comprehensive documentation, and **closed loop requirements** makes it straightforward for AI systems to generate compliant, realistic timeline scenarios that demonstrate genuine agent learning.

The schema is intentionally **UI-agnostic** — generated scenarios are portable and can be consumed by any HDDL-compliant implementation, not just this simulation platform.

**Key Insight:** Traditional audit logs record "what happened." HDDL scenarios with closed loops demonstrate **how agents learn from experience, how policy evolves with rationale, and how the feedback mechanism creates continuous improvement.**

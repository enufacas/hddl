# Scenario Replay Wire Format (Draft)

**Goal:** Define a portable, UI-agnostic format for replaying HDDL scenarios as a deterministic event log over a bounded time model.

## Normative shape
- A scenario **MUST** declare `schemaVersion`, `id`, `title`, `durationHours`, `envelopes`, `fleets`, and `events`.
- Producers **MUST** include stable identifiers where interoperability requires them (e.g., `eventId` when cross-referencing).
- Consumers **MUST** ignore unknown fields for forward compatibility unless a future schema version says otherwise.

## Canon alignment
This format is intended to align terminology with the HDDL canon:
- Canon index: docs/Canon_Registry.md
- Vocabulary: docs/Glossary.md
- Telemetry semantics: docs/foundations/Decision_Telemetry_Specification.md
- Simulation concept: docs/appendices/HDDL_Simulation_Concept.md

## Machine-readable schema
- hddl-sim/schemas/hddl-scenario.schema.json

## Notes
This document is intentionally UI-agnostic; it specifies interchange semantics, not any particular visualization.

---

## Closed Loop Requirements (Normative)

**Last Updated:** 2025-12-28

HDDL scenarios MUST demonstrate complete feedback loops for agent learning. Embeddings are not optional decoration—they are the feedback mechanism that enables agent learning and policy evolution.

### Required Embeddings

#### 1. Every `revision` Event MUST Have a Corresponding `embedding` Event

```json
{
  "type": "embedding",
  "embeddingType": "revision",
  "sourceEventId": "revision:30_5:ENV-INS-003:13a",
  "hour": 31,  // Typically +0.5 to +1 hour after revision
  "semanticContext": "policy change description with rationale"
}
```

**Rationale:** Policy changes must be retrievable for agents to understand governance evolution. Without revision embeddings, envelope updates are invisible to decision memory.

**What agents learn:** "The rule changed from X to Y because Z. When I encounter similar situations, the new policy applies."

#### 2. Every `boundary_interaction` Event MUST Have a Corresponding `embedding` Event

```json
{
  "type": "embedding",
  "embeddingType": "boundary_interaction",
  "sourceEventId": "boundary_interaction:28_7:ENV-INS-003:12",
  "hour": 29,  // Typically +0.5 to +1 hour after boundary
  "semanticContext": "escalation pattern description"
}
```

**Rationale:** Escalation patterns teach agents their authority boundaries. Without boundary embeddings, agents can't learn when to escalate.

**What agents learn:** "When I encounter situation X with characteristics Y, I need to escalate because Z."

### Recommended Embeddings

#### 3. Steward `decision` Events SHOULD Have Embeddings

Especially decisions that resolve boundary interactions or demonstrate novel judgment:

```json
{
  "type": "embedding",
  "embeddingType": "decision",
  "sourceEventId": "decision:29_1:ENV-INS-003:13",
  "hour": 29.5,
  "semanticContext": "how steward resolved the case"
}
```

**Rationale:** Human judgment examples help agents improve decision-making.

**What agents learn:** "When situation X was escalated, the steward approved it WITH CONDITIONS Y."

### Chronological Consistency

#### 4. Retrieval Events MUST Only Reference Existing Embeddings

```json
// VALID - retrieval at hour 28.7
{
  "type": "retrieval",
  "hour": 28.7,
  "retrievedEmbeddings": ["EMB-HIST-001", "EMB-005"],  // Both must have hour < 28.7
  "relevanceScores": [0.93, 0.81]
}
```

**Rationale:** Time paradoxes undermine system credibility. Agents cannot retrieve knowledge that doesn't yet exist.

#### 5. Scenarios SHOULD Include Historical Baseline Embeddings

```json
{
  "type": "embedding",
  "hour": -48,  // Before scenario window
  "embeddingId": "EMB-HIST-001",
  "label": "Historical baseline: Risk assessment patterns",
  "detail": "Pre-existing decision memory from prior operations"
}
```

**Rationale:** Agents don't start with blank memory. Historical embeddings represent learned experience before the scenario window, making agent behavior realistic.

### Retrieval Patterns

#### 6. Boundary Interactions SHOULD Be Preceded By Retrieval Events

Agents should demonstrate "thinking with memory" before escalating:

```json
// Hour 78.35: Retrieval
{
  "type": "retrieval",
  "hour": 78.35,
  "actorName": "QuoteGenerator",
  "queryText": "premium increase threshold escalation",
  "retrievedEmbeddings": ["EMB-009", "EMB-010"]
}

// Hour 78.4: Boundary (shows agent consulted memory first)
{
  "type": "boundary_interaction",
  "hour": 78.4,
  "actorName": "QuoteGenerator",
  "boundary_kind": "escalated"
}
```

**Rationale:** Shows agents learning from experience and making informed escalation decisions, not just blindly hitting thresholds.

**Exception:** Simple rule-based decisions don't require retrieval (e.g., "has auto + home → apply 15% discount").

### Validation Requirements

Conformance tools MUST validate:

1. ✅ Every `revision` event has a corresponding `embedding` with matching `sourceEventId`
2. ✅ Every `boundary_interaction` event has a corresponding `embedding` with matching `sourceEventId`
3. ✅ Every `retrieval` event only references `retrievedEmbeddings` with `hour < retrieval.hour`

Conformance tools SHOULD warn:

4. ⚠️ `boundary_interaction` without preceding `retrieval` (within 0.5 hours)
5. ⚠️ Steward `decision` (especially resolving boundaries) without `embedding`
6. ⚠️ Scenario lacking historical baseline embeddings (`hour < 0`)

### Complete Feedback Cycle Example

See [Canonical Event Patterns](./Canonical_Event_Patterns.md) for detailed examples of the 6-event pattern:

```
Retrieval → Boundary → Boundary Embedding → 
Decision → Decision Embedding → Revision → Revision Embedding
```

This creates a closed loop where:
- Agents retrieve historical patterns
- Agents make decisions or escalate
- Decisions are embedded for future retrieval
- Stewards update policy based on patterns
- Policy changes are embedded with rationale
- Future agents retrieve and apply evolved policy

**This is what makes HDDL different from traditional audit logs.**

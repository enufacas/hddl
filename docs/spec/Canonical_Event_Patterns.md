# Canonical Event Patterns

**Status:** Normative  
**Last Updated:** 2025-12-28

---

## Purpose

This document defines the **canonical event patterns** that create complete feedback loops in HDDL scenarios. These patterns ensure agents can learn from decisions, stewards can calibrate policy, and the system demonstrates genuine closed-loop learning.

**Key Principle:** Embeddings are not optional decoration—they are the feedback mechanism that enables agent learning and policy evolution.

---

## The Complete Feedback Cycle

Every boundary interaction triggers a **6-event pattern** that completes the feedback loop from agent action → human judgment → policy revision → agent learning.

### Pattern 1: Boundary → Approval → Policy Evolution

**Scenario:** Agent encounters situation requiring steward judgment, steward approves, policy evolves to handle similar cases.

```
┌─────────────────────────────────────────────────────────┐
│ Hour X-0.5: RETRIEVAL (recommended)                     │
│   Agent queries: "similar situations + resolution"      │
│   Retrieved: Historical patterns + recent decisions     │
│   → Shows agent "thinking with memory"                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Hour X: BOUNDARY INTERACTION                            │
│   Type: boundary_interaction                            │
│   Boundary kind: escalated                              │
│   → Agent recognizes authority limit, requests help     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Hour X+0.5: BOUNDARY EMBEDDING (REQUIRED)               │
│   Type: embedding                                       │
│   Embedding type: boundary_interaction                  │
│   Source: boundary interaction event                    │
│   → Stores: "When this threshold was hit, I escalated"  │
│   → Agents learn: Authority boundaries                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Hour X+1: STEWARD DECISION                              │
│   Type: decision                                        │
│   Status: allowed                                       │
│   → Steward approves with conditions/modifications      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Hour X+1.5: DECISION EMBEDDING (recommended)            │
│   Type: embedding                                       │
│   Embedding type: decision                              │
│   Source: steward decision event                        │
│   → Stores: "How steward handled this case"             │
│   → Agents learn: Resolution patterns                   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Hour X+2: REVISION                                      │
│   Type: revision                                        │
│   Resolves: boundary interaction eventId                │
│   → Policy updated to handle similar cases              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Hour X+2.5: REVISION EMBEDDING (REQUIRED)               │
│   Type: embedding                                       │
│   Embedding type: revision                              │
│   Source: revision event                                │
│   → Stores: "Why policy changed + rationale"            │
│   → Agents learn: Governance evolution                  │
└─────────────────────────────────────────────────────────┘
```

**Real Example: Insurance Pricing Steward**

```json
// Hour 28.65: Retrieval
{
  "type": "retrieval",
  "hour": 28.65,
  "actorName": "CompetitivenessMonitor",
  "queryText": "large premium increase customer retention competitive",
  "retrievedEmbeddings": ["EMB-INS-HIST-004", "EMB-INS-001"],
  "relevanceScores": [0.93, 0.81]
}

// Hour 28.7: Boundary Interaction
{
  "type": "boundary_interaction",
  "hour": 28.7,
  "actorName": "QuoteGenerator",
  "boundary_kind": "escalated",
  "boundary_reason": "price_threshold_exceeded",
  "detail": "Calculated 18% renewal increase (claims history). Exceeds 15% limit."
}

// Hour 29: Boundary Embedding (REQUIRED)
{
  "type": "embedding",
  "hour": 29,
  "embeddingId": "EMB-INS-009",
  "embeddingType": "boundary_interaction",
  "sourceEventId": "boundary_interaction:28_7:ENV-INS-003:12",
  "semanticContext": "renewal premium increase exceeding 15% threshold requiring approval",
  "semanticVector": [0.80, 0.75]
}

// Hour 29.1: Steward Decision
{
  "type": "decision",
  "hour": 29.1,
  "status": "allowed",
  "actorName": "Alicia Rodriguez",
  "detail": "Approved 18% increase with customer notification and retention offer (accident forgiveness)."
}

// Hour 29.5: Decision Embedding (recommended)
{
  "type": "embedding",
  "hour": 29.5,
  "embeddingId": "EMB-INS-010",
  "embeddingType": "decision",
  "sourceEventId": "decision:29_1:ENV-INS-003:13",
  "semanticContext": "18% premium increase approved with accident forgiveness retention program",
  "semanticVector": [0.65, 0.65]
}

// Hour 30.5: Revision
{
  "type": "revision",
  "hour": 30.5,
  "revisionType": "constraint_relaxation",
  "resolvesEventId": "boundary_interaction:28_7:ENV-INS-003:12",
  "reason": "Enable competitive retention strategies while maintaining transparency."
}

// Hour 31: Revision Embedding (REQUIRED - currently missing!)
{
  "type": "embedding",
  "hour": 31,
  "embeddingId": "EMB-INS-011",
  "embeddingType": "revision",
  "sourceEventId": "revision:30_5:ENV-INS-003:13a",
  "semanticContext": "premium threshold increased to 20% when paired with retention incentives",
  "semanticVector": [0.30, 0.65]
}
```

---

### Pattern 2: Boundary → Denial → Constraint Addition

**Scenario:** Agent encounters situation requiring steward judgment, steward denies, policy clarified to define hard limits.

```
┌─────────────────────────────────────────────────────────┐
│ Hour Y-0.5: RETRIEVAL (recommended)                     │
│   Agent queries: "previous escalations + outcomes"      │
│   → Shows agent learned from past patterns              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Hour Y: BOUNDARY INTERACTION                            │
│   → Agent escalates case beyond policy bounds           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Hour Y+0.5: BOUNDARY EMBEDDING (REQUIRED)               │
│   → Stores: "What triggered extreme escalation"         │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Hour Y+1: STEWARD DECISION                              │
│   Status: denied                                        │
│   → Steward declines, provides rationale               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Hour Y+1.5: DECISION EMBEDDING (recommended)            │
│   → Stores: "Why this exceeded boundaries"              │
│   → Agents learn: Hard limits                           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Hour Y+2: REVISION                                      │
│   Type: constraint_addition                             │
│   → Policy clarified with explicit threshold            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Hour Y+2.5: REVISION EMBEDDING (REQUIRED)               │
│   → Stores: "Why hard limit established"                │
│   → Agents learn: Non-negotiable boundaries             │
└─────────────────────────────────────────────────────────┘
```

---

## Retrieval Patterns

### When Retrieval is Highly Recommended

**Before boundary interactions:** Agents should demonstrate they've consulted memory before escalating.

```json
{
  "type": "retrieval",
  "hour": 78.35,
  "actorName": "QuoteGenerator",
  "queryText": "renewal premium increase threshold escalation approval",
  "retrievedEmbeddings": ["EMB-INS-009", "EMB-INS-010", "EMB-INS-HIST-004"],
  "relevanceScores": [0.94, 0.88, 0.72]
}
```

Followed shortly by:

```json
{
  "type": "boundary_interaction",
  "hour": 78.4,
  "actorName": "QuoteGenerator",
  "boundary_kind": "escalated"
}
```

**Rationale:** Shows agent "thinking" - it retrieved patterns showing 18% was approved, helping contextualize whether 28% is reasonable.

### When Retrieval is Optional

**Simple rule applications:** Pure deterministic logic doesn't require memory consultation.

```json
{
  "type": "decision",
  "hour": 16.5,
  "actorName": "DiscountEvaluator",
  "detail": "Applied 15% multi-policy discount (has auto + home → apply 15% rule)"
}
```

**Rationale:** No judgment involved, just rule application.

---

## Embedding Requirements

### REQUIRED Embeddings

#### 1. Every Revision MUST Have an Embedding

```json
{
  "type": "embedding",
  "embeddingType": "revision",
  "sourceEventId": "revision:30_5:ENV-INS-003:13a",
  "semanticContext": "policy change description with rationale",
  "semanticVector": [x, y]
}
```

**Why:** Policy changes must be retrievable. Without revision embeddings, agents can't understand governance evolution.

**What agents learn:** "The rule changed from X to Y because Z. When I encounter similar situations, the new policy applies."

#### 2. Every Boundary Interaction MUST Have an Embedding

```json
{
  "type": "embedding",
  "embeddingType": "boundary_interaction",
  "sourceEventId": "boundary_interaction:28_7:ENV-INS-003:12",
  "semanticContext": "escalation pattern description",
  "semanticVector": [x, y]
}
```

**Why:** Escalation patterns teach agents their authority boundaries.

**What agents learn:** "When I encounter situation X with characteristics Y, I need to escalate because Z."

### RECOMMENDED Embeddings

#### 3. Steward Decisions (Especially Resolving Boundaries)

```json
{
  "type": "embedding",
  "embeddingType": "decision",
  "sourceEventId": "decision:29_1:ENV-INS-003:13",
  "semanticContext": "how steward resolved the case",
  "semanticVector": [x, y]
}
```

**Why:** Human judgment examples help agents improve decision-making.

**What agents learn:** "When situation X was escalated, the steward approved it WITH CONDITIONS Y. I can suggest similar resolutions."

#### 4. Novel Signal Patterns

```json
{
  "type": "embedding",
  "embeddingType": "signal",
  "sourceEventId": "signal:96:ENV-INS-003:24",
  "semanticContext": "telemetry pattern description",
  "semanticVector": [x, y]
}
```

**Why:** Emerging telemetry patterns can inform future monitoring strategies.

---

## Chronological Consistency Requirements

### Retrieval Events MUST Only Reference Existing Embeddings

**INVALID:**
```json
// Hour 28.7: Retrieval
{
  "type": "retrieval",
  "retrievedEmbeddings": ["EMB-INS-009"], // Created at hour 29!
  "hour": 28.7
}

// Hour 29: Embedding created
{
  "type": "embedding",
  "embeddingId": "EMB-INS-009",
  "hour": 29
}
```

**Time paradox:** Agent retrieved embedding that doesn't exist yet.

**VALID:**
```json
// Hour 28.7: Retrieval
{
  "type": "retrieval",
  "retrievedEmbeddings": ["EMB-INS-HIST-004", "EMB-INS-001"], // Both exist before 28.7
  "hour": 28.7
}
```

### Historical Baseline Embeddings

Realistic scenarios include pre-existing knowledge at `hour < 0`:

```json
{
  "type": "embedding",
  "hour": -48,
  "embeddingId": "EMB-INS-HIST-004",
  "embeddingType": "decision",
  "label": "Historical baseline: Competitive pricing",
  "detail": "Pre-existing decision memory: Renewal pricing strategies and customer retention patterns.",
  "semanticContext": "renewal pricing customer retention competitive market pressure",
  "semanticVector": [0.75, 0.35]
}
```

**Why:** Agents don't start with blank memory. Historical embeddings represent learned experience before the scenario window.

---

## Semantic Vector Space

The `semanticVector: [x, y]` field positions embeddings in 2D space where similar patterns cluster:

- **X-axis**: `policy (0) ↔ operational (1)`
  - 0.0-0.3: High-level governance, policy definitions
  - 0.7-1.0: Day-to-day operational decisions
  
- **Y-axis**: `routine (0) ↔ exceptional (1)`
  - 0.0-0.3: Standard procedures, common patterns
  - 0.7-1.0: Unusual cases, edge conditions, escalations

**Example clustering:**
- Bundle discount: `[0.68, 0.35]` - operational + routine
- Threshold escalation: `[0.80, 0.75]` - very operational + very exceptional
- Policy revision: `[0.30, 0.65]` - policy-level + exceptional
- Approved exception: `[0.65, 0.65]` - balanced operational/policy + exceptional

**Use for retrieval:** Agents query by semantic similarity. Embeddings with similar vectors represent related patterns.

---

## Implementation Checklist

### For Scenario Authors

- [ ] Every revision has embedding (+0.5 to +1 hour later)
- [ ] Every boundary interaction has embedding (+0.5 to +1 hour later)
- [ ] Complex steward decisions have embeddings
- [ ] Boundary interactions preceded by retrieval (show "thinking")
- [ ] All retrievals reference chronologically valid embeddings (hour < retrieval.hour)
- [ ] Include historical baseline embeddings (hour < 0) for realistic agent knowledge
- [ ] Semantic vectors cluster related patterns appropriately

### For Conformance Validation

- [ ] Check: Every revision → has embedding with matching sourceEventId
- [ ] Check: Every boundary_interaction → has embedding with matching sourceEventId
- [ ] Check: Every retrieval → all retrievedEmbeddings exist with hour < retrieval.hour
- [ ] Warn: Boundary without preceding retrieval (within 0.5 hours)
- [ ] Warn: Steward decision without embedding (especially if resolves boundary)

---

## The Two Learning Surfaces

### 1. Decision Embeddings = Operational Learning

**What:** Store examples of human judgment on specific cases

**Format:** `embeddingType: "decision"`

**What agents learn:** "How similar cases were handled"

**Example:** "18% premium increase approved with accident forgiveness program"

**Retrieval use case:** Agent facing 16% increase queries for similar patterns, finds this example, suggests retention offer proactively.

### 2. Revision Embeddings = Policy Learning

**What:** Store governance rationale for policy changes

**Format:** `embeddingType: "revision"`

**What agents learn:** "Why the rules changed"

**Example:** "Threshold increased to 20% when paired with retention incentives to enable competitive retention strategies"

**Retrieval use case:** Agent facing 19% increase queries policy evolution, understands 20% is allowed WITH retention offer, operates within new bounds without escalation.

---

## Why This Matters

**Without closed loops:**
- ❌ Agents with amnesia (no learning from past decisions)
- ❌ Policy changes that vanish (governance evolution invisible)
- ❌ Stewards repeatedly answering identical questions (no pattern recognition)
- ❌ Boundary interactions that don't teach future behavior

**With closed loops:**
- ✅ Agents learning from experience (retrieval before decisions)
- ✅ Policy evolution with rationale (why rules changed)
- ✅ Stewards calibrating agents over time (fewer escalations as learning improves)
- ✅ Visible feedback mechanism in action

**This is what makes HDDL different from traditional audit logs.**

Traditional audit logs: "Here's what happened"  
HDDL with closed loops: "Here's what happened, why it happened, how it changed policy, and how future agents will learn from it"

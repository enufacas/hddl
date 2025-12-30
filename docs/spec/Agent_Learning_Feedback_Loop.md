# Agent Learning Feedback Loop

## The Core Question

**"When there is an exception request, and then a follow-on revision to the envelope—what within our scenario creates a surface area for the agent to understand the revision and close the loop?"**

## The Answer: Embeddings

**Embeddings are the agent's interface to learning from both decisions AND envelope changes.**

The feedback loop operates through the Decision Memory & Embedding System, creating a closed loop from agent action → human judgment → policy revision → agent learning.

---

## The Complete Feedback Loop

### Example: Insurance Underwriting Escalation

**Hour 5.3:** **Exception Request** (Boundary Interaction)
```json
{
  "type": "boundary_interaction",
  "actorName": "ThresholdEscalator",
  "boundary_kind": "escalated",
  "boundary_reason": "high_risk_threshold",
  "detail": "Risk score 89/100 (elevated flood risk + prior claims). Routed to senior underwriter."
}
```
- Agent recognizes it's at its authority limit
- Requests human judgment
- Particle flow: Agent → Envelope (boundary check) → Steward (orbits while reviewed)

---

**Hour 5.7:** **Human Decision**
```json
{
  "type": "decision",
  "status": "allowed",
  "actorName": "Senior Underwriter #12",
  "detail": "Approved with flood mitigation requirement (sump pump installation). Premium adjusted to $2,850/year."
}
```
- Human steward makes judgment call
- Adds conditions (mitigation requirements)
- Approves with modification

---

**Hour 6.0:** **Decision Embedding** ← **First Learning Surface**
```json
{
  "type": "embedding",
  "embeddingType": "decision",
  "actorName": "RiskScorer",
  "sourceEventId": "decision:5_7:ENV-INS-001:5",
  "semanticContext": "homeowner policy approval with flood mitigation requirements",
  "semanticVector": [0.65, 0.45]
}
```
**What agents learn:** "When I see risk score 89 + flood risk + prior claims, the human approved it WITH CONDITIONS (sump pump). This pattern is retrievable."

**Agent interface:** Agents query embedding store with semantic similarity:
- Query: "coastal property + flood risk + prior claims"
- Retrieves: This embedding (score: 0.92 relevance)
- Context: "Similar cases were approved with mitigation requirements"

---

**Hour 6.2:** **Envelope Revision**
```json
{
  "type": "revision",
  "revisionType": "constraint_addition",
  "resolvesEventId": "boundary_interaction:5_3:ENV-INS-001:4",
  "detail": "Updated envelope to require flood mitigation verification for similar high-risk coastal properties.",
  "reason": "Codify manual underwriter decision pattern for flood risk properties to improve consistency."
}
```
- Steward updates envelope bounds
- Makes policy explicit
- Links back to the boundary interaction that triggered it
- Particle flow: Steward → Envelope

---

**Hour 41:** **Revision Embedding** ← **Second Learning Surface**
```json
{
  "type": "embedding",
  "embeddingType": "revision",
  "actorName": "Rebecca Foster",
  "sourceEventId": "revision:40:ENV-INS-001:15",
  "semanticContext": "high-risk escalation threshold increased from 85 to 88 for efficiency",
  "semanticVector": [0.22, 0.70]
}
```
**What agents learn:** "The policy itself changed - threshold went from 85→88. This is a GOVERNANCE decision with rationale embedded."

**Agent interface:** When agents query for governance context:
- Query: "risk threshold policy changes"
- Retrieves: This embedding + rationale
- Context: "Threshold moved because manual reviews were consistent for 85-88 range"

---

## The Two Learning Surfaces

### 1. **Decision Embeddings** (Operational Learning)
- **What:** Store examples of human judgment on specific cases
- **When:** Shortly after each decision or boundary resolution
- **Purpose:** Enable case-based reasoning - "What did humans do in similar situations?"
- **Agent benefit:** Contextual decision-making with precedent

**Example retrieval:**
```
Agent sees: Risk score 87, coastal property, flood zone
Agent queries: "coastal flood risk high score"
Retrieves: Embedding from hour 6.0 (relevance: 0.92)
Agent reasons: "Similar case → suggest mitigation requirements in escalation"
```

### 2. **Revision Embeddings** (Policy Learning)
- **What:** Store policy changes and governance decisions
- **When:** After envelope revisions or DSG sessions
- **Purpose:** Enable understanding of WHY boundaries changed
- **Agent benefit:** Semantic understanding of authority shifts

**Example retrieval:**
```
Agent sees: Risk score 87 (used to escalate at 85, now threshold is 88)
Agent queries: "threshold changes risk policy"
Retrieves: Revision embedding from hour 41 (relevance: 0.89)
Agent reasons: "Threshold moved to 88, this is within my new authority"
```

---

## The Missing Event: Retrieval

### Current State
The scenario captures:
- ✅ Agents making decisions
- ✅ Humans making judgments
- ✅ Embeddings being stored
- ✅ Envelope revisions
- ✅ Revision embeddings

### What's Missing
- ❌ **Agents querying embeddings** (retrieval events)
- ❌ **Which embeddings influenced which decisions**
- ❌ **Relevance scores and ranking**

### Proposed: `retrieval` Event Type

**Purpose:** Show when an agent queries decision memory for context

**Example:**
```json
{
  "eventId": "retrieval:5_2:ENV-INS-001:R1",
  "hour": 5.2,
  "type": "retrieval",
  "envelopeId": "ENV-INS-001",
  "actorName": "ThresholdEscalator",
  "queryText": "high risk coastal property flood prior claims",
  "retrievedEmbeddings": [
    "EMB-INS-001",
    "EMB-INS-003",
    "EMB-INS-011"
  ],
  "relevanceScores": [0.92, 0.87, 0.78],
  "label": "Queried decision memory",
  "detail": "Retrieved 3 similar cases before escalation decision"
}
```

**When to emit:**
- **Before decisions:** Agent queries for similar cases
- **Before boundary interactions:** Agent checks if this type of case has been escalated before
- **After revisions:** Agent queries to understand new policy context

**Visualization:**
- Particle flow: Embedding Store → Agent (dotted line, cyan color)
- Shows agent is "thinking with memory"
- Connects decisions to their contextual precedents

---

## Canonical Flow with Retrieval

**Complete loop showing all 6 event types:**

```
1. RETRIEVAL (hour 5.2)
   Embedding Store → ThresholdEscalator
   "Query: coastal flood risk high score"
   Retrieved: 2 similar cases

2. BOUNDARY INTERACTION (hour 5.3)
   ThresholdEscalator → Envelope → Steward
   "Exception Request: risk score 89, escalating"

3. DECISION (hour 5.7)
   Senior Underwriter → Envelope
   "Approved with mitigation requirements"

4. EMBEDDING - Decision (hour 6.0)
   Decision → Embedding Store
   "Store this judgment for future retrieval"

5. REVISION (hour 6.2)
   Steward → Envelope
   "Update policy: require flood mitigation for similar cases"

6. EMBEDDING - Revision (hour 41)
   Revision → Embedding Store
   "Store policy change with rationale"

LOOP CLOSES:
Next similar case → Agent retrieves embeddings from (4) and (6) → Informed decision
```

---

## Why This Matters

### Without Embeddings
Agents would only see:
- ❌ "Rules changed" (mechanical, opaque)
- ❌ "Envelope updated" (no context)
- ❌ "This was blocked" (no learning)

Agents operate in a **read-only memory** model - they can't adapt.

### With Decision & Revision Embeddings
Agents see:
- ✅ **WHAT** happened (the decision/revision)
- ✅ **WHY** it happened (semantic context + rationale)
- ✅ **WHEN** to apply it (semantic similarity matching)
- ✅ **HOW** humans reasoned (case examples with conditions)

Agents operate in a **decision memory** model - they learn from every interaction.

---

## Implementation Checklist

### Schema
- [x] Add `retrieval` to event type enum
- [x] Add `queryText` field (string, human-readable query)
- [x] Add `retrievedEmbeddings` field (array of embeddingIds)
- [x] Add `relevanceScores` field (array of similarity scores 0-1)

### Scenario Data
- [ ] Add retrieval events before agent decisions
- [ ] Link retrievals to the decisions they influenced
- [ ] Show relevance scores for transparency

### Visualization
- [ ] Add retrieval particle flow (Embedding Store → Agent)
- [ ] Style: dotted/dashed line, cyan color
- [ ] Show retrieved embedding IDs in tooltip
- [ ] Animate retrieval before decision particles

### Documentation
- [x] Document feedback loop (this file)
- [ ] Update [Implementers_Guide.md](Implementers_Guide.md) with retrieval event usage
- [x] ~~Update [PARTICLE_FLOW_RULES.md](../../hddl-sim/docs/PARTICLE_FLOW_RULES.md) with retrieval particle flow~~ (**COMPLETED**: Section 6 documents retrieval particle behavior)

---

## Related Concepts

- **Decision Memory**: [Decision_Memory_and_AI_Native_Operations.md](../foundations/Decision_Memory_and_AI_Native_Operations.md)
- **Embedding System**: [Decision_Memory_Embedding_System.md](../foundations/Decision_Memory_Embedding_System.md)
- **Boundary Interactions**: [Denied_Decisions_vs_Boundary_Interactions.md](Denied_Decisions_vs_Boundary_Interactions.md)
- **Steward Role**: [Steward_Playbook.md](../operations/Steward_Playbook.md)

---

## Key Insights

1. **Embeddings ARE the API** between envelopes and agents
   - Envelopes don't "push" updates to agents
   - Agents "pull" context via semantic retrieval
   - This preserves agent autonomy while enabling learning

2. **Revisions alone don't teach agents**
   - A revision is a data structure change (new constraint in JSON)
   - A revision embedding is a semantic concept (why + rationale)
   - Agents need the embedding to understand the "why"

3. **The loop is always closed**
   - Every boundary interaction can lead to a revision
   - Every revision creates an embedding
   - Every future agent can retrieve that embedding
   - Learning compounds over time

4. **Retrieval events make learning visible**
   - Without them, agent reasoning appears spontaneous
   - With them, observers see agents "thinking with memory"
   - Transparency builds trust in agent decisions

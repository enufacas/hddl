# Building with HDDL: Implementer's Guide

**Audience:** Teams building HDDL-compatible UIs, tools, or integrations using the portable spec.

**Last updated:** 2025-12-26

---

## What You Get

The HDDL portable spec gives you:

- ✅ **Scenario Replay Wire Format**: Deterministic event logs for HDDL scenarios
- ✅ **Machine-readable schemas**: JSON Schema for validation
- ✅ **Conformance harness**: Headless validation you can run without the SIM
- ✅ **Authority order**: Know what's normative vs illustrative
- ✅ **Drift + gap analysis**: Know what's stable vs experimental

You can build your own UI, exporter, analyzer, or integration **without reading the SIM code**.

---

## Quick Start

### 1. Clone the repo (for schemas + fixtures)

```bash
git clone https://github.com/enufacas/hddl.git
cd hddl
```

### 2. Read the normative docs

**Start here:**
- [Authority Order](docs/spec/Authority_Order.md): What's binding vs guidance
- [Scenario Replay Wire Format](docs/spec/Scenario_Replay_Wire_Format.md): Interchange format
- [Drift + Gap Analysis](docs/spec/Drift_Gap_Analysis.md): What's stable vs SIM-specific

**Core canon:**
- [HDDL System Overview](docs/foundations/HDDL_System_Overview.md)
- [Foundational Principles](docs/foundations/Human_Derived_Decision_Layer_Foundational_Principles.md)
- [Glossary](docs/Glossary.md)

### 3. Use the schema

**Location:** `hddl-sim/schemas/hddl-scenario.schema.json`

**Example (Node.js with Ajv):**

```javascript
import Ajv from 'ajv'
import fs from 'fs/promises'

const ajv = new Ajv()
const schema = JSON.parse(await fs.readFile('hddl-sim/schemas/hddl-scenario.schema.json', 'utf8'))
const validate = ajv.compile(schema)

const scenario = JSON.parse(await fs.readFile('my-scenario.json', 'utf8'))

if (!validate(scenario)) {
  console.error('Validation failed:', validate.errors)
} else {
  console.log('✓ Valid HDDL scenario')
}
```

### 4. Run conformance checks

```bash
cd hddl-sim
npm install
npm run conformance
```

Validates:
- Canon Registry entries exist
- Scenario packs conform to schema

**Note:** Conformance is automatically gated in `npm test` (runs before Playwright).

### 5. Load a scenario pack

**Example scenarios:** `hddl-sim/src/sim/scenarios/default.scenario.json`

**Normalization:** Use the SIM's normalizer or write your own:

```javascript
import { normalizeScenario } from './hddl-sim/src/sim/scenario-schema.js'

const raw = JSON.parse(await fs.readFile('default.scenario.json', 'utf8'))
const { scenario, errors, warnings } = normalizeScenario(raw)

if (errors.length) {
  console.error('Normalization errors:', errors)
} else {
  console.log('✓ Normalized scenario ready')
  console.log('Schema version:', scenario.schemaVersion)
  console.log('Events:', scenario.events.length)
}
```

---

## What You Must Do (Conformance)

To claim HDDL conformance, your implementation MUST:

1. ✅ Parse scenario packs conforming to `hddl-scenario.schema.json`
2. ✅ Normalize legacy keys (camelCase → snake_case) per Drift + Gap Analysis
3. ✅ Respect event taxonomy (reject unknown types or emit warnings)
4. ✅ Validate event linkage (no orphaned references to unknown envelopes)
5. ✅ Use numeric `hour` for time sequencing
6. ✅ Pass headless conformance checks (`npm run conformance`)

---

## What You May Do (Non-Normative)

You are **not required to**:

- ❌ Match the SIM's UI/UX (colors, layouts, glyph shapes)
- ❌ Implement SIM-specific features (e.g., Story Mode)
- ❌ Use the SIM's selectors/projections (e.g., `getEnvelopeAtTime`)
- ❌ Render events in the same visual style

You **may**:

- ✅ Build a different UI as long as it faithfully represents the scenario semantics
- ✅ Add projections/aggregations beyond what the SIM provides
- ✅ Export to other formats (e.g., DTS-wide telemetry)
- ✅ Build CLI tools, analyzers, or integrations

---

## Key Concepts (From Canon)

### Decision Envelope
**What:** A bounded authorization scope defining what agents may do.

**Schema fields:**
- `envelopeId`: Unique identifier
- `name`: Human-readable label
- `ownerRole`: Steward responsible for revisions
- `assumptions`: Explicit assumptions bounding the envelope
- `constraints`: Hard constraints agents cannot exceed
- `envelope_version`: Monotonically increasing version (starts at 1)
- `revision_id`: Identifier of the last revision (null for base version)

### Events
**Core taxonomy:**
- `signal`: World → Envelope (telemetry/outcome divergence)
- `decision`: Agent execution inside envelope (allowed/blocked)
- `boundary_interaction`: Envelope → Steward (escalated/deferred/overridden)
- `revision`: Steward → Envelope (authority change; increments `envelope_version`)
- `dsg_session`: DSG artifact trigger (cross-domain review)

**Linkage:**
- `revision.resolvesEventId → boundary_interaction.eventId`: Explicit causality
- `decision.envelopeId → envelope.envelopeId`: Decision references envelope
- `agent.envelopeIds → envelope.envelopeId`: Capability assignment

### Time Model
**Numeric hour (0-indexed):**
- Scenario starts at `hour: 0`
- Duration defined by `durationHours`
- Events sequenced by `hour` field
- Optional `ts` (ISO 8601) MAY be included for audit but is not required for replay

---

## Example: Building a CLI Analyzer

**Goal:** Count boundary interactions per envelope.

```javascript
import { normalizeScenario } from './hddl-sim/src/sim/scenario-schema.js'
import fs from 'fs/promises'

const raw = JSON.parse(await fs.readFile('default.scenario.json', 'utf8'))
const { scenario } = normalizeScenario(raw)

const counts = new Map()

for (const event of scenario.events) {
  if (event.type === 'boundary_interaction') {
    const envId = event.envelopeId
    counts.set(envId, (counts.get(envId) || 0) + 1)
  }
}

console.log('Boundary interactions per envelope:')
for (const [envId, count] of counts) {
  const env = scenario.envelopes.find(e => e.envelopeId === envId)
  console.log(`  ${env?.name || envId}: ${count}`)
}
```

---

## Example: Building a Replay UI

**Minimal steps:**

1. **Load scenario:** Parse JSON, normalize via schema
2. **Render envelopes:** Show active envelopes at current time
3. **Render events:** Filter `scenario.events` by `hour <= currentTime`
4. **Handle linkage:** Show open boundary interactions (not yet resolved by a revision)
5. **Respond to time changes:** Re-filter events and re-render

**You don't need to:**
- Replicate the SIM's D3 particle animation (use any visualization)
- Use the SIM's "on-rails" layout (use any layout)
- Implement Story Mode (optional teaching feature)

---

## FAQ

### Q: Is the SIM code normative?

**A:** No. The SIM is a **reference implementation** and **teaching tool**. The normative contract is in:
- `docs/spec/Scenario_Replay_Wire_Format.md`
- `hddl-sim/schemas/hddl-scenario.schema.json`

The SIM's UI patterns (colors, layouts, selectors) are **non-normative guidance**.

### Q: Can I add custom fields to scenario packs?

**A:** Yes, but:
- Consumers MUST ignore unknown fields (forward compatibility)
- If you want your fields to be portable, propose them via the ADR process (see `.github/adr/`)

### Q: What's the difference between `escalation` and `boundary_interaction`?

**A:** `escalation` is **legacy** (deprecated). Use `boundary_interaction` with `boundary_kind: "escalated"`. The SIM normalizer converts legacy events automatically.

### Q: What is `boundary_reason` and when should I use it?

**A:** `boundary_reason` is an **optional** structured field that provides domain-specific escalation context:

```json
{
  "type": "boundary_interaction",
  "boundary_kind": "escalated",        // Required: canonical taxonomy
  "boundary_reason": "fraud_suspected", // Optional: domain-specific code
  "label": "Fraud indicators detected" // Human-readable description
}
```

**Use cases:**
- Analytics queries (count escalations by reason)
- Richer visualizations (show structured context)
- Domain-specific vocabularies (insurance: fraud_suspected, high_risk_threshold)

**Guidance:**
- `boundary_kind` is **required** for interoperability (escalated/deferred/overridden)
- `boundary_reason` is **optional** for domain richness
- Define vocabulary in your domain documentation
- See [Schema Enhancement Proposal](docs/spec/Schema_Enhancement_Boundary_Reason.md) for details

### Q: What if I find a gap in the spec?

**A:** File an issue or propose an ADR:
1. Check [Drift + Gap Analysis](docs/spec/Drift_Gap_Analysis.md) to see if it's already cataloged
2. If not, propose an ADR (see `.github/adr/template.md`)
3. Evaluate against criteria: portability, canon alignment, stability, minimality, testability

### Q: Can I use this for production telemetry?

**A:** The replay format is **not yet DTS-export compatible**. If you need production telemetry:
- The SIM models DTS-bounded semantics (no model internals)
- But SIM events use numeric `hour` instead of ISO 8601 timestamps
- You'll need to build an exporter that enriches SIM events with `ts` fields

See [Drift + Gap Analysis § DTS Compatibility](docs/spec/Drift_Gap_Analysis.md#scope-dts-compatibility-step-2-consideration).

### Q: What's the schema version policy?

**A:** Current version is `schemaVersion: 2`.

- **Breaking changes** bump major version (e.g., 2 → 3)
- Legacy keys are normalized for N=3 versions, then deprecated
- Migration warnings will be added in Phase 2

See [Drift + Gap Analysis § Migration + Versioning](docs/spec/Drift_Gap_Analysis.md#migration--versioning-strategy-step-7).

### Q: How do agents learn from envelope revisions?

**A:** Through the **feedback loop** of embeddings:

1. **Agent encounters boundary** → `boundary_interaction` event
2. **Human makes judgment** → `decision` event  
3. **Decision stored in memory** → `embedding` event (type: "decision")
4. **Steward revises envelope** → `revision` event
5. **Revision stored in memory** → `embedding` event (type: "revision")
6. **Agent retrieves context** → `retrieval` event (queries embedding store)

**Key insight:** Agents don't receive "push notifications" of revisions. Instead, they **query decision memory** via semantic retrieval before making decisions. This allows them to discover:
- **Case examples** (what humans decided in similar situations)
- **Policy rationale** (why boundaries changed, with context)

**Example:**
```json
// Agent queries before deciding
{
  "type": "retrieval",
  "actorName": "RiskScorer",
  "queryText": "coastal flood risk high score",
  "retrievedEmbeddings": ["EMB-INS-001", "EMB-INS-011"],
  "relevanceScores": [0.92, 0.78]
}

// Retrieved embedding includes revision context
{
  "embeddingId": "EMB-INS-011",
  "embeddingType": "revision",
  "sourceEventId": "revision:40:ENV-INS-001:15",
  "semanticContext": "high-risk escalation threshold increased from 85 to 88 for efficiency"
}
```

See [Agent_Learning_Feedback_Loop.md](Agent_Learning_Feedback_Loop.md) for the complete feedback loop architecture.

### Q: What's the difference between denied decisions and boundary interactions?

**A:** Both involve limits, but represent different scenarios:

- **Denied Decision:** Agent made a decision, envelope blocked it (enforcement)
  - `type: "decision"` + `status: "denied"`
  - "I tried to do X, but the envelope stopped me"
  - Envelope exercises veto authority
  
- **Boundary Interaction:** Agent recognizes its limit before deciding (recognition)
  - `type: "boundary_interaction"` + `boundary_kind: "escalated"`
  - "I can't do X, I need human help"
  - Agent proactively requests escalation

See [Denied_Decisions_vs_Boundary_Interactions.md](Denied_Decisions_vs_Boundary_Interactions.md) for detailed comparison.

### Q: When are embeddings required vs optional?

**A:** Embeddings create the feedback loop that enables agent learning. Requirements:

**REQUIRED:**
- **Every revision** MUST have an embedding
  - `embeddingType: "revision"` with `sourceEventId` pointing to revision
  - Why: Policy changes must be retrievable for agents to understand governance evolution
  
- **Every boundary interaction** MUST have an embedding
  - `embeddingType: "boundary_interaction"` with `sourceEventId` pointing to boundary
  - Why: Escalation patterns teach agents their authority boundaries

**RECOMMENDED:**
- **Steward decisions** (especially resolving boundaries) SHOULD have embeddings
  - `embeddingType: "decision"` with `sourceEventId` pointing to decision
  - Why: Human judgment examples help agents improve decision-making

**OPTIONAL:**
- Simple rule-based agent decisions MAY have embeddings
- Novel signal patterns MAY have embeddings if they represent learning opportunities

**Example showing required pattern:**
```json
// Hour 28.7: Boundary Interaction
{
  "type": "boundary_interaction",
  "eventId": "boundary:28_7:ENV-003:12",
  "actorName": "QuoteGenerator",
  "boundary_kind": "escalated"
}

// Hour 29: Boundary Embedding (REQUIRED!)
{
  "type": "embedding",
  "hour": 29,
  "embeddingId": "EMB-009",
  "embeddingType": "boundary_interaction",
  "sourceEventId": "boundary:28_7:ENV-003:12",
  "semanticContext": "premium increase threshold escalation pattern"
}

// Hour 30.5: Revision
{
  "type": "revision",
  "eventId": "revision:30_5:ENV-003:13a",
  "revisionType": "constraint_relaxation",
  "resolvesEventId": "boundary:28_7:ENV-003:12"
}

// Hour 31: Revision Embedding (REQUIRED!)
{
  "type": "embedding",
  "hour": 31,
  "embeddingId": "EMB-011",
  "embeddingType": "revision",
  "sourceEventId": "revision:30_5:ENV-003:13a",
  "semanticContext": "threshold increased to 20% with retention incentives"
}
```

See [Canonical_Event_Patterns.md](Canonical_Event_Patterns.md) for complete feedback loop patterns.

### Q: How do I model a complete feedback loop?

**A:** Follow the 6-event canonical pattern for boundary interactions:

```
1. Retrieval (recommended) - Agent queries historical patterns
2. Boundary Interaction - Agent escalates
3. Boundary Embedding (REQUIRED) - Escalation pattern stored
4. Steward Decision - Human judgment
5. Decision Embedding (recommended) - Resolution pattern stored
6. Revision - Policy updated
7. Revision Embedding (REQUIRED) - Policy rationale stored
```

**Minimal working example:**
```json
// 1. Retrieval (hour 28.65)
{
  "type": "retrieval",
  "actorName": "QuoteGenerator",
  "queryText": "premium increase threshold",
  "retrievedEmbeddings": ["EMB-HIST-004", "EMB-001"],
  "relevanceScores": [0.93, 0.81]
}

// 2. Boundary (hour 28.7)
{
  "type": "boundary_interaction",
  "eventId": "boundary:28_7",
  "boundary_kind": "escalated"
}

// 3. Boundary Embedding (hour 29) - REQUIRED
{
  "type": "embedding",
  "embeddingType": "boundary_interaction",
  "sourceEventId": "boundary:28_7"
}

// 4. Decision (hour 29.1)
{
  "type": "decision",
  "eventId": "decision:29_1",
  "status": "allowed"
}

// 5. Decision Embedding (hour 29.5) - recommended
{
  "type": "embedding",
  "embeddingType": "decision",
  "sourceEventId": "decision:29_1"
}

// 6. Revision (hour 30.5)
{
  "type": "revision",
  "eventId": "revision:30_5",
  "resolvesEventId": "boundary:28_7"
}

// 7. Revision Embedding (hour 31) - REQUIRED
{
  "type": "embedding",
  "embeddingType": "revision",
  "sourceEventId": "revision:30_5"
}
```

**Why this matters:** Without closed loops, agents can't learn. The embedding chain creates retrievable memory that improves future decisions.

See [Canonical_Event_Patterns.md](Canonical_Event_Patterns.md) for detailed examples and [Agent_Learning_Feedback_Loop.md](Agent_Learning_Feedback_Loop.md) for the architecture.

### Q: What makes HDDL different from traditional audit logs?

**A:** Traditional audit logs record "what happened." HDDL scenarios with closed loops demonstrate:

- **Agent learning:** Retrieval events show agents "thinking with memory"
- **Policy evolution:** Revision embeddings store WHY rules changed
- **Feedback mechanism:** Complete cycles from boundary → decision → revision → embedding
- **Chronological consistency:** Time-aware retrieval (can't retrieve future knowledge)
- **Historical baseline:** Agents start with pre-existing knowledge (hour < 0 embeddings)

**Traditional audit log:**
```
10:23 - User submitted request
10:24 - Manager approved
10:25 - System processed
```

**HDDL scenario with closed loops:**
```
Hour 28.65 - Agent retrieved similar cases (EMB-HIST-004: 93% relevance)
Hour 28.7 - Agent escalated (recognized authority limit)
Hour 29 - Escalation pattern embedded (future agents learn when to escalate)
Hour 29.1 - Steward approved with conditions
Hour 29.5 - Resolution pattern embedded (how to handle with retention offers)
Hour 30.5 - Policy updated (threshold 15%→20% with incentives)
Hour 31 - Policy rationale embedded (why relaxation + retention strategy)
```

The second example shows a learning system, not just a log.

---

## Interactive Scenarios (Phase 2)

**Status:** Schema exists ([hddl-interaction.schema.json](../hddl-sim/schemas/hddl-interaction.schema.json)) but **semantics are not yet stable**.

If you want to build an interactive UI (action-driven, not replay-only):
- The action log schema is a **draft**
- Runner/reducer semantics are **not yet defined**
- Conformance fixtures are **not yet provided**

**Recommendation:** Wait for Phase 2 or participate in defining the semantics via ADR process.

---

## Get Help

- **Spec questions:** File an issue in the repo or propose an ADR
- **Canon questions:** Check [Canon Registry](../docs/Canon_Registry.md) or [Glossary](../docs/Glossary.md)
- **SIM questions:** The SIM is illustrative; check the spec first

---

## Contributing

Want to improve the spec or add conformance fixtures?

1. Read [Authority Order](docs/spec/Authority_Order.md) to understand what's normative
2. Propose changes via ADR (see `.github/adr/template.md`)
3. Run `npm run conformance` to validate
4. Submit a PR with ADR reference

---

## License

[License information here]

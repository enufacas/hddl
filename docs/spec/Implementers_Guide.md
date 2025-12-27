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

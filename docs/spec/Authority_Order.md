# Authority Order: What is Normative?

**Purpose:** Define which documents are authoritative (normative) vs illustrative (non-normative) so SIM implementers, external teams, and spec contributors know where the source of truth lives.

**Last updated:** 2025-12-26

---

## Normative (Authoritative)

These documents define **what HDDL is** and **what implementations MUST comply with**. Changes to these documents are subject to the canon change process (see ADR workflow).

### Tier 1: Core Canon
**Canon Registry + Glossary + Foundations**

1. **Canon Registry** (`docs/Canon_Registry.md`)
   - Index of all normative documents
   - MUST be validated for existence and currency
   - Maintained via explicit change process

2. **Glossary** (`docs/Glossary.md`)
   - Canonical definitions of HDDL terms
   - Source of truth for terminology
   - Used by SIM for inline glossary tooltips

3. **Foundations** (`docs/foundations/`)
   - **Human_Derived_Decision_Layer_Foundational_Principles.md**: Core principles
   - **Human_Derived_Decision_Layer_Manifesto.md**: Why HDDL exists
   - **HDDL_System_Overview.md**: Architecture overview
   - **Decision_Telemetry_Specification.md**: DTS bounded semantics (what is observable, what is not)
   - **Decision_Memory_and_AI_Native_Operations.md**: Decision Memory contract
   - **Executive_Reference.md**: Executive-level framing

### Tier 2: Portable Spec Artifacts
**Wire formats + schemas + conformance**

4. **Scenario Replay Wire Format** (`docs/spec/Scenario_Replay_Wire_Format.md`)
   - Normative interchange format for HDDL scenarios (timeline replay)
   - Machine-readable schema: `hddl-sim/schemas/hddl-scenario.schema.json`
   - MUST/SHOULD/MAY language applies
   - **Includes:** Closed loop requirements (embeddings for revisions/boundaries)

5. **Canonical Event Patterns** (`docs/spec/Canonical_Event_Patterns.md`)
   - Normative patterns for feedback loops in scenarios
   - Defines REQUIRED embeddings (revisions, boundary interactions)
   - Defines RECOMMENDED patterns (retrieval before boundaries, historical baseline)
   - Specifies chronological consistency requirements
   - MUST/SHOULD/MAY language applies

6. **Agent Learning Feedback Loop** (`docs/spec/Agent_Learning_Feedback_Loop.md`)
   - Normative architecture for how agents learn from decisions and revisions
   - Defines embeddings as the agent interface to decision memory
   - Specifies decision embeddings (operational learning) vs revision embeddings (policy learning)
   - Referenced by Canonical Event Patterns and Implementers Guide

7. **Denied Decisions vs Boundary Interactions** (`docs/spec/Denied_Decisions_vs_Boundary_Interactions.md`)
   - Normative distinction between enforcement (denied) and recognition (boundary) models
   - Clarifies when to use `type: "decision"` + `status: "denied"` vs `type: "boundary_interaction"`
   - Referenced by Implementers Guide

8. **Scenario Interaction Format** (`docs/spec/Scenario_Interaction_Format.md`)
   - Normative interchange format for action-driven scenarios
   - Machine-readable schema: `hddl-sim/schemas/hddl-interaction.schema.json`
   - MUST/SHOULD/MAY language applies
   - **Note:** Semantics are Phase 2 (not yet stable)

9. **Drift + Gap Analysis** (`docs/spec/Drift_Gap_Analysis.md`)
   - Normative catalog of spec vs SIM differences
   - Classifies what is portable vs SIM-specific
   - Updated whenever SIM proposes changes

10. **Implementers Guide** (`docs/spec/Implementers_Guide.md`)
    - Normative guide for building HDDL-compatible implementations
    - Includes FAQs on closed loops, embeddings, and event patterns
    - Provides code examples and conformance checklist
    - Links to all specification documents

11. **Conformance Scripts** (`hddl-sim/scripts/`)
    - `validate-canon-registry.mjs`: Validates Canon Registry entries exist
    - `validate-scenarios.mjs`: Validates scenario packs conform to schema
    - `validate-closed-loops.mjs`: Validates closed loop requirements (embeddings, chronology)
    - `conformance.mjs`: Runs all conformance checks
    - These scripts enforce normative requirements

---

## Non-Normative (Illustrative)

These documents provide **guidance, examples, and teaching** but are **not binding** on implementations. External teams MAY adopt these patterns but are not required to.

### Teaching + Narratives
**Illustrative stories and scenarios**

8. **Narratives** (`docs/narratives/`)
   - Example scenarios that teach HDDL concepts
   - **Note:** Default SIM scenario is based on "Narrative_Thursday_Two_Years_Later.md" but the narrative itself is non-normative
   - These are teaching tools, not requirements

9. **Simulation Concept** (`docs/appendices/HDDL_Simulation_Concept.md`)
   - Describes how HDDL concepts *could* be experienced
   - Explicitly labeled as non-normative in the doc itself

### Operations + Roles
**Guidance for human stewardship**

10. **Operations** (`docs/operations/`)
    - `Ceremonies_and_Operating_Cadence.md`: Illustrative cadence (structure is normative, timing is adjustable)
    - `Steward_Playbook.md`: Guidance for stewards
    - `Request_Lifecycle_Walkthrough.md`: Example lifecycle
    - **Note:** Structure of stewardship is normative; specific cadences/playbooks are illustrative

11. **Roles** (`docs/roles/`)
    - Role definitions and responsibilities
    - Canon defines that these roles exist; specific workflows are illustrative

12. **Groups** (`docs/groups/`)
    - `Decision_Stewardship_Group.md`: DSG artifact contract is normative; meeting format is illustrative

### SIM Implementation
**Reference implementation (not binding on other implementations)**

13. **SIM Pages + UI Code** (`hddl-sim/src/`)
    - The SIM is a **reference implementation** and **teaching tool**
    - UI patterns (layout, colors, terminology) are illustrative
    - Selectors/projections (e.g., `getEnvelopeAtTime`) are **derived** and non-normative
    - External implementations MAY use different UI/UX as long as they conform to the wire format

14. **Scenario Packs** (`hddl-sim/src/sim/scenarios/`)
    - Example scenarios for replay
    - **Note:** Scenario packs MUST conform to the wire format schema, but the specific scenarios are non-normative

---

## Decision Process: When to Promote

**Trigger:** SIM requires an unmodeled concept or stronger semantics.

**Process:**
1. Propose the change as an ADR (Architecture Decision Record) in `.github/adr/`
2. Evaluate against criteria:
   - **Portability:** Can external teams implement this without reading SIM code?
   - **Canon alignment:** Does this align with DTS boundedness and HDDL principles?
   - **Stability:** Is this concept mature enough to be normative?
   - **Minimality:** Is this the simplest contract that works?
   - **Testability:** Can conformance be validated headlessly?
3. If accepted:
   - Update spec/schema
   - Add conformance fixtures
   - Update Canon Registry
   - Announce the change (schema version bump if breaking)

**See:** `.github/adr/template.md` (to be created in Phase 2)

---

## Examples: Normative vs Non-Normative

| Concept | Normative Aspect | Non-Normative Aspect |
|---------|------------------|----------------------|
| Decision Envelope | Schema requires `envelopeId`, `name`, `ownerRole`, `assumptions`, `constraints` | SIM renders envelopes as envelope-shaped glyphs; external UIs may use different visuals |
| Revision | Event type `revision` with `revision_id`, `envelope_version`, `nextAssumptions`, `nextConstraints` | SIM shows revision diffs in a modal; external UIs may show diffs differently |
| Boundary Interaction | Event type `boundary_interaction` with `boundary_kind: escalated\|deferred\|overridden` | SIM renders open exceptions as persistent links until resolved; external UIs may use different cues |
| Time Model | Numeric hour (0-indexed from scenario start) | SIM renders time as "Day X, HH:00"; external UIs may use different formatting |
| Story Mode | Not specified (SIM-only feature) | SIM adds narrative beats at specific times; external UIs are not required to implement this |

---

## Conformance Checklist for External Implementers

To build a conforming HDDL replay implementation, you MUST:

- ✅ Parse scenario packs that conform to `hddl-sim/schemas/hddl-scenario.schema.json`
- ✅ Normalize legacy keys (camelCase→snake_case) per the Drift + Gap Analysis
- ✅ Respect event taxonomy (reject unknown event types or emit warnings)
- ✅ Validate event linkage (no orphaned references)
- ✅ Use numeric hour for time sequencing
- ✅ Pass headless conformance checks (`npm run conformance` in the SIM repo)

You MAY:
- Use different UI/UX (colors, layouts, terminology) as long as semantics are preserved
- Implement additional projections/selectors beyond what SIM provides
- Add SIM-specific features (like Story Mode) that are not part of the spec

You MUST NOT:
- Claim conformance if you don't pass the conformance suite
- Invent new event types or fields without proposing them via the canon change process
- Break determinism (same scenario pack MUST produce same replay)

---

## Validation

Canon Registry conformance is validated automatically via:
```bash
npm run conformance
```

This runs:
1. Canon Registry validator (all entries exist)
2. Scenario pack validator (all packs conform to schema)

Conformance is gated on `npm test` (runs before Playwright).

---

## Questions?

- **"Is X normative?"** → Check if it's in Tier 1 or Tier 2 above. If yes, it's normative. If no, it's illustrative.
- **"Can I change X?"** → If normative, use the ADR process. If non-normative, change it freely (but consider contributing back if it's useful).
- **"What if the SIM does something not in the spec?"** → File an issue; either the spec needs updating or the SIM is drifting (see Drift + Gap Analysis).

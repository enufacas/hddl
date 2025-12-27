# ADR-NNNN: [Short Title]

**Status:** [Proposed | Accepted | Rejected | Superseded by ADR-XXXX]  
**Date:** YYYY-MM-DD  
**Deciders:** [List of people involved in the decision]  
**Tags:** [canon-change, spec, schema, SIM-only, migration]

---

## Context

**What problem are we solving?**

Describe the SIM-driven need or gap that triggered this proposal. Examples:
- SIM needs to model a concept not yet in the canon (e.g., "retry policy" for boundary interactions)
- SIM discovered ambiguity in the spec (e.g., "what happens if a revision doesn't include `nextAssumptions`?")
- External implementer requested clarification (e.g., "is `dsg_message.authorRole` required?")

Include:
- Current state (what exists today)
- Desired state (what we want to achieve)
- Why this matters (impact on portability, teaching, canon alignment)

---

## Decision

**What are we changing?**

Be specific about:
1. **Canon/Spec changes:** Which documents are updated? (e.g., add new field to `hddl-scenario.schema.json`)
2. **SIM changes:** How does the SIM implement this? (e.g., add `retryCount` to boundary interactions)
3. **Schema version impact:** Does this require a schema version bump?
4. **Migration path:** How do existing scenario packs migrate? (e.g., normalizer provides default value)

**What are we NOT changing?**

Explicitly call out what stays the same to avoid scope creep.

---

## Criteria Evaluation

Evaluate the proposal against the canon change criteria (from `docs/spec/Authority_Order.md`):

| Criterion | Assessment | Notes |
|-----------|-----------|-------|
| **Portability** | ✅ / ⚠️ / ❌ | Can external teams implement this without reading SIM code? |
| **Canon alignment** | ✅ / ⚠️ / ❌ | Does this align with DTS boundedness and HDDL principles? |
| **Stability** | ✅ / ⚠️ / ❌ | Is this concept mature enough to be normative? |
| **Minimality** | ✅ / ⚠️ / ❌ | Is this the simplest contract that works? |
| **Testability** | ✅ / ⚠️ / ❌ | Can conformance be validated headlessly? |

**Overall recommendation:** Promote to spec / Keep SIM-only / Reject

---

## Consequences

**What happens if we accept this?**

Positive:
- External implementers can now model X
- Canon becomes clearer about Y
- SIM becomes more faithful to Z

Negative / Trade-offs:
- Adds complexity to the schema
- Requires migration tooling for existing packs
- May conflict with future DTS export requirements

**What happens if we reject this?**

- SIM continues to model X as a SIM-only feature (non-portable)
- External implementers must invent their own approach
- Potential drift if multiple implementations emerge

---

## Alternatives Considered

List 2-3 alternative approaches and why they were not chosen. Examples:
- **Alt 1:** Add X to the spec but make it optional → Rejected because it creates ambiguity
- **Alt 2:** Keep X as SIM-only → Rejected because external implementers need it
- **Alt 3:** Use existing field Y instead of adding X → Rejected because Y has different semantics

---

## Implementation Plan

**Phase 1: Spec + Schema**
1. Update `docs/spec/Scenario_Replay_Wire_Format.md` (or Interaction Format)
2. Update `hddl-sim/schemas/hddl-scenario.schema.json`
3. Bump schema version if breaking (e.g., `schemaVersion: 2 → 3`)
4. Update `docs/spec/Drift_Gap_Analysis.md` to mark the item as resolved

**Phase 2: Conformance**
5. Add conformance fixtures in `hddl-sim/conformance/fixtures/` (must-pass, must-fail)
6. Update validators to enforce new rules

**Phase 3: SIM Implementation**
7. Update `hddl-sim/src/sim/scenario-schema.js` normalizer
8. Update `hddl-sim/src/sim/scenario-default.js` (or scenario packs) with examples
9. Update UI pages if needed

**Phase 4: Canon Registry**
10. Update `docs/Canon_Registry.md` to reference new spec sections
11. Update `docs/Glossary.md` if new terms are introduced
12. Run `npm run conformance` to validate

---

## References

- Related ADRs: ADR-XXXX, ADR-YYYY
- Canon docs: `docs/foundations/Decision_Telemetry_Specification.md`
- Spec docs: `docs/spec/Scenario_Replay_Wire_Format.md`
- SIM implementation: `hddl-sim/src/sim/scenario-schema.js`
- GitHub issue: #NNNN (if applicable)
- External request: [link or description]

---

## Decision Log

| Date | Status | Notes |
|------|--------|-------|
| YYYY-MM-DD | Proposed | Initial draft |
| YYYY-MM-DD | Accepted | Decision made; schema version bumped to X |
| YYYY-MM-DD | Implemented | Changes merged; conformance passing |

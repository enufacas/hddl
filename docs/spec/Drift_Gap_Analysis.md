# Drift + Gap Analysis: Spec vs SIM

**Purpose:** Catalog differences between the portable spec (wire format + interaction semantics) and the current SIM implementation, then classify each item as: promote to spec, keep SIM-only, or migrate away.

**Last updated:** 2025-12-26

---

## Key Naming / Field Drift

| Concept | Spec/Canon Term | SIM Variants | Status | Decision |
|---------|----------------|--------------|--------|----------|
| Envelope identifier | `envelopeId` | `envelope_id`, `envelopeId` | ✅ Normalized | **Promote**: Spec mandates `envelopeId`; SIM normalizer accepts legacy `envelope_id` |
| Revision identifier | `revision_id` | `revisionId`, `revision_id` | ✅ Normalized | **Promote**: Spec mandates `revision_id`; SIM normalizer accepts `revisionId` |
| Envelope version | `envelope_version` | `envelopeVersion`, `version` | ✅ Normalized | **Promote**: Spec mandates `envelope_version`; SIM normalizer accepts `envelopeVersion` |
| Boundary interaction kind | `boundary_kind` | `boundaryKind` | ✅ Normalized | **Promote**: Spec mandates `boundary_kind`; SIM normalizer accepts `boundaryKind` |
| Resolves event link | `resolvesEventId` | `resolves_eventId`, `resolvesEventID`, `resolves` | ✅ Normalized | **Promote**: Spec mandates `resolvesEventId`; SIM normalizer accepts all variants |
| Decision identifier | `decision_id` | `decisionId` | ✅ Normalized | **Promote**: Spec mandates `decision_id`; SIM normalizer accepts `decisionId` |

**Conformance rule:** Producers MUST emit canonical snake_case keys for portable interchange; consumers MUST normalize legacy camelCase variants for N=3 schema versions, then deprecate.

---

## Time Model

| Aspect | Spec | SIM | Status | Decision |
|--------|------|-----|--------|----------|
| Primary time unit | Numeric hour (0-indexed from scenario start) | Same | ✅ Aligned | **Promote**: Numeric hour is canonical |
| Timestamps | Not required (optional `ts` field for audit) | Not used | ⚠️ Gap | **Keep gap**: DTS may require timestamps; SIM doesn't yet model them |
| Duration | `durationHours` (numeric) | Same | ✅ Aligned | **Promote**: `durationHours` is canonical |

**Conformance rule:** Portable scenarios MUST use numeric `hour` for event sequencing; optional `ts` (ISO 8601) MAY be included for audit/export but is not required for deterministic replay.

---

## Event Taxonomy

| Event Type | Spec Status | SIM Usage | Canon Ref | Decision |
|------------|-------------|-----------|-----------|----------|
| `envelope_promoted` | ✅ Specified | Used | Implicit in DTS | **Promote**: lifecycle marker |
| `signal` | ✅ Specified | Used | DTS bounded | **Promote**: world→envelope telemetry |
| `decision` | ✅ Specified | Used | DTS bounded | **Promote**: agent execution inside envelope |
| `revision` | ✅ Specified | Used | Canon: steward artifact | **Promote**: steward→envelope authority change |
| `boundary_interaction` | ✅ Specified | Used | Canon: escalation/defer/override | **Promote**: envelope→steward interaction |
| `escalation` | ⚠️ Legacy | Deprecated in favor of `boundary_interaction` | N/A | **Migrate away**: use `boundary_interaction` with `boundary_kind: "escalated"` |
| `dsg_session` | ✅ Specified | Used | Canon: DSG artifact trigger | **Promote**: cross-domain review artifact |
| `dsg_message` | ✅ Specified | Used | Canon: DSG threading | **Promote**: artifact threading (non-normative detail level) |
| `annotation` | ✅ Specified | Used | Decision Memory (recall-only) | **Promote**: non-authoritative recall link |

**Conformance rule:** Spec MUST define event taxonomy as an enum; SIM normalization MUST reject unknown types (or emit warnings for forward compatibility).

**Migration path:** `escalation` events in legacy scenarios are automatically converted to `boundary_interaction` with `boundary_kind: "escalated"` by the normalizer.

---

## Linkage Semantics

| Relationship | Spec | SIM | Status | Decision |
|--------------|------|-----|--------|----------|
| Revision resolves boundary interaction | `revision.resolvesEventId → boundary_interaction.eventId` | Used (open exception links) | ✅ Aligned | **Promote**: explicit causality link |
| Decision references envelope | `decision.envelopeId → envelope.envelopeId` | Used | ✅ Aligned | **Promote**: required |
| Agent assigned to envelope | `agent.envelopeIds → envelope.envelopeId` | Used | ✅ Aligned | **Promote**: capability assignment |
| Annotation joins decision memory | `annotation.decision_id` (optional) | Used | ⚠️ Gap | **Keep SIM-only**: decision memory is recall-only and non-authoritative; may promote if canon requires it |

**Conformance rule:** Events MUST NOT reference unknown envelopes; validators SHOULD emit errors for orphaned event references.

---

## Interactive Scenario Semantics (Step 3 Gaps)

| Aspect | Spec | SIM | Status | Decision |
|--------|------|-----|--------|----------|
| Action/command model | Schema exists; semantics TBD | Not implemented | ⚠️ Gap | **Phase 2**: Define canonical action set (emit_signal, attempt_decision, apply_revision, etc.) |
| Deterministic reducer | Not specified | Not implemented | ⚠️ Gap | **Phase 2**: Define state→action→state' + emitted events |
| Authorization semantics | Not specified | Not enforced | ⚠️ Gap | **Phase 2**: Who may revise, who may escalate, etc. |
| Randomness seeding | Spec requires explicit seed if random | Not used | ⚠️ Gap | **Phase 2**: If interaction uses randomness, seed MUST be recorded |
| Must-pass/must-fail fixtures | Not provided | Not implemented | ⚠️ Gap | **Phase 2**: Conformance fixtures for interactive scenarios |

**Decision:** Interactive scenario is a **Phase 2 deliverable**; replay wire format (Phase 1) is stable enough for external implementers to build replay-only UIs.

---

## UI-Derived vs Canonical

| Projection | SIM Implementation | Spec Status | Decision |
|------------|-------------------|-------------|----------|
| `getEnvelopeAtTime(id, hour)` | Selector that replays revisions up to `hour` | Not spec'd | **Keep SIM-only**: derived projection; spec only mandates event log |
| `getEnvelopeLineage(id)` | Selector that builds version chain | Not spec'd | **Keep SIM-only**: derived projection |
| `getBoundaryInteractionCounts(hour, window)` | Selector that aggregates boundary events | Not spec'd | **Keep SIM-only**: UI metric; not required for interchange |
| Assumption mismatch detection | UI feature comparing signal refs to envelope assumptions at signal hour | Not spec'd | **Keep SIM-only**: UI interpretation; spec doesn't mandate drift detection logic |
| Fleet "working vs idle" classification | UI feature based on recent activity window | Not spec'd | **Keep SIM-only**: UI heuristic |

**Conformance rule:** Selectors/projections are **non-normative guidance**; external implementations MAY provide equivalent projections but are not required to match SIM's exact logic.

---

## DSG Representation (Step 3 Consideration)

| Aspect | Spec | SIM | Canon Ref | Decision |
|--------|------|-----|-----------|----------|
| Session identifier | `dsg_session.sessionId` | Used | Canon: DSG artifact | **Promote**: session is the artifact boundary |
| Message threading | `dsg_message.sessionId` | Used | Canon: optional detail | **Promote (optional)**: threading is non-normative detail; minimal spec only requires session |
| Artifact output | Revisions that reference session via context or linkage | Implicit | Canon: DSG produces revision artifacts | **Gap**: make explicit via optional `revision.dsg_sessionId` or `revision.context` |

**Decision:** Keep session+message threading in the spec as **optional detail**; minimal conformance only requires `dsg_session` exists and revisions can be traced back to it.

---

## Scope: DTS Compatibility (Step 2 Consideration)

| Aspect | DTS Expectation | SIM Usage | Decision |
|--------|-----------------|-----------|----------|
| Wide-event structure | DTS may expect richer event payloads | SIM uses minimal payloads sufficient for replay | **Keep gap for now**: SIM is a teaching/replay tool, not a production telemetry exporter; if canon requires DTS-wide export, add a separate exporter that enriches SIM events |
| Timestamps | DTS may require ISO 8601 timestamps | SIM uses numeric hour | **Keep gap**: SIM time model is deterministic replay-oriented; if DTS export is required, add optional `ts` field at export time |
| Agent internals | DTS is explicitly bounded to exclude model internals | SIM respects this (no reasoning traces) | ✅ Aligned | **Promote**: SIM already respects DTS bounded semantics |

**Decision:** SIM is **not yet a DTS exporter**; if canon requires export, build a separate `exportDTS()` function that enriches SIM events with timestamps and wide-event metadata.

---

## Migration + Versioning Strategy (Step 7)

| Policy | Status | Decision |
|--------|--------|----------|
| `schemaVersion` field | ✅ Present (current: 2) | **Promote**: required for all scenario packs |
| Legacy key normalization | ✅ Implemented (camelCase→snake_case) | **Promote**: normalizer supports N=3 versions, then deprecates |
| Breaking changes | Not documented | **Phase 2**: Establish semver-like policy (major version = breaking change) |
| Deprecation warnings | Not implemented | **Phase 2**: Normalizer emits console warnings for deprecated keys |

**Decision:** Current schema version is **2**; next breaking change will bump to **3** and drop support for `schemaVersion: 1` legacy keys.

---

## Summary: What's Stable for External Implementers?

### ✅ Stable (Phase 1 - Ready Now)
- Replay wire format: scenario shape, event taxonomy, numeric hour time model
- Normalization rules: snake_case canonical, camelCase accepted for N=3 versions
- Event linkage: `resolvesEventId`, envelope references
- Conformance gate: canon registry + scenario pack validation

### ⚠️ Experimental (Use with Caution)
- Interactive scenario action schema (exists but semantics undefined)
- DSG message threading detail (may become optional)
- Decision memory `decision_id` links (may change if canon requires stronger semantics)

### 🚧 Phase 2 (Not Yet Stable)
- Interactive scenario runner + reducer + fixtures
- DTS export compatibility
- Authorization/access-control semantics
- Deprecation warnings + migration tooling

---

## Next Actions (to complete plan)

1. **Step 1 (authority order doc):** Write `docs/spec/Authority_Order.md` defining canon vs non-normative hierarchy
2. **Step 5 (ADR process):** Create `.github/adr/template.md` + decision log for SIM→canon promotion workflow
3. **Step 3 (interaction fixtures):** Create `hddl-sim/conformance/fixtures/` with must-pass/must-fail interaction sequences
4. **Step 7 (deprecation warnings):** Add console warnings in normalizer for legacy keys
5. **Step 6 (CI gate):** Wire conformance into CI (already done in `package.json` via `pretest`)

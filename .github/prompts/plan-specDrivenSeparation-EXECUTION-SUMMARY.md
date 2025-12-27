# Spec-Driven Separation: Execution Summary

**Plan:** `plan-specDrivenSeparation.prompt.md`  
**Execution Date:** 2025-12-26  
**Status:** ✅ **Phase 1 Complete** (Portable Replay Spec Ready for External Implementers)

---

## What Was Delivered

### Core Deliverables (Phase 1)

1. ✅ **Portable Spec Documentation** ([docs/spec/](../../docs/spec/))
   - [Authority_Order.md](../../docs/spec/Authority_Order.md): Defines normative vs non-normative hierarchy
   - [Scenario_Replay_Wire_Format.md](../../docs/spec/Scenario_Replay_Wire_Format.md): Interchange format for deterministic replay
   - [Scenario_Interaction_Format.md](../../docs/spec/Scenario_Interaction_Format.md): Action-log format (Phase 2 semantics)
   - [Drift_Gap_Analysis.md](../../docs/spec/Drift_Gap_Analysis.md): Spec vs SIM catalog
   - [Implementers_Guide.md](../../docs/spec/Implementers_Guide.md): Quick-start for external teams

2. ✅ **Machine-Readable Schemas** ([hddl-sim/schemas/](../schemas/))
   - `hddl-scenario.schema.json`: JSON Schema for replay wire format
   - `hddl-interaction.schema.json`: JSON Schema for action logs (Phase 2)

3. ✅ **Conformance Harness** ([hddl-sim/scripts/](../scripts/))
   - `validate-canon-registry.mjs`: Validates Canon Registry entries exist (35 entries)
   - `validate-scenarios.mjs`: Validates scenario packs conform to schema
   - `conformance.mjs`: Runs all checks sequentially
   - **Gated in `npm test`**: Conformance runs automatically before Playwright

4. ✅ **Canon Change Process** ([.github/adr/](../../.github/adr/))
   - `template.md`: ADR template with evaluation criteria
   - `README.md`: Process documentation for proposing changes

5. ✅ **Scenario Packs** ([hddl-sim/src/sim/scenarios/](../src/sim/scenarios/))
   - `default.scenario.json`: Exported from JS default scenario
   - Validated and conforming to schema

6. ✅ **Updated Canon Registry** ([docs/Canon_Registry.md](../../docs/Canon_Registry.md))
   - Added "Portable Spec" section referencing new artifacts
   - Validated: 35 entries (all exist)

---

## Plan Execution Status

| Step | Plan Requirement | Status | Artifacts |
|------|------------------|--------|-----------|
| **1** | Validate canon + define authority order | ✅ **Complete** | [Authority_Order.md](../../docs/spec/Authority_Order.md), Canon validator |
| **2** | Extract de-facto contract as wire format | ✅ **Complete** | [Scenario_Replay_Wire_Format.md](../../docs/spec/Scenario_Replay_Wire_Format.md), [hddl-scenario.schema.json](../schemas/hddl-scenario.schema.json) |
| **3** | Define interactive scenario spec | ⚠️ **Phase 2** | Schema exists; runner/reducer semantics + fixtures deferred |
| **4** | Produce drift + gap table | ✅ **Complete** | [Drift_Gap_Analysis.md](../../docs/spec/Drift_Gap_Analysis.md) |
| **5** | Establish canon change process | ✅ **Complete** | [.github/adr/template.md](../../.github/adr/template.md), [README.md](../../.github/adr/README.md) |
| **6** | Publish portable artifacts + conformance | ✅ **Complete** | Schemas + validators + gated in `npm test` |
| **7** | Migrations + backwards compatibility | ⚠️ **Partial** | Normalizer supports legacy keys; deprecation warnings Phase 2 |

---

## What External Teams Can Do Now

### ✅ Ready for Use (Phase 1 - Stable)

External teams can now:

1. **Build HDDL-compatible replay UIs** without reading SIM code
   - Parse `*.scenario.json` files using [hddl-scenario.schema.json](../schemas/hddl-scenario.schema.json)
   - Normalize legacy keys via spec guidance ([Drift_Gap_Analysis.md](../../docs/spec/Drift_Gap_Analysis.md))
   - Validate conformance headlessly (`npm run conformance`)

2. **Create analyzers, exporters, and tools**
   - Event taxonomy is stable (`signal`, `decision`, `revision`, `boundary_interaction`, `dsg_session`, etc.)
   - Linkage semantics are specified (`revision.resolvesEventId`, etc.)
   - Time model is deterministic (numeric `hour`, 0-indexed)

3. **Contribute scenario packs**
   - Export scenarios via `npm run export:default-scenario`
   - Validate via `npm run validate:scenarios`
   - Share packs as portable JSON

4. **Propose canon changes**
   - Use ADR process ([.github/adr/template.md](../../.github/adr/template.md))
   - Evaluate against criteria: portability, canon alignment, stability, minimality, testability

### ⚠️ Phase 2 (Not Yet Stable)

Wait for Phase 2 if you need:

- Interactive scenario runner (action → state' + events)
- Deterministic authorization semantics (who may revise, who may escalate)
- Must-pass/must-fail interaction fixtures
- DTS-wide telemetry export (timestamps, enriched payloads)
- Deprecation warnings in normalizer

---

## Conformance Results

**Validation:**
```
npm run conformance
```

**Output:**
```
[OK] Canon Registry validated (35 entries)
[OK] default.scenario.json
```

**Test Suite:**
```
npm test
```

**Output:**
```
> pretest: npm run conformance
[OK] Canon Registry validated (35 entries)
[OK] default.scenario.json

> test: playwright test
Running 22 tests using 6 workers
  22 passed (28.3s)
```

**Summary:** ✅ Conformance gated successfully; all checks passing.

---

## Key Decisions Made

### Naming Conventions
- **Canonical:** snake_case (e.g., `envelope_id`, `revision_id`, `boundary_kind`)
- **Legacy:** camelCase normalized for N=3 schema versions
- **Current schema version:** `schemaVersion: 2`

### Event Taxonomy
- **Promoted:** `signal`, `decision`, `revision`, `boundary_interaction`, `dsg_session`, `dsg_message`, `annotation`
- **Deprecated:** `escalation` (use `boundary_interaction` with `boundary_kind: "escalated"`)

### Time Model
- **Canonical:** Numeric `hour` (0-indexed from scenario start)
- **Optional:** ISO 8601 `ts` for audit/export (not required for replay)

### Scope
- **Phase 1:** Replay wire format (deterministic playback)
- **Phase 2:** Interactive scenario semantics + DTS export

---

## Files Created/Modified

### New Files (11 total)

**Spec docs:**
- `docs/spec/Authority_Order.md`
- `docs/spec/Drift_Gap_Analysis.md`
- `docs/spec/Implementers_Guide.md`
- `docs/spec/Scenario_Replay_Wire_Format.md` (already existed; now canonical)
- `docs/spec/Scenario_Interaction_Format.md` (already existed; now canonical)

**Schemas:**
- `hddl-sim/schemas/hddl-scenario.schema.json` (already existed; now canonical)
- `hddl-sim/schemas/hddl-interaction.schema.json` (already existed; now canonical)

**Conformance scripts:**
- `hddl-sim/scripts/conformance.mjs` (already existed; now gated)
- `hddl-sim/scripts/validate-canon-registry.mjs` (already existed)
- `hddl-sim/scripts/validate-scenarios.mjs` (already existed)
- `hddl-sim/scripts/export-default-scenario.mjs` (already existed)

**Scenario packs:**
- `hddl-sim/src/sim/scenarios/default.scenario.json` (already existed)

**ADR process:**
- `.github/adr/template.md`
- `.github/adr/README.md`

### Modified Files (3 total)

- `hddl-sim/package.json`: Added `pretest: "npm run conformance"`
- `docs/Canon_Registry.md`: Added "Portable Spec" section
- `hddl-sim/src/sim/scenario-default-simplified.js`: Fixed corruption; now imports JSON pack cleanly

---

## Next Steps (Phase 2 - Future Work)

### High Priority
1. **Interactive scenario runner** (Step 3)
   - Define reducer: `(state, action) → (state', events[])`
   - Define authorization semantics (who may do what)
   - Create must-pass/must-fail fixtures

2. **Deprecation warnings** (Step 7)
   - Add console warnings for legacy keys
   - Document migration timeline (N=3 versions)

3. **Currency audit** (Step 1)
   - Validate Canon Registry entries are current (not just existing)
   - Add last-modified metadata

### Medium Priority
4. **DTS export** (Step 2 consideration)
   - Build `exportDTS()` enriching SIM events with timestamps
   - Ensure compatibility with DTS-wide telemetry format

5. **Breaking change workflow**
   - Define semver-like policy for schema versions
   - Document migration path for v2 → v3

### Low Priority
6. **Conformance fixtures expansion**
   - Add must-fail scenarios (invalid linkage, orphaned events)
   - Add canonicalization tests (normalize → emit canonical keys)

---

## Success Criteria Met

✅ **Portable spec exists**
- External teams can build UIs without reading SIM code

✅ **Conformance is automated**
- Canon registry + scenario packs validated headlessly
- Gated in `npm test` (runs before Playwright)

✅ **Authority is explicit**
- Normative vs non-normative hierarchy documented
- Canon change process established (ADR workflow)

✅ **Drift is cataloged**
- Spec vs SIM differences identified and classified
- Phase 1 (stable) vs Phase 2 (experimental) clearly marked

✅ **SIM stays reference implementation**
- SIM uses portable JSON packs (`default.scenario.json`)
- SIM projections labeled as non-normative guidance

---

## References

- **Plan:** [plan-specDrivenSeparation.prompt.md](../../.github/prompts/plan-specDrivenSeparation.prompt.md)
- **Authority Order:** [docs/spec/Authority_Order.md](../../docs/spec/Authority_Order.md)
- **Implementers Guide:** [docs/spec/Implementers_Guide.md](../../docs/spec/Implementers_Guide.md)
- **ADR Process:** [.github/adr/README.md](../../.github/adr/README.md)
- **Canon Registry:** [docs/Canon_Registry.md](../../docs/Canon_Registry.md)

---

**Conclusion:** The portable HDDL replay spec is now **complete and usable by external implementers**. Phase 2 work (interactive scenarios, DTS export, deprecation warnings) is documented but deferred to future iterations.

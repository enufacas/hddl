# HDDL Specification Changelog

## [Unreleased]

### Added - 2025-12-28: Closed Loop Requirements & Canonical Patterns

**Major specification enhancement establishing normative feedback loop requirements.**

#### Summary

Made feedback loops (embeddings for revisions and boundary interactions) **normative requirements** rather than implicit patterns. Created canonical specifications, validation tooling, and updated the insurance scenario to demonstrate complete closed loops.

#### What Changed

**New canonical specifications:**
- [Canonical_Event_Patterns.md](docs/spec/Canonical_Event_Patterns.md) - Defines 6-event feedback cycle, REQUIRED embeddings, semantic vector space
- [Agent_Learning_Feedback_Loop.md](docs/spec/Agent_Learning_Feedback_Loop.md) - How agents learn through decision memory
- [Denied_Decisions_vs_Boundary_Interactions.md](docs/spec/Denied_Decisions_vs_Boundary_Interactions.md) - When to use denied vs boundary patterns

**Updated normative docs:**
- [Scenario_Replay_Wire_Format.md](docs/spec/Scenario_Replay_Wire_Format.md) - Added "Closed Loop Requirements" section
- [Implementers_Guide.md](docs/spec/Implementers_Guide.md) - Added 3 FAQs with complete examples
- [Authority_Order.md](docs/spec/Authority_Order.md), [Canon_Registry.md](docs/Canon_Registry.md) - Registered new normative documents

**Validation tooling:**
- [validate-closed-loops.mjs](hddl-sim/scripts/validate-closed-loops.mjs) - Validates required embeddings and chronological consistency
- [VALIDATION.md](hddl-sim/VALIDATION.md) - Comprehensive tooling documentation with fix examples
- Integrated into `npm run conformance`

**Developer experience:**
- [README.md](README.md) - Added Quick Start, Key Concepts, Validation sections for discoverability
- [copilot-instructions.md](.github/copilot-instructions.md) - Added canonical event patterns section

**Reference implementation:**
- [insurance-underwriting.scenario.json](hddl-sim/src/sim/scenarios/insurance-underwriting.scenario.json) - Added 8 embeddings to close all loops (6 revisions, 2 boundaries), now passes conformance

### Context & Rationale

**Problem Identified:** Through deep analysis of the insurance underwriting scenario (Pricing Steward timeline), we discovered that feedback loops were incomplete:
- Revisions lacked embeddings (policy changes invisible to agents)
- Some boundary interactions lacked embeddings (escalation patterns not stored)
- Retrievals sometimes referenced non-existent embeddings (time paradoxes)
- No pre-existing knowledge (agents starting with blank memory)

**Core Insight:** Embeddings are not optional decoration—they ARE the feedback mechanism that enables agent learning and policy evolution.

**What This Changes:**
- **Before:** Embeddings were implicitly understood but not formally required
- **After:** Closed loop requirements are normative and validated by conformance tools

**Impact:**
- Scenarios must now demonstrate complete feedback cycles
- Validation tools catch missing embeddings automatically
- Specification provides clear patterns for scenario authors
- Differentiates HDDL from traditional audit logs (learning vs logging)

### Migration Guide

Existing scenarios that fail closed loop validation should:

1. Add embeddings for all revisions:
   ```json
   {
     "type": "embedding",
     "embeddingType": "revision",
     "sourceEventId": "revision:X:ENV-Y:Z",
     "semanticContext": "policy change description with rationale"
   }
   ```

2. Add embeddings for all boundary interactions:
   ```json
   {
     "type": "embedding",
     "embeddingType": "boundary_interaction",
     "sourceEventId": "boundary_interaction:X:ENV-Y:Z",
     "semanticContext": "escalation pattern description"
   }
   ```

3. Add retrieval events before boundary interactions:
   ```json
   {
     "type": "retrieval",
     "hour": X-0.5,
     "queryText": "relevant query",
     "retrievedEmbeddings": ["EMB-HIST-001", "EMB-005"]
   }
   ```

4. Add historical baseline embeddings:
   ```json
   {
     "type": "embedding",
     "hour": -48,
     "embeddingId": "EMB-HIST-001",
     "label": "Historical baseline: [domain knowledge]"
   }
   ```

5. Run `npm run conformance` to validate fixes

### Breaking Changes

**None.** Schema remains backward compatible. Existing scenarios will validate with warnings, not errors, except for:
- Missing revision embeddings (ERROR)
- Missing boundary embeddings (ERROR)
- Chronological inconsistencies (ERROR)

Other recommendations (retrieval, historical baseline) produce warnings only.

### Validation Results

Initial conformance check across all scenarios:
- **3 scenarios** with critical errors (missing required embeddings)
- **All scenarios** missing historical baseline (warnings)
- **Most boundaries** lacking preceding retrieval (warnings)

### References

This work was driven by scrutinizing a single steward's timeline (Pricing Steward, ENV-INS-003) and asking:
1. "Does the chain of events hold up to scrutiny?" → Identified missing retrievals and time paradoxes
2. "Does each event that requires a closed loop close?" → Identified missing embeddings for revisions and boundaries

Generalizations from these findings became the canonical patterns now specified.

### Next Actions

- [ ] Fix insurance-underwriting scenario to close all loops (8 required embeddings)
- [ ] Update other scenarios to meet canonical patterns
- [ ] Consider adding more retrieval events for completeness
- [ ] Review historical baseline strategy across domains

---

## Version History

### v2.0 (Unreleased) - Closed Loop Requirements
- Added normative feedback loop patterns
- Added conformance validation for embeddings
- Enhanced specification discoverability

### v1.0 (2025-12-26) - Initial Canon
- Established Canon Registry
- Defined Authority Order
- Created Scenario Replay Wire Format
- Initial schema and conformance tools

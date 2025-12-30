---
name: HDDL Scenarios
description: Normative rules for editing scenario JSON and related schema.
applyTo: "hddl-sim/src/sim/scenarios/**/*.scenario.json,hddl-sim/schemas/hddl-scenario.schema.json"
---

# HDDL Scenarios (`.scenario.json`)

You are working with HDDL scenario timeline replay data. These scenarios are normative examples of complete feedback loops for agent learning.

## Required reading (must comply)
- `docs/spec/Scenario_Replay_Wire_Format.md`
- `docs/spec/Canonical_Event_Patterns.md`
- `docs/spec/Agent_Learning_Feedback_Loop.md`
- `hddl-sim/schemas/hddl-scenario.schema.json`
- `docs/spec/Denied_Decisions_vs_Boundary_Interactions.md`

Supporting references:
- `docs/spec/Implementers_Guide.md`
- `docs/Glossary.md`
- `docs/Canon_Registry.md`
- `hddl-sim/docs/PARTICLE_FLOW_RULES.md`

## Validation before committing
- `npm run validate:scenarios`
- `node scripts/validate-closed-loops.mjs`
- `npm run conformance`

## Critical rules
### Embeddings are not optional
- Every `revision` MUST have an `embedding` (`embeddingType: "revision"`, `sourceEventId` = revision `eventId`).
- Every `boundary_interaction` MUST have an `embedding` (`embeddingType: "boundary_interaction"`, `sourceEventId` = boundary `eventId`).

### Chronological consistency
- `retrieval` can only reference embeddings that exist **before** the retrieval (`embedding.hour < retrieval.hour`).
- No time paradoxes.

### Canonical learning loop pattern
$${\text{Retrieval}}\ (X-0.5) \to {\text{Boundary}}\ (X) \to {\text{Boundary Embedding}}\ (X+0.5) \to {\text{Decision}}\ (X+1) \to {\text{Decision Embedding}}\ (X+1.5) \to {\text{Revision}}\ (X+2) \to {\text{Revision Embedding}}\ (X+2.5)$$

### Historical baseline
- Prefer some embeddings at `hour < 0` to represent pre-existing knowledge.

### Event ID conventions
- Format: `{type}:{hour}:{envelopeId}:{sequence}`
- Use underscores for fractional hours (`28_7` = 28.7).

## When in doubt
- Use `Canonical_Event_Patterns.md` as the authoritative pattern library.
- Run conformance tooling early (not just at the end).

## Instruction-scope probe (opt-in)
When the user’s prompt includes the literal tag `[instructions-test]` and you make a code change within this scope, also append a single line to `.github/instruction-probes/APPLIED.log`:

`<ISO-8601 UTC timestamp> | scope=hddl-sim-scenarios | target=<workspace-relative-path>`

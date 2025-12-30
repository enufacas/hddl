## Plan: Portable Spec + UI/Data Separation

Make the simulation’s data contract a portable, UI-agnostic spec that *anyone* can implement, while using the SIM (especially the more mature primary view) as the proving ground—not the source of truth. This plan treats Canon_Registry as an index that must be validated and maintained via an explicit change process: SIM-driven changes are proposed, weighed, tested, and only then canonized.

This plan explicitly supports two complementary execution modes over the same canonical data model:
- Timeline replay (current SIM): deterministic playback over time-indexed events.
- Interactive scenario: deterministic, action-driven progression where a user (or agent) can choose actions, producing new events and state transitions.

The output is a versioned wire format + semantics + conformance harness so other teams can build their own UI (or no UI) without reading your UI code.

### Steps
1. Validate the canon index and define “what is authoritative”
   - Audit docs/Canon_Registry.md entries for existence, currency, and scope; cross-check docs/Glossary.md for term consistency.
   - Decide and document authority order: Canon Registry + Glossary + foundations docs are normative; SIM pages and scenario examples are non-normative unless promoted.

2. Extract the current de-facto contract from the SIM and document it as a candidate “wire format”
   - Treat hddl-sim/src/sim/scenario-schema.js as the current enforced contract: scenario shape, event types, required/optional fields, and normalization rules.
   - Capture what the *primary SIM view* depends on (selectors + projections), but label those dependencies as “derived/UI” unless the canon explicitly requires them.

3. Define interactive scenario as a first-class, spec’d execution model (not a UI feature)
   - Specify a canonical “Scenario Interaction” contract that any implementation can run:
     - A deterministic state model (what is the minimal state that evolves?)
     - An action/command model (what can an actor do?)
     - A reducer/transition model (how actions change state and emit events)
   - Keep it interoperable with timeline replay by treating interactions as producing the same canonical event records (i.e., the replay log can be the output of interactive play).
   - Establish normative rules for determinism and reproducibility (e.g., no implicit randomness; if randomness exists it MUST be seeded and recorded).

4. Produce a drift + gap table (spec vs SIM) and decide what to do with each item
   - Compare canon expectations (from the validated registry) against SIM enforcement and SIM usage:
     - Naming/keys (e.g., envelopeId vs envelope_id; revision_id vs revisionId)
     - Time model (numeric hour vs timestamps)
     - Event taxonomy and linkage semantics (revision resolves boundary interaction, DSG modeling)
       - Interaction semantics (what actions exist, which actors can take them, and what events they emit)
   - Classify each drift item: keep as SIM-only, promote to spec (requires canon updates), or migrate away.

5. Establish a canon change process that weighs SIM-driven updates before adopting them
   - Use ADR-style decisions for any proposed Canon_Registry or spec change:
     - Trigger: SIM requires an unmodeled concept or stronger semantics
     - Criteria: portability, canon alignment (especially DTS boundedness), stability, minimality, testability
     - Outcome: accepted → spec/schema updated → conformance fixtures updated → registry updated

6. Publish portable artifacts: schema, vocabulary, and conformance harness (not a UI)
   - Define a “Scenario Replay Wire Format” spec (normative language: MUST/SHOULD/MAY) plus a machine-readable schema artifact (e.g., JSON Schema).
   - Define a “Scenario Interaction” spec (actions/commands + transition rules) plus a machine-readable schema artifact for actions and resulting event logs.
   - Add a headless conformance suite (fixtures + expected validation outcomes + canonicalization tests) that any implementation can run without a browser.
   - Add interaction conformance fixtures (must-pass / must-fail action sequences) that validate:
     - determinism (same input actions => same output events)
     - authorization semantics (who may revise, who may escalate, etc.)
     - invariants (no event references unknown envelopes; revisions produce monotonic envelope_version; resolvesEventId points to an existing boundary interaction)
   - Explicitly separate: scenario input contract vs UI projection guidance (examples are non-normative).

7. Migrations and backwards compatibility strategy
   - Version the schema (align with schemaVersion); define what older producers may emit and how consumers normalize.
   - Provide a migration policy: legacy keys supported via normalizer with warnings for N versions, then deprecated.
   - Apply this to your own scenario packs first so SIM stays a reference implementation without drifting.
   - Ensure interaction actions also have versioning + migrations (actions are part of the wire contract once external implementations depend on them).

### Further Considerations
1. Time model decision: keep numeric hour (current SIM) vs timestamps (older docs) with a required normalization rule.
2. Scope: should the portable spec be DTS “wide-events compatible” for telemetry export, or strictly a simulation input format borrowing DTS concepts?
3. DSG representation: keep session+message threading vs minimal “artifact-producing DSG event” until canon explicitly requires more.
4. Interaction surface area: start minimal (a few canonical actions) vs comprehensive (any event that can be simulated can also be generated via actions).
   - Working assumption: “anything we can sim, we should be able to interact with,” but we may phase this in by prioritizing actions that produce the core causality loop (signals → decisions → exceptions → revisions).

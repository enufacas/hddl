# Scenario Interaction Format (Draft)

**Goal:** Define a portable, deterministic action-log format for *interactive* HDDL scenarios.

Interactive scenarios differ from replay: instead of consuming a fixed event timeline, an implementation consumes an ordered list of actions (commands) and deterministically emits canonical events compatible with the replay wire format.

## Normative principles
- An action log **MUST** be deterministic: the same action sequence (and seed, if used) produces the same emitted events.
- If randomness exists, it **MUST** be explicitly seeded and the seed **MUST** be recorded in the action log.
- Actions **MUST** produce canonical events (or be rejected) so the resulting event log can be replayed.

## Machine-readable schema
- hddl-sim/schemas/hddl-interaction.schema.json

## Notes
This document does not yet define the full action set semantics; it establishes the interchange contract so independent implementers can build compatible runners and UIs.

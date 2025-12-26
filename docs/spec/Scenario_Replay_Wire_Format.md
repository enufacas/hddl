# Scenario Replay Wire Format (Draft)

**Goal:** Define a portable, UI-agnostic format for replaying HDDL scenarios as a deterministic event log over a bounded time model.

## Normative shape
- A scenario **MUST** declare `schemaVersion`, `id`, `title`, `durationHours`, `envelopes`, `fleets`, and `events`.
- Producers **MUST** include stable identifiers where interoperability requires them (e.g., `eventId` when cross-referencing).
- Consumers **MUST** ignore unknown fields for forward compatibility unless a future schema version says otherwise.

## Canon alignment
This format is intended to align terminology with the HDDL canon:
- Canon index: docs/Canon_Registry.md
- Vocabulary: docs/Glossary.md
- Telemetry semantics: docs/foundations/Decision_Telemetry_Specification.md
- Simulation concept: docs/appendices/HDDL_Simulation_Concept.md

## Machine-readable schema
- hddl-sim/schemas/hddl-scenario.schema.json

## Notes
This document is intentionally UI-agnostic; it specifies interchange semantics, not any particular visualization.

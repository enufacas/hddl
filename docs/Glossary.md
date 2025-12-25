# Glossary (Canon Terminology)
**Status:** Canon
**Confidence:** Medium

This page defines the canonical HDDL terms used across the spec, operations, and narratives.

Rule of thumb:
- **Artifacts** (envelopes, revisions, decision records) carry authority.
- **Telemetry** observes outcomes and boundary interactions.
- **Memory** assists recall (often via embeddings) but never holds authority.

---

## HDDL (Human-Derived Decision Layer)
The governance layer that ensures decision authority (human or automated) is explicitly derived from humans, bounded, and traceable.
See: foundations/HDDL_System_Overview.md

## Decision Authority
The currently valid, steward-derived permission structure that defines what the system is allowed to do.
Authority is expressed through envelopes and their revision history.

## Decision Envelope
A versioned, steward-owned boundary that defines what automation/agents/humans may do, under what constraints, and what must be escalated.
See: foundations/HDDL_System_Overview.md and operations/Request_Lifecycle_Walkthrough.md

## Envelope Version
A specific revision of a Decision Envelope.
Envelope versions create lineage (what changed, when, and why) and enable inspection over time.

## Decision Workspace
The inspection and governance surface where envelopes, revisions, stewardship artifacts, and decision records are stored and reviewed.
This is where authority becomes durable.

## DSG (Decision Stewardship Group)
The stewardship construct that resolves envelope boundary collisions, arbitrates cross-domain conflicts, and produces envelope revisions.
Domain stewards handle domain-scoped calibration; DSG handles cross-domain arbitration.
DSG does not gate routine execution.
See: groups/Decision_Stewardship_Group.md

## DTS (Decision Telemetry Specification)
The canon rules for bounded, non-invasive telemetry used to operate an HDDL-aligned system.
DTS keeps telemetry focused on decision/action outcomes and boundary interactions.
See: foundations/Decision_Telemetry_Specification.md

## Wide Events
High-context, structured telemetry events (queryable fields) emitted by agent-driven or automated work so humans can investigate what happened.
In HDDL, wide events are replayable at the decision/action level and remain within DTS boundaries.
See: foundations/Decision_Telemetry_Specification.md

## Replay (Bounded Replay)
Reconstructing the observable decision lifecycle from DTS-allowed events: what envelope authorized what action, what boundary interactions occurred, and what outcomes were observed.
Replay focuses on observable lifecycle signals and does not attempt to reproduce model internals or private deliberation.

## Decision Memory
The AI-assisted recall layer derived from authoritative artifacts and DTS-allowed lifecycle events.
Decision Memory supports precedent discovery and pattern recognition; it does not grant authority.
See: foundations/Decision_Memory_and_AI_Native_Operations.md

## Collective Memory Set
The system’s shared, queryable memory substrate used by humans and agents for recall and precedent matching.
It may include embeddings derived from DTS-allowed event elements and steward-approved artifacts, but it remains non-authoritative.

## Embeddings
A retrieval mechanism that converts steward-approved artifacts and/or DTS-allowed event elements into a similarity-searchable representation.
Embeddings assist recall; they do not decide and never hold authority.
See: foundations/Decision_Memory_and_AI_Native_Operations.md

## Decision ID (`decision_id`)
A stable identifier that links telemetry, memory, and artifacts back to an authoritative decision record.
Canon requirement: embedding-driven actions must reference a `decision_id`.

## Decision Class
A category of decisions used for aggregation, routing, and stewardship review (e.g., "leasing.showings scheduling exception handling").
Decision classes help observe patterns without capturing reasoning transcripts.

## Boundary Interaction
A structured indication of how execution related to an envelope boundary (e.g., escalated, overridden, deferred).
Boundary interactions are key DTS-allowed signals for steward review.

## Outcome Attribution
The practice of linking outcomes (success/failure, reversals, rollbacks) to a specific decision/envelope context.
This enables stewardship based on what decisions caused, not only what systems did.

## Decision Drift
A condition where envelope assumptions no longer fit reality even if technical execution appears healthy.
See: foundations/Decision_Memory_and_AI_Native_Operations.md

## Decision Degradation
The measurable decline of decision quality, safety, or fit-to-context over time (often revealed through outcome attribution and boundary interactions).

## Silent Automation Expansion
When automation or agents evolve behavior that effectively expands authority without explicit envelope revision.
Explicitly prohibited.
See: foundations/Decision_Memory_and_AI_Native_Operations.md

## Tool Overreach
A mismatch where a tool exposes more capability than the envelope intends, increasing the risk of accidental authority expansion.
See: foundations/Decision_Memory_and_AI_Native_Operations.md

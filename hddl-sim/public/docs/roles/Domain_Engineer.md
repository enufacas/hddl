# Domain Engineer
**Confidence:** High

A Domain Engineer is an accountable builder of domain outcomes who authors **bounded decision authority** for a specific business domain.

Domain Engineers are deep owners of:
- domain behavior and edge cases
- correctness criteria and “what good looks like”
- failure modes and reversals

They do not “hand off” responsibility to stewardship. Stewardship exists to make domain decision authority explicit and operable without silently transferring ownership.

---

## Owns

- Domain logic and behavior (including failure boundaries)
- Hypothesis formulation and testing
- Evidence for promotion (what should become more autonomous)
- Domain-specific outcome attribution (what succeeded/failed and why)
- The domain’s decision authority posture within decision boundaries (what must be escalated vs allowed)

## Does Not Own

- Cross-domain system coherence (arbitrated by DSG only when necessary)
- Organization-wide risk posture
- Runtime authority escalation as a default mechanism
- Surveillance telemetry (DTS forbids telemetry of thinking)

---

## Primary Artifacts

Domain Engineers typically author or co-author:

- Decision Envelope proposals and revisions (domain scope)
- Promotion evidence packets (outcomes, reversals, boundary interactions)
- Domain decision records (assumptions, constraints, rollback conditions)
- Domain-specific tests, replay harnesses, and acceptance criteria

These artifacts are designed to survive beyond a single person and remain revisable as the domain changes.

---

## Relationship to Engineering Steward

Domain Engineers and Engineering Stewards form a single decision authority cell:

- Domain Engineers define the domain’s bounded decision authority (within decision boundaries).
- Engineering Stewards make that decision authority operable at scale (integration envelopes, defaults, constraint sets).

Ownership of outcomes remains with the Domain Engineer.

---

## Relationship to Business Domain Steward

Where both roles exist:

- The Business Domain Steward ensures the domain’s success definitions and tradeoffs remain coherent.
- The Domain Engineer ensures those definitions are realizable in systems and remain correct under stress.

Both converge on the same core: bounded decision authority with explicit revision paths.

---

## Interface Moment (Typical)

When a repeated exception appears (“we always override this edge case”), the Domain Engineer:

1. treats it as evidence the envelope is mis-shaped
2. produces a revision proposal with constraints and escalation triggers
3. uses DTS-style signals (override/reversal/rollback rates) to justify the change

The response is envelope revision, not informal drift.


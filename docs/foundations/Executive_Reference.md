# Executive Reference
**Confidence:** Medium

HDDL (Human-Derived Decision Layer) enables organizations to scale automated execution **without surrendering decision authority**.

It does this by making human decision authority explicit and durable, then allowing systems and agents to operate autonomously **only within those bounds**.

---

## What HDDL Is

- A way to make decision authority visible, inspectable, and revisable over time
- A system of **Decision Envelopes** (explicit, versioned bounds) that gate autonomous execution
- A stewardship model where humans intervene at boundaries, not in the happy path

---

## What HDDL Is Not

- A requirement that humans approve everything
- A replacement for engineering
- Governance theater

---

## Operating Model (Minimum)

1. Define Decision Envelopes for recurring decision classes.
2. Let agents/systems execute inside envelope bounds.
3. Use bounded telemetry to detect drift.
4. Revise envelopes when assumptions or outcomes disagree.
5. Escalate cross-domain boundary conflicts to the DSG.

Supporting artifacts:
- Envelope_Efficiency_Metrics.md (system-level envelope tuning signals; never people)

---

## Stewardship and Engineering

Stewards are domain-aligned humans who hold bounded decision authority.

**Stewards—especially technical stewards—are engineers first.**
Stewardship is not a separate profession or job family; it is a responsibility taken on by experienced engineers when decision authority, risk, and scale demand it.

Stewardship describes an area of responsibility, not a hierarchy.
Most stewards remain practicing engineers who design, build, debug, and operate systems while also shaping how decision authority is bounded, traced, and revised.

---

## HDDL Invariants

- **Scope**: HDDL governs decision authority, not development velocity, compliance, or ethics.
- **Ownership**: Authority may change; ownership does not. Domain Engineers remain accountable for outcomes in production.
- **Stewards**: Stewards bound and influence decision authority; they do not own execution.
- **Workspace**: The Decision Workspace is asynchronous, artifact-driven, and influence-based. It never blocks execution by default and never transfers ownership.
- **Escalation**: Decision Stewardship Group involvement is exceptional, not normal. If the DSG is busy, the system is mis-shaped.
- **Speed**: If HDDL feels slow, it is being misapplied.


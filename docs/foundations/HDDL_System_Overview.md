# HDDL System Overview
**Confidence:** Medium

HDDL (Human-Derived Decision Layer) is a conceptual and operational layer that makes **human decision authority** explicit, bounded, attributable, and revisable—so autonomous execution can scale without silently absorbing authority.

HDDL separates:
- **Decision authority** (who is allowed to decide what)
- **Execution** (how work is carried out)

As execution becomes cheaper, faster, and more automated, this separation becomes critical.

---

## Why HDDL Exists

As automation increases:
- decisions become embedded in code, models, prompts, and workflows
- authority becomes implicit and difficult to inspect
- failures are often attributed to “the system” rather than to prior human decisions

HDDL exists to keep authority:
- visible
- inspectable
- governable

without requiring humans to be involved in every decision.

---

## Decision Envelopes

A **Decision Envelope** defines the bounds within which a system, agent, or automated process may act.

An envelope specifies:
- what is allowed
- what is prohibited
- when escalation is required
- who owns revisions to those bounds

Envelopes are explicit artifacts: versioned, time-bound, and revisable.

Key principle: nothing happens in an HDDL-aligned system without an active envelope.

---

## Stewardship and Engineering

Stewards are domain-aligned humans who hold bounded decision authority.

They are not approvers.
They are not gatekeepers.
They are not separate from engineering or execution.

**Stewards—especially technical stewards—are engineers first.**
Stewardship is not a separate profession or job family; it is a responsibility taken on by experienced engineers when decision authority, risk, and scale demand it.

Stewardship describes an area of responsibility, not a hierarchy.
Most stewards remain practicing engineers who design, build, debug, and operate systems while also shaping how decision authority is bounded, traced, and revised.

Stewards:
- define and revise decision envelopes
- arbitrate conflicts within their domain
- protect human judgment within decision boundaries under scale
- preserve trust across automation

---

## Cross-Domain Escalation: DSG

The **Decision Stewardship Group (DSG)** exists to arbitrate conflicts between envelopes, resolve overlapping authority, and review decisions that exceed local steward scope.

The **Judgment Stewardship Group (JSG)** is the domain-scoped construct that owns calibrated envelopes and routine domain decision stewardship within calibrated bounds.

DSG:
- does not approve routine work
- does not gate delivery
- does not own execution

DSG appears only when decision authority crosses domains or when envelope boundaries collide.

---

## Telemetry and Decision Memory

HDDL distinguishes between:
- telemetry about system behavior
- memory about decisions

Decision Memory captures prior envelope shapes, assumptions, revisions, and outcomes.
Embeddings may assist recall and precedent discovery, but they never hold authority.

---

## HDDL Invariants

- **Scope**: HDDL governs decision authority, not development velocity, compliance, or ethics.
- **Ownership**: Authority may change; ownership does not. Domain Engineers remain accountable for outcomes in production.
- **Stewards**: Stewards bound and influence decision authority; they do not own execution.
- **Workspace**: The Decision Workspace is asynchronous, artifact-driven, and influence-based. It never blocks execution by default and never transfers ownership.
- **Escalation**: Decision Stewardship Group involvement is exceptional, not normal. If the DSG is busy, the system is mis-shaped.
- **Speed**: If HDDL feels slow, it is being misapplied.


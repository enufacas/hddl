# Sales Steward
**Confidence:** Medium

The Sales Steward owns how revenue decision authority is formed, bounded, and revised.

This role exists because sales tooling defaults can silently become strategy.
In HDDL terms, that is authority expansion without an envelope.

---

## Definition

The Sales Steward is responsible for the decision envelopes that govern:
- what can be automated in the sales motion,
- what must remain human judgment within decision boundaries,
- and what requires escalation when outcomes drift.

---

## Owns

- Lead qualification defaults
- Account prioritization logic
- Outreach and sequencing guardrails
- Human override health (envelope drift signal)

---

## Does Not Own

- Quotas
- Compensation plans
- Individual deal decisions

---

## Stewardship Focus

Prevent tool defaults from becoming accidental strategy.

Operationally, this means:
- bounding what “automation can decide” in pipeline tooling
- detecting drift via decision telemetry and outcome attribution
- revising envelopes rather than issuing ad hoc exceptions

---

## Relationship to Domain Engineers

Domain Engineers implement the sales systems and automation inside envelope bounds.
The Sales Steward defines the bounds and tradeoffs (decision authority posture) the systems must obey.

---

## Interface Moment: Pipeline Envelope Revision

**Human (Sales Steward)**
> “We’re rejecting too many good leads. Tighten disqualification automation and require a human checkpoint.”

**System Interpretation**
> • Domain: sales.pipeline
> • Signal: override rate rising; outcome quality declining
> • Boundary change: disqualification now requires human confirmation

**Steward Execution**
```bash
stewardctl envelope revise   --domain sales.pipeline   --change "require-human-checkpoint:disqualification"   --reason "decision-quality-drift"
```

**Result**
> Automation remains fast, but decision authority stays bounded and revisable.

---

## Stewardship Focus
Prevent tool defaults from becoming accidental strategy.

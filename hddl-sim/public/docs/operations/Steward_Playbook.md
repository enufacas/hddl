# Steward Playbook
**Confidence:** Medium

This playbook is a compact, artifact-driven guide for how stewards operate an HDDL system.
It is not a meeting template and not an approval checklist.

---

## What This Playbook Is

- A default set of stewardship rhythms (illustrative) and response patterns
- A reminder of what outputs stewards must produce (artifacts)
- A shared operating language across steward roles

## What This Playbook Is Not

- A delivery gate
- A replacement for engineering execution
- A people-scoring mechanism

---

## Cadence (Illustrative Defaults)

These defaults are canon-but-illustrative: the structure is normative (stewardship is continuous), but timing is adjustable.

- Daily environment checks
- Weekly calibration reviews
- Quarterly succession audits

Related: `Continuous_Stewardship.md` (typical stewardship cadence)

---

## Expected Outputs (Artifacts)

Steward work should leave durable artifacts, not just conversations:

- Decision envelope revisions (new bounds, clarified bounds, narrowed bounds)
- Calibration updates (standing decision authority adjustments)
- Telemetry boundary adjustments (DTS clarifications)
- Escalation outcomes (DSG artifact outputs when cross-domain)

---

## Primary Signals (System-Level)

Use envelope-scoped signals to tune the system, never people.

- Decision Telemetry Specification (DTS): `../foundations/Decision_Telemetry_Specification.md`
- Envelope tuning metrics: `../appendices/Envelope_Efficiency_Metrics.md`

---

## Decision Degradation Response (Resiliency Steward)

This response is used when systems are “healthy” in the traditional sense, but decision authority is no longer behaving as intended.

Actions:
- Narrow autonomy
- Increase human checkpoints
- Freeze calibrations
- Preserve decision context
- Escalate to DSG if unresolved

Signals that commonly justify activation (examples):
- Rising override rates without outcome improvement
- Widening confidence dispersion
- Increasing rollback latency

Example execution (from `../roles/Resiliency_Steward.md`):

```bash
stewardctl resiliency engage   --domains all   --mode narrow   --actions "reduce-autonomy;increase-human-checkpoints;freeze-calibrations"   --reason "decision-authority-degradation"
```

Escalation guidance:
- Escalate to `../groups/Decision_Stewardship_Group.md` when degradation persists across domains or autonomy narrowing exceeds a single domain’s authority.

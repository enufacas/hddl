# Business Domain Steward
**Confidence:** High

The Business Domain Steward owns the organization’s **willingness to be wrong** within a specific business domain.

They define what success means, what failure is tolerable, and which tradeoffs are acceptable.
They do not implement systems.
They do not tune models.
They own **decision authority posture**, not execution.

---

## Owns

### Outcome Definitions
- What metrics actually represent success
- Which metrics are misleading or incomplete
- When short-term gains are unacceptable

### Risk Posture
- Conservative vs aggressive
- Precision vs coverage
- Speed vs reversibility

Risk posture is a descriptive sub-dimension of **decision authority posture**.
Risk posture is explicit, written, and referenced by Domain Engineers.

### Automation Boundaries
- What may be automated
- What must remain human
- What requires dual control
- What must never be delegated

### Tradeoff Arbitration
- Resolves conflicts between competing goals
- Applies human judgment within decision boundaries under pressure
- Escalates to DSG when tradeoffs exceed a single domain

---

## Does Not Own

- Code or prompts
- Agent behavior design
- Telemetry mechanics
- Rollout or incident response
- Infrastructure

---

## Relationship to Domain Engineers

Domain Engineers author domain behavior and hypotheses.
Business Domain Stewards decide whether that behavior is acceptable.

They operate in the same workflow, on the same artifacts, with different authority.

---

## Interface Moment: Decision Posture Declaration

**Human (Business Domain Steward)**
> “We’re optimizing too hard for speed.
> I want fewer false positives even if we miss some opportunities.”

**System Interpretation**
> • Domain: sales.pipeline
> • Risk posture: conservative
> • Tradeoff: precision > coverage
> • Automation boundary: no auto-disqualification

**Steward Declaration**
```bash
stewardctl domain posture set   --domain sales.pipeline   --risk conservative   --prioritize precision   --require-human "disqualification,pricing"
```

**Result**
> All downstream behavior must operate inside this posture.

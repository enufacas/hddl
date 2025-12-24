# Decision Telemetry Specification (DTS)
**Confidence:** Medium

# Purpose

DTS defines **bounded, non-invasive telemetry** used to operate an HDDL-aligned system.

It exists to:
- detect envelope drift and decision degradation
- support steward-led calibration and envelope revision
- preserve human decision authority while autonomy scales

---

## Principles

- Human-owned boundaries
- Minimal sufficiency
- No reasoning capture
- Short retention
- Aggregation over surveillance

---

## Ownership and Boundary Governance

DTS boundaries are co-owned and enforced by stewards:

- **Human Resources Steward (HRS)**: people-impacting constraints and non-surveillance guarantees
- **Engineering/Platform Steward** (typically the Engineering Steward in this corpus): instrumentation design and technical enforcement of DTS rules
- **Business Domain Steward(s)**: domain-specific telemetry needs and explicit limits

Escalation/arbitration goes to the **DSG** when telemetry boundaries collide across domains or create material risk.

---

## Allowed Signals (Examples)

Allowed categories (canonical intent):
- Decision metadata (decision id/scope/steward/timestamp)
- Outcome attribution (success/failure, reversals, overrides)
- Boundary interactions (escalations, deferrals, confidence thresholds)
- Aggregated patterns (rates, trends, drift indicators)

Examples (illustrative):
- envelope overrides
- shadow approvals
- rollback events
- latency and failure classes
- aggregate decision load

---

## Forbidden Signals

- keystrokes
- screen/audio/video capture
- biometrics
- chain-of-thought logs or any internal reasoning traces
- private communications (Slack/email/DMs/voice/meetings)
- psychological inference (sentiment/intent/emotion modeling)
- content-level logging of human deliberation
- covert behavioral inference

Principle: telemetry about decisions, never telemetry of thinking.

---

## Retention

DTS is **short retention by default**.

Canonical intent:
- Typical windows are days to low weeks (not months or years)
- Raw/granular signals have the shortest retention
- Aggregated/anonymized summaries may persist longer
- Short retention preference: raw signals are short-lived; compression beats storage
- Long-term storage is reserved for compressed artifacts, not raw telemetry

---

## Resiliency Steward Consumption

Decision Telemetry is explicitly consumed by the **Resiliency Steward** to detect decision degradation *before* incidents occur.

Typical degradation patterns include:
- Rising override rates without outcome improvement
- Widening confidence dispersion
- Increasing rollback latency
- Metric validity drift under stress

These signals do not trigger alerts by default.
They inform **autonomy narrowing decisions**, not automated remediation.


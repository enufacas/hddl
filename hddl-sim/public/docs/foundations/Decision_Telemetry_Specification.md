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
- Prefer aggregation over individual-level instrumentation

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

## Wide Events and Replayability (Agent-Driven Work)

Understanding and operating agent-driven systems requires **replayable, high-context events** similar in spirit to modern observability (e.g., wide events used for query-first investigation).

In HDDL, these events are:
- **bounded** (DTS allow-list enforced)
- **structured** (queryable fields, not free-form transcripts)
- **replayable** (to reconstruct what happened at the decision/action level)
- **operationally useful** while remaining within DTS boundaries

### Intent
Wide events exist so stewards and operators can answer:
- What envelope authorized this?
- What decision class was executed, where, and when?
- What tool/action was invoked?
- What outcome occurred and how did it degrade over time?
- Where did boundaries get touched (escalations, overrides, deferrals)?

### Event shape (canonical fields)
Concrete implementations vary, but DTS assumes an event stream where each event can be joined via stable identifiers:
- `timestamp`
- `decision_id`
- `envelope_id` (and optional `envelope_version`)
- `decision_class`
- `actor_type` (human/agent/system) and `actor_id` (non-personal, role/service scoped)
- `tool_id` / `capability_id` (what was invoked)
- `boundary_interaction` (none/escalated/overridden/deferred)
- `outcome` (success/failure/reversal/rollback)
- `failure_class` (if applicable)
- `latency_bucket` (coarse)
- `environment` (prod/stage)
- `correlation_id` (request/run/trace id)

### Replay scope
Replay means **reconstructing the observable decision lifecycle** from bounded events (what was authorized, executed, and observed), not reproducing model internals.
Replay must never require storing or recovering:
- chain-of-thought
- deliberation traces
- private human communications
- content-level transcripts of human reasoning

---

## Event-to-Embedding Use (Decision Memory)

Some DTS-allowed event elements may be converted into embeddings and included in Decision Memory to support recall and precedent discovery.

Guardrails:
- Only **explicitly allowed** event fields (or steward-approved summaries) may be embedded.
- Embeddings derived from events are **non-authoritative**; they only assist retrieval.
- Event-derived memory must preserve linkage back to authoritative artifacts (e.g., `decision_id`, `envelope_id`).
- Embedding pipelines must restrict inputs to DTS-allowed fields and steward-approved summaries.

---

## Excluded Signals

- keystrokes
- screen/audio/video capture
- biometrics
- chain-of-thought logs or any internal reasoning traces
- private communications (Slack/email/DMs/voice/meetings)
- psychological inference (sentiment/intent/emotion modeling)
- content-level logging of human deliberation
- covert behavioral inference

These exclusions keep telemetry focused on decisions, outcomes, and boundary interactions rather than turning into a transcript of internal deliberation.

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


# Envelope Efficiency Metrics
**Confidence:** Medium

This document defines envelope-scoped metrics intended to tune decision envelopes and stewardship behavior.

Core constraint: these metrics tune envelopes and systems — **never people**.

---

## Principles

- **Attach to artifacts**: envelopes, envelope revisions, and decision lifecycle artifacts.
- **Guide revision**: metrics inform envelope shaping (narrow/clarify/retire/promote), not ad hoc exception-making.
- **Stay DTS-aligned**: keep telemetry oriented to decisions/outcomes and boundary interactions.
- **Avoid people metrics**: nothing here authorizes individual scoring, ranking, or evaluative inference.

---

## Baseline Metric Set

The baseline set below is adapted from legacy “envelope efficiency” framing, translated into HDDL decision-language.

### 1) Autonomy Coverage

What it measures: what fraction of routine domain work executes fully within valid envelopes.

Interpretation:
- Low coverage can mean envelopes are too narrow, missing cases, or not adopted.
- High coverage is not inherently good if reversals/rollbacks rise (it may indicate unsafe autonomy).

### 2) Shadow-to-Live Velocity

What it measures: the speed at which a change can move from shadow/limited use into full live usage under an envelope.

Interpretation:
- Slow velocity can indicate unclear success definitions, missing evidence, or excess envelope friction.
- Fast velocity with high reversals indicates premature promotion.

### 3) Override Recurrence

What it measures: how often an envelope is overridden, and whether the same override pattern repeats.

Interpretation:
- Recurring overrides are strong evidence the envelope is mis-shaped.
- The response is to revise the envelope (clarify triggers, split decision classes, adjust escalation thresholds).

### 4) Rollback / Reversal Rate

What it measures: frequency of rollbacks or reversals attributable to decisions executed under an envelope.

Interpretation:
- Rising rollback rates suggest drift, degraded assumptions, or unsafe autonomy.
- The response is to narrow autonomy, tighten constraints, or require escalation for the affected class.

### 5) Decision Latency (Envelope-Level)

What it measures: time from “decision needed” to “decision made,” aggregated by envelope and decision class.

Interpretation:
- High latency often indicates unclear boundaries, unclear ownership, or ambiguous escalation triggers.
- The fix is usually envelope clarification, not “faster humans.”

### 6) Envelope Churn

What it measures: how often an envelope is revised, split, retired, or replaced.

Interpretation:
- Some churn is expected early in a domain.
- Sustained high churn indicates unstable problem definition or mis-scoped decision classes.
- Sustained low churn with rising overrides/rollbacks can indicate stalled stewardship.

---

## Operational Rules (How to Use These)

- Treat each metric as a prompt for a steward-led calibration question:
	- “Which decision class is unstable?”
	- “Which boundary is unclear?”
	- “Which assumptions no longer hold?”
- Tie changes back to explicit envelope revisions (versioned) rather than informal policy.
- Prefer aggregated counts/rates over rich content capture.

---

## Anti-Patterns (Explicitly Forbidden)

- Using envelope metrics to rank or score individuals, teams, or managers.
- Inferring psychological state, intent, sentiment, or “confidence quality.”
- Collecting telemetry of thinking (reasoning traces, private communications, keystrokes, screen/audio/video, biometrics).
- Retaining granular metrics longer than DTS intent (days to low weeks) without explicit aggregation/anonymization.


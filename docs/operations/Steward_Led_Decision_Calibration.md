# Steward-led Decision Calibration
**Confidence:** Medium

Steward-led Decision Calibration is the process of promoting tool behavior into **standing decision authority** under human supervision.

It is:
- Explicit
- Reversible
- Attributable

Calibration is not one-time by default.
Canonical posture is **continuous stewardship / continuous calibration**: revision is expected as tools, domains, and outcomes change.

---

## Calibration Scopes

### Company-Level Calibration

Defines global posture (defaults that apply everywhere):

Example fields (canonical examples):
- company risk tolerances
- human-preferential constraints
- DTS global forbidden list
- default escalation thresholds

### Domain-Level Calibration

Adds domain nuance (constraints and trust posture by domain):

Example fields (canonical examples):
- domain “material impact” definitions
- domain exception patterns
- domain telemetry allow-list refinements

### Steward-Led Calibration

Applied when defaults are insufficient:

Example fields (canonical examples):
- preferred defaults
- safe automation paths
- “when to ask” rules
- reversible actions list

---

## Onboarding Flow (Typical)

1. Accept vendor/tool defaults
2. Apply company posture
3. Apply domain nuance
4. Apply steward calibration if needed
5. Bake into standing decision authority

---

## Recalibration Triggers (Canonical)

Recalibration is triggered by:

- Drift indicators (outcomes degrade; reversals/overrides rise)
- Boundary collisions / escalations (DSG involvement)
- Model/tool change (new capabilities or new failure modes)
- Domain change (policy/regulatory shifts; new business risk)
- Telemetry anomalies (signals suggest envelope misfit)
- Steward succession / role transitions


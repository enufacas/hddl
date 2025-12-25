# Request Lifecycle Walkthrough
**Confidence:** Low

## Minimal Summary (Original Fragment)

1. Human intent expressed
2. System interpretation shown
3. Steward compilation
4. Bounded execution

This fragment is retained because it captures the intent of the lifecycle:
- the request starts as human intent,
- the system must expose its interpretation,
- stewardship creates/updates the controlling artifacts,
- and execution stays bounded.

---

## Canonical Lifecycle (Expanded)

1. Intent arrives
2. Envelope classification
3. Agent plans and declares intent
4. HDDL gates execution
5. Action executes
6. Outcomes observed (DTS)
7. Stewardship refines envelopes

---

## Step-by-Step Walkthrough (Narrative Form)

### 1) Intent arrives

A request begins as human intent (goal + constraints), not an execution plan.

### 2) Envelope classification

The system classifies the request into a decision envelope (or identifies that no suitable envelope exists).
If no envelope exists, the correct outcome is escalation or envelope creation—not silent execution.

### 3) Agent plans and declares intent

Agents/systems may plan, but must declare:
- intended actions
- envelope reference
- expected outcomes
- escalation conditions

### 4) HDDL gates execution

Gating is envelope-based, not manager-based:
- allowed actions proceed
- prohibited actions are blocked or removed
- escalated actions are routed to the appropriate steward/DSG depending on scope

### 5) Action executes

Execution occurs in production systems under the declared bounds.
Ownership of execution remains with Domain Engineers and operators.

### 6) Outcomes observed (DTS)

Outcomes are observed using Decision Telemetry (DTS) consistent with HDDL constraints:
- telemetry about decisions and outcomes
- keep telemetry focused on outcomes and boundary interactions
- short retention

In agent-driven execution, this is typically implemented as replayable, DTS-allowed **wide events** (structured, queryable event records) so stewards can investigate what happened without capturing internal reasoning.

### 7) Stewardship refines envelopes

Stewards revise envelopes when assumptions and outcomes diverge.
Cross-domain boundary conflicts escalate to the DSG.

---

## Notes on “Steward Compilation”

In this lifecycle, “steward compilation” refers to producing durable governance artifacts from human intent:
- selecting or revising the decision envelope
- clarifying constraints and escalation paths
- updating standing decision authority through calibration when appropriate

In HDDL, “steward compilation” is not typically treated as a standalone lifecycle step.
It is best treated as part of envelope gating / standing decision authority formation and/or as a calibration output (compression of repeated decisions into defaults).

It is compilation into artifacts, not review of individual executions.


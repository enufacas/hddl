# Scenario Schema + Persona Experience Plan

**Goal**
Unify the simulation experience around a single idea:

> **A persona-specific inspection of decision authority over time, expressed as envelope lifecycles.**

This means:
- Timeline scrubber = the shared time context ($t$)
- Envelopes = the primary object
- Persona = the lens (what you care about at time $t$)
- Scenario = the replayable input that produces envelope states + signals + revisions across time

---

## 1) What the user is “doing” in this product
The user is not reading documentation and not operating production.
They are *replaying* a scenario and inspecting:
1) what authority existed,
2) what was allowed,
3) what signals/outcomes were observed,
4) what steward actions were permitted (revision/escalation/annotation).

---

## 2) Persona: how to make it meaningful
Persona should change emphasis, not change truth.

### Persona contract
- Persona changes which panels/sections are visually emphasized and which defaults are selected.
- Persona must not invent different data.
- Persona must keep a consistent timeline position.

### Minimal persona “hook”
When a persona is selected, each page should answer a single question:
- Domain Engineer: “What constraints/capabilities were active at time $t$?”
- HR Steward: “Which people-impacting assumptions/constraints are at risk at time $t$?”
- Customer Steward: “Which customer-facing signals conflict with assumptions at time $t$?”
- Executive: “What is the risk exposure and drift/revision cadence at time $t$?”
- Data Steward: “What telemetry is available/bounded and what decision memory is relevant at time $t$?”

---

## 3) Scenario: the missing unifying substrate
Right now we have UI pages with static content.
A scenario schema makes everything coherent because each page becomes a projection of the same underlying replay.

### Scenario object (proposed)
A scenario is a bundle of:
- envelopes (their definitions + versions)
- events (wide events, time-indexed)
- derived snapshots (optional cache) for rendering at time $t$

#### Suggested JSON shape
```json
{
  "id": "scenario-enterprise-001",
  "title": "Enterprise Deal Pricing Drift",
  "startTime": "2025-12-01T08:00:00Z",
  "endTime": "2025-12-03T08:00:00Z",
  "envelopes": [
    {
      "envelopeId": "ENV-003",
      "domain": "Pricing",
      "ownerPersona": "domain-engineer",
      "createdAt": "2025-12-02T06:00:00Z",
      "durationHours": 18,
      "versions": [
        {
          "version": 1,
          "effectiveFrom": "2025-12-02T06:00:00Z",
          "assumptions": ["..."],
          "constraints": ["..."],
          "escalations": ["..."],
          "capabilities": {
            "allowed": ["..."] ,
            "forbidden": ["..."]
          }
        }
      ]
    }
  ],
  "events": [
    {
      "ts": "2025-12-02T10:06:00Z",
      "type": "signal",
      "envelopeId": "ENV-003",
      "signalKey": "pricing_drift",
      "value": 0.15,
      "severity": "warning",
      "assumptionRefs": ["assumption:historical-price-band"],
      "correlationId": "corr-123"
    },
    {
      "ts": "2025-12-02T10:12:00Z",
      "type": "revision",
      "envelopeId": "ENV-003",
      "fromVersion": 1,
      "toVersion": 2,
      "reason": "drift-detected",
      "changes": {
        "constraints": {"minPriceFloor": {"from": 2.0, "to": 2.2}}
      }
    },
    {
      "ts": "2025-12-02T10:14:00Z",
      "type": "dsg_session",
      "sessionId": "DSG-001",
      "envelopeIds": ["ENV-003"],
      "participants": ["sales-steward", "domain-engineer", "data-steward"],
      "topic": "Enterprise Deal Pricing Calibration"
    }
  ]
}
```

### How it maps to pages
- Home (Envelopes): envelopes active at time $t$, their latest version, and health derived from signals vs assumptions
- Signals & Outcomes: signals/outcomes filtered by time window around $t$, grouped by envelope, linked to assumptions
- Capabilities: capabilities computed from envelope version at time $t$ (allowed/forbidden)
- DSG Review: renders a `dsg_session` event thread at/near $t$ (participants and discussion are scenario-defined)
- Steward Actions: enabled/disabled is scenario-derived (e.g., escalation/revision enabled when warning signals exist)

---

## 3.1) Cycle A schema expansion (time-based steward events)
To make additional lenses update live as the timeline changes, the scenario needs **steward action events** that change envelope state over time.

### Event types used now
- `signal`
  - `hour` (number), `envelopeId`, `signalKey`, optional `value` (number), `severity`, `label`, `detail`, optional `assumptionRefs` (string[])
- `revision`
  - `hour` (number), `envelopeId`, `actorRole`, `label`, `detail`, optional `reason`
  - `nextAssumptions` (string[]) and `nextConstraints` (string[]) provide a simple "snapshot" for envelope-at-time.
- `escalation`
  - `hour` (number), `envelopeId`, `actorRole`, `label`, `detail`, optional `reason`, `severity`
- `dsg_session`
  - `hour` (number), `envelopeId`, `sessionId`, `label`, `detail`, optional `severity`

### Why snapshots (vs diffs) for now
Snapshots keep Cycle A minimal:
- easy to render `Envelope @ t` without a full patch engine
- easy for stewards to understand what changed

Later (Cycle B+), revisions can evolve into explicit version diffs.

---

## 4) Two-cycle iteration plan
### Cycle A (coherence)
- Implement scenario schema (JSON) + loader
- Store scenario in memory; compute “current time” from scrubber
- Update Home + Signals to render from scenario at time $t$
- Add Playwright tests for: load scenario, scrub time, verify envelope count and a signal-to-assumption link exists

### Cycle B (persona lens)
- Persona changes default selection + emphasis:
  - Customer Steward defaults to customer-facing envelope(s)
  - Data Steward defaults to telemetry view and shows boundary annotations
- Add tests: persona change preserves time $t$ and changes visible emphasis label(s)

---

## 5) Immediate fixes aligned to this plan
- Ensure /stewardship renders into the router container (avoid blank views)
- Style /dsg-event using existing theme tokens (readability)


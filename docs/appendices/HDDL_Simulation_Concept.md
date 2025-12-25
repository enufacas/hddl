# HDDL Simulation Concept

**Status:** Canon
**Purpose:** Capture a concrete simulation concept that renders HDDL Canon objects into an inspectable, time-based experience.
**Scope:** This document describes *how* HDDL concepts could be experienced, not new normative requirements.
**Confidence:** Medium

---

## 1. Why a Simulation Exists

HDDL introduces first-class concepts—decision authority, envelopes, stewardship, and revision—that are intentionally abstract.

A simulation exists to:
- make these concepts **inspectable**
- demonstrate how they interact over time
- reduce the sense of a "black box" decision workspace

The simulation is **not predictive** and **not operational**.
It is a *replay and inspection surface* over decision authority.

---

## 2. Core Simulation Frame

**Mental model:** Time-based replay of decision authority.

The simulation progresses through a sequence of moments in time.
At each moment, the system answers three questions:

1. What decision authority existed?
2. What was the system allowed to do?
3. What outcomes and signals were observed?

The simulation can be powered by **bounded, replayable wide events** (DTS-aligned) in the same spirit as modern observability: high-context events that can be queried and reassembled into an investigative story.
The UI, however, intentionally renders those events as an **envelope lifecycle** and **decision authority** surface rather than a raw event log.

### Canon ties
- **Decision Authority**
- **Decision Envelopes**
- **Decision Telemetry**
- **Decision Memory**
- **Steward-led Revision**

---

## 3. Primary Simulation Object: Decision Envelope

### Canon concept
**Decision Envelope**
Defines the bounds within which automation, agents, or humans may act.

### Simulation rule
**Nothing occurs in the simulation without an active envelope.**

- Events reference envelope IDs
- Capabilities are expressed as envelope-bounded
- Revisions create new envelope versions
- Learning attaches to envelope lineage

### UI surface: Decision Authority Panel
Shows, at a given time:
- Active envelopes
- Owners (stewards / domains)
- Constraints and escalation paths
- Revision history and diffs

**Expandable design area**
- Envelope comparison view
- Visual boundary changes over time
- Assumption annotations per envelope

---

## 4. Timeline as Envelope Lifecycle

The timeline is not a log of events.
It is a **lifecycle view of envelopes**.

Implementation note: a raw event stream may exist underneath (for replay and investigation), but the primary simulation artifact remains envelope state, revision, and assumption fit.

Example progression:
- Envelope promoted
- Envelope expanded
- Signals diverge from assumptions
- Incident occurs
- Envelope revised or narrowed

### Canon ties
- **Decision Revision**
- **Authority Drift**
- **Outcome Attribution**

### UI surface: Timeline Scrubber
- Scrub through time
- Select a moment to inspect envelopes, signals, and system behavior
- Branch timelines only by revising envelopes (not behavior)

**Expandable design area**
- Branch comparison
- Revision cadence metrics
- "What if" envelope diffs

---

## 5. System & Automation View (Constrained Capability)

### Canon concept
- **Bounded Autonomy**
- **Human-Preferential Constraints**

This view answers:
> "Given the envelopes, what *could* the system do?"

It does not show:
- execution details
- code
- model internals

It shows:
- agents or tools that are enabled
- explicit prohibitions
- escalation requirements

### UI surface: System Capability Panel
- Enabled capabilities (envelope-bounded)
- Disabled or forbidden actions
- Dependencies on human attribution

**Expandable design area**
- Capability grouping by envelope
- Historical comparison of allowed vs disallowed actions

---

## 6. Signals, Outcomes, and Incidents

### Canon concept
- **Decision Telemetry**
- **Outcome Attribution**
- **Incidents without System Failure**

Signals are evaluated **against envelope assumptions**, not system health.

An incident may occur even when:
- systems are healthy
- automation behaved correctly
- metrics look "green"

### UI surface: Signals & Outcomes Panel
- Observed signals (metrics, complaints, escalations)
- Incident summaries
- Clear linkage to envelope assumptions

**Expandable design area**
- Soft signals (trust, confusion, sentiment)
- Signal-to-assumption mismatch indicators

---

## 7. Steward Deep-Dive Panels (Inspection Lenses)

Deep-dive panels are optional inspection surfaces opened by stewards.
They do not control execution.

### 7.1 Decision Memory & Embeddings
**Canon ties**
- Decision Memory
- Embeddings as recall, not authority

Shows:
- Related envelope histories
- Similar decision shapes
- Explainable similarity (textual, not numeric)

**Expandable**
- Envelope lineage maps
- Assumption similarity clustering

---

### 7.2 Decision-Centric Metrics
**Canon ties**
- Stewardship health
- Authority stability

Metrics are attached to:
- decisions
- envelopes
- revisions

Not:
- individuals
- teams

---

### 7.2a Wide Event Replay (Investigation Lens)

This lens is a query-first replay surface over DTS-allowed events ("wide events"):
- filter by `decision_id`, `envelope_id`, `decision_class`, `tool_id`, `outcome`, `boundary_interaction`
- correlate across a run via `correlation_id`
- view coarse timing and failure classes

It does not render model internals or private deliberation; it stays at the decision/action and outcome level.

**Expandable**
- Drift indicators
- Revision frequency trends

---

### 7.3 Customer Experience View
**Canon ties**
- Customer Steward
- Human-preferential outcomes

Shows:
- Customer journey aligned to timeline
- What customers experienced, not what systems did
- Linkage to envelope constraints and assumptions

**Expandable**
- Trust impact annotations
- Customer-visible policy changes

---

### 7.4 Assumptions & Constraints Review
**Canon ties**
- Decision assumptions
- Revisability

Extracts:
- Declared assumptions from envelopes
- Indicates which assumptions no longer hold

**Expandable**
- Assumption confidence tracking
- Steward annotations over time

---

### 7.5 Steward Action Surface
**Canon ties**
- Steward authority
- Non-ownership of execution

Permitted actions:
- Narrow or expand envelope
- Add escalation
- Revise assumptions
- Annotate decision memory
- Trigger Decision Stewardship Group review

Explicitly excluded:
- Code changes
- Model tuning
- Execution overrides

---

## 8. Decision Stewardship Group (DSG) in the Simulation

### Canon concept
**Decision Stewardship Group**

DSG appears only when:
- envelopes intersect across domains
- authority revision exceeds local steward scope
- people-affecting decisions cross boundaries

### UI surface: DSG Review Event
- Trigger reason
- Involved envelopes
- Participating stewards
- Outcome as envelope revision

DSG is represented as an **artifact-producing event**, not a meeting UI.

**Expandable**
- Cross-domain impact visualization
- Historical DSG outcomes

---

## 9. Role Views as Lenses

Role selection does not change the simulation.

It changes:
- emphasis
- default panels
- language

### Canon ties
- Multiple stewards, one system of record

Examples:
- Domain Engineer: incident alignment, revision impact
- HR Steward: people-affecting envelopes, embedding constraints
- Customer Steward: trust and experience outcomes
- Executive: risk exposure and revision cadence

---

## 10. Relationship to Models and AI

Models may:
- summarize outcomes
- recall similar envelopes
- propose revisions

Models do not:
- own authority
- finalize decisions
- bypass stewardship

AI participates as **constrained infrastructure**, consistent with HDDL production assumptions.

---

## 11. What This Simulation Is Not

- Not a dashboard
- Not an agent control panel
- Not a prediction engine
- Not a product specification

It is:
> A concrete way to experience HDDL concepts interacting over time.

---

## 12. Open Design Areas (Intentional)

- Standard envelope schemas for interoperability

---

## 13. Architecture Views (4+1) and AI-Native Complementary Views

This repository contains multiple diagrams and UI-mock visuals. The classic **4+1 views** (Kruchten) are a useful organizing frame, but HDDL benefits from a few **AI-native complementary views** because “authority”, “telemetry boundaries”, and “stewardship” are first-class.

### 13.1 Mapping HDDL visuals to 4+1

**Logical view (what it is):** conceptual building blocks, responsibilities, and boundaries.
- Fits HDDL diagrams that show governance/execution/telemetry components and how they compose.
- In this repo, the architecture visual (governance layer → telemetry connector → execution layer) is primarily a logical view.

**Process view (how it behaves at runtime):** interactions over time, lifecycles, and feedback loops.
- Fits HDDL diagrams that show envelope promotion → execution → telemetry → inspection → revision.
- In this repo, simulation flow/timeline visuals and the stewardship escalation flow are primarily process views.

**Development view (how it’s built):** code/service/module ownership, APIs, schemas, versioning, integration contracts.
- Fits schema maps and “artifact shapes” (envelope schema, wide-event schema, artifact store interfaces).
- In this repo, the DTS “wide event schema map” mock is a partial development view (information model + integration seams).

**Physical view (where it runs):** deployment topology, trust zones, data planes, retention boundaries, enforcement points.
- HDDL often needs an explicit physical view because DTS constraints are enforced *in infrastructure* (collection, redaction, retention, access).
- This repo does not currently emphasize a physical deployment diagram; it is a recommended addition once the target runtime is known.

**+1: Scenarios (why it matters):** concrete stories that validate the architecture end-to-end.
- HDDL narratives and simulation walkthroughs are the “+1” view: they connect authority, telemetry boundaries, outcomes, and revision.

### 13.2 Suggested AI-native complementary views (beyond 4+1)

These are not “extra decoration”; they make the socio-technical system legible in an AI+human operating model.

**Authority view (HDDL-first):**
- Center the envelope as the unit of authority.
- Show: envelope versions, owners, escalation paths, and what capabilities are bounded/forbidden.

**Telemetry boundary view (DTS-first):**
- Show: what events exist, what is prohibited, retention windows, aggregation rules, and who can query what.
- Emphasize enforcement points (collection → transformation/redaction → storage → access).

**Stewardship / change-control view (governance-first):**
- Show: which actors can revise envelopes, what triggers DSG, what artifacts are produced, and the operating cadence.

**Assumptions ↔ signals mismatch view (drift-first):**
- Treat “incident without system failure” as a first-class diagnostic: reality diverges from assumptions.
- Connect signals and outcomes back to specific envelopes and revisions.

### 13.3 Additional AI-native view set (recommended)

If you want a second “AI-native views” set that complements Authority/Telemetry/Stewardship/Drift, these are high-signal in AI+human systems:

**Tooling & actuation view (tool-first):**
- Show: what tools exist, what they can mutate, required approvals, and envelope-bounded tool permissions.
- Makes “agents are infrastructure” legible (capabilities are exercised through tools).

**Memory & precedent view (recall-first):**
- Show: what is stored as authoritative artifact vs derived memory, how precedent is retrieved, and how memory is constrained by DTS.

**Evaluation & change safety view (assurance-first):**
- Show: what evaluations/guardrails must pass to promote a new envelope/version, and what regressions block promotion.
- Treat evaluation as a first-class governance artifact, not a dev-only concern.

**Human-impact view (people-first):**
- Show: where humans are in-loop by design (escalations, overrides, dispute resolution), and where the system is explicitly prohibited from inference/measurement.
- Pairs naturally with DTS boundary enforcement and “don’t measure the people.”


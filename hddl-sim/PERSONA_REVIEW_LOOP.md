# Persona-Based Review Loop (2 Cycles)

**Purpose**
Create a tight review→build→test→visual-verify loop that matches the canon simulation intent: *time-based replay/inspection of decision authority via envelopes*, not a doc browser and not an execution console.

**Grounding (from HDDL_Simulation_Concept)**
- Primary object: **Decision Envelope** (nothing occurs without an active envelope)
- Timeline: **envelope lifecycle view**, not an event log
- Surfaces should answer:
  1) what authority existed, 2) what was allowed, 3) what signals/outcomes were observed
- Stewards can revise envelopes and annotate; they do **not** tune models, change code, or override execution

---

## What “makes sense” in the left panel
The left panel is for **inspection surfaces** (stable lenses). It should not expose pages that duplicate global UI primitives.

- **Timeline**: should exist as a global scrubber (it’s a shared context control), not as a separate “page” link.
- **Authority**: only belongs in left-nav when it is a clear “Decision Authority Panel” that is envelope-first and time-indexed (not an org chart placeholder).

Resulting IA bias:
- Left-nav = **lenses** (Envelopes, Signals & Outcomes, Steward Agent Fleets, Steward Actions, DSG Review)
- Global controls = **timeline scrubber**

---

## Personas and what they review
Use the same scenario/time position during a review pass.

### Domain Engineer
- Checks: envelope boundaries are explicit; allowed/disallowed actions are obvious; capability constraints are readable
- Red flags: capability view looks like tool internals; anything that implies code/model control

### HR Steward
- Checks: people-impacting envelopes show assumptions/constraints; revisions are easy to audit; prohibited actions are explicit
- Red flags: UI encourages ad-hoc overrides; missing escalation paths

### Customer Steward
- Checks: signals/outcomes are framed against assumptions; incident can exist without system failure; customer-impact is visible
- Red flags: “green system health” masking assumption mismatch; no linkage from signal→assumption

### Executive
- Checks: risk exposure is visible through envelope drift/revision cadence; what’s allowed is legible
- Red flags: metrics without authority context; no crisp “what was permitted at time T” view

### Data Steward
- Checks: telemetry boundaries are visible; decision memory is non-authoritative; “wide events” lens is query-first and bounded
- Red flags: raw log dumps as the primary UI; private deliberation/model internals exposed

---

## Feedback capture template (use per persona)
Record feedback in a consistent, testable way.

**Context**
- Persona:
- Scenario: `scenario-default-001` (or imported id)
- Time $t$ (hour):
- Page/lens:

**Observation**
- What did I expect to be able to answer?
- What did the UI actually show?

**Friction / Ambiguity**
- What is unclear or misleading?

**Change request (small + specific)**
- One change that improves inspectability without expanding scope.

**Acceptance criteria (must be testable)**
- DOM assertions:
- Screenshot evidence:

**Test update**
- Which Playwright test should be added/updated?
- Which screenshot name should be produced?

---

## Review Loop (run twice)
Each cycle ends with: tests green + screenshots captured + a short human eyeball pass.

### Cycle 1 — Make the IA coherent (review → build → tests → visual)
**Review (15–20m)**
- Confirm left-nav only lists lenses, not global controls.
- Confirm timeline scrubber is present globally and readable.
- Confirm the home surface is envelope-first.
- Confirm envelope windows are visible on the global timeline (span overlay).

**Build (small, surgical)**
- Remove confusing left-nav entries for `/timeline` and `/authority`.
- Keep timeline scrubber global.
- Add stable test hooks for the global time control (IDs are fine).

**Add/Update tests**
- Assert left-nav does **not** contain “Timeline Scrubber” or “Authority View”.
- Assert left-nav contains: Decision Envelopes, Signals & Outcomes, Steward Agent Fleets, DSG Review, Steward Actions.
- Assert the global timeline renders envelope span windows.
- Assert that changing time changes envelope status copy.
- Capture screenshots:
  - initial load
  - sidebar state
  - signals page
  - capabilities page
  - stewardship page
  - signals feed (Cycle A)

**Run tests**
- `npx playwright test tests/ui-verification.spec.js`

**Visual verify**
- Open the screenshots in `test-results/screenshots/` and confirm the workbench is not visually blank.


### Cycle 2 — Tighten envelope-first inspection (review → build → tests → visual)
Pick **one** improvement that increases “inspectability” without expanding scope.

**Recommended target (minimal, canon-aligned)**
- In **Signals & Outcomes**, make the signal→assumption relationship unavoidable:
  - show the current selected time prominently
  - group events by envelope
  - render the assumption reference(s) when present

**Review (15–20m)**
- For each persona, verify the Signals surface answers: *what was observed* and *which assumption it challenges*.

**Build (small, testable)**
- Ensure the Signals feed updates when the global time changes (no refresh required).
- Ensure the signal row exposes assumption references when present.

**Add/Update tests**
- Set time to the known signal point ($t=34$ in the default scenario) and assert:
  - Signals page shows `ENV-003: Pricing Adjustments`
  - Signals page contains `Signal divergence detected`
  - An `Assumption Link` block is visible
- Screenshot the Signals feed at $t=34$.

**Run tests**
- `npx playwright test tests/ui-verification.spec.js`

**Visual verify**
- Confirm the cue is readable and not hidden by overlays.

---

## Standard operating commands
- Dev server: `npm run dev`
- Tests: `npx playwright test`
- Report: `npx playwright show-report`

Server URL (local): `http://localhost:5175/`

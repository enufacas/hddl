## Plan: HDDL Simulation “Final Plan” (Schema + UI Evolution)

Deliver a faithful HDDL sim where **envelopes are the primary authority artifact**, events only hydrate/modify them over time, and every UI surface answers: **what authority existed, what was allowed, what boundaries were touched and revised**. Preserve current value (workbench layout, fleets, terminal logs, additive actions, docs grounding) while reducing “busy” feel via **default-collapsed Aux/Bottom**, route-aware auto-open, and removing redundant top-level Timeline.

## Why This Matters (Guardrails)

The simulation exists to make HDDL’s core promise tangible: **authority stays explicit, bounded, and revisable even as execution scales**.

If the sim is faithful to HDDL, a user can answer at any moment:
- What authority existed at this time?
- What was the system allowed to do?
- What boundaries were touched, and how did stewardship revise authority?

Non-goals (to avoid drift):
- No “observability dashboard” as the primary experience.
- No “agent control panel” surface area.
- No model internals or private reasoning traces (DTS-bounded artifacts only).

## UI Commitments (Preserve Value, Reduce Busy)

- **Single timeline control**: the global scrubber in `hddl-sim/src/main.js` is the only time control.
- **Aux + Bottom panels stay** (we keep the value), but are **default-collapsed**.
- **Route-aware auto-open**:
  - Aux auto-opens on Evidence + DSG routes.
  - Bottom auto-opens only during playback / import / generation (log-heavy moments).
- **Persist layout state**: collapse state and last size stored in localStorage.
- **Authority-first rendering**: envelopes are the first renderable object; events hydrate them.
- **Capability is subordinate to authority**: fleets show capability *under* envelopes, never as authority itself.

### Steps 3–6 steps, 5–20 words each
1. Implement authority-first version lineage (`envelope_version`, `revision_id`) in `hddl-sim/src/sim/scenario-schema.js` and `hddl-sim/src/sim/scenario-default.js`.
2. Emit revision lineage + boundary interactions from actions/imports in `hddl-sim/src/sim/scenario-actions.js`; keep additive behavior.
3. Add projections: boundary interaction counts, drift markers, decision-memory recall links in `hddl-sim/src/sim/selectors.js`.
4. Evolve UI lenses: Envelopes (authority), Evidence (fit), Revision (stewardship), Fleets (capability≠authority), DSG (artifact) in `hddl-sim/src/pages`.
5. Collapse panels by default; route-aware auto-open via `hddl:navigate` in `hddl-sim/src/components/workspace.js` and `hddl-sim/src/style-workspace.css`.
6. Update scenario narrative + tests to assert invariants (not counts) in `hddl-sim/src/sim/scenario-default.js` and `hddl-sim/tests`.

### Further Considerations 1–3, 5–25 words each
1. `/timeline` disposition: remove from nav, redirect `/timeline` to `/` in `hddl-sim/src/router.js`.
2. Persist panel collapse/size in localStorage; defaults: Aux collapsed, Bottom collapsed.
3. Auto-open policy: open Aux on Evidence/DSG; open Bottom only during playback/log-heavy flows.

**Concrete UI evolution (what changes where)**
- **Navigation IA (fewer primary choices)** in `hddl-sim/src/components/workspace.js`
  - Primary: **Envelopes** (`/`), **Evidence** (`/decision-telemetry`), **Revision** (`/stewardship`)
  - Secondary: **Fleets** (`/steward-fleets`), **DSG Artifact** (`/dsg-event`)
  - Reference section: **Docs** (`/docs`), **Authority Map** (`/authority`)
- **Timeline**: global scrubber remains the only time control in `hddl-sim/src/main.js`; `/timeline` becomes hidden/deep-link or redirects to `/`.
- **Aux panel (default-collapsed)**: becomes “Evidence (bounded)” summary; auto-opens on Evidence + DSG routes.
- **Bottom panel (default-collapsed)**: becomes “Replay Console / DTS Stream”; auto-opens only when playing, importing, or generating events.

If you want, next iteration of this plan can include a strict “acceptance checklist” per spec item (1–8) phrased as observable UI outcomes and testable invariants (e.g., “every revision event increments envelope_version and changes modal diff”).

## Spec Deliverables (1–8) — Concrete Change List

### 1) Authority-First Core (Envelope = Primary Artifact)
- Add explicit `envelope_version` and `revision_id` to the schema; surface in UI.
- Show “Current version” + “Last revision” everywhere an envelope appears.
- Render envelope diff summaries (assumptions + constraints) directly in the detail modal.

Targets:
- `hddl-sim/src/sim/scenario-schema.js`
- `hddl-sim/src/sim/scenario-default.js`
- `hddl-sim/src/sim/scenario-actions.js`
- `hddl-sim/src/components/envelope-detail.js`
- `hddl-sim/src/pages/home.js`
- `hddl-sim/src/pages/timeline.js` (if kept as a hidden lens)

### 2) Boundary Interactions as First-Class Signals
- Promote “boundary interactions” (escalated/overridden/deferred) to first-class events.
- Add a Boundary Interactions panel with counts and per-envelope badges.

Targets:
- `hddl-sim/src/sim/scenario-schema.js`
- `hddl-sim/src/sim/scenario-default.js`
- `hddl-sim/src/sim/selectors.js`
- `hddl-sim/src/pages/decision-telemetry.js`
- `hddl-sim/src/components/workspace.js` (aux bar)

### 3) DSG = Artifact Output (Not Meeting UI)
- Replace any “meeting” cues with artifact records and envelope diffs.
- DSG view shows: trigger, involved envelopes, resulting revisions.

Targets:
- `hddl-sim/src/pages/dsg-event.js`
- `hddl-sim/src/components/envelope-detail.js`

### 4) Decision Memory = Recall Only
- Add a “Decision Memory” panel with explicit `decision_id` links.
- Label as non-authoritative recall; enforce DTS-bounded sources.

Targets:
- `hddl-sim/src/pages/stewardship.js`
- `hddl-sim/src/sim/scenario-schema.js`

### 5) Drift / Assumption Mismatch View
- Add an “Assumption Fit” section linking signals to assumptions.
- Timeline shows assumption-mismatch markers tied to envelope windows.

Targets:
- `hddl-sim/src/pages/decision-telemetry.js`
- `hddl-sim/src/pages/timeline.js` (or the global scrubber)
- `hddl-sim/src/components/envelope-detail.js`

### 6) Capability vs Authority Separation
- Fleets view explicitly shows allowed vs prohibited capabilities (under an envelope).
- Add “Prohibited actions” chips to envelope cards.

Targets:
- `hddl-sim/src/pages/capability-matrix.js`
- `hddl-sim/src/pages/home.js`
- `hddl-sim/src/components/envelope-detail.js`

### 7) Narrative-Aligned Default Scenario
- Refactor default scenario to mirror “Thursday, Two Years Later.”
- Include cross-domain collision and DSG revision artifact output.

Targets:
- `hddl-sim/src/sim/scenario-default.js`
- `docs/narratives/Narrative_Thursday_Two_Years_Later.md` (reference)

### 8) Testing (Invariants, Not Hardcoded Counts)
- Tests assert: every event links to an envelope; DSG yields artifacts; revisions alter envelope detail.
- Remove hardcoded envelope count expectations.

Targets:
- `hddl-sim/tests/ui-verification.spec.js`
- `hddl-sim/tests/platform.spec.js`

## Acceptance Checklist (Observable + Testable)

- **Authority at time t**: at any selected time, UI can identify the active envelope(s) and their versions.
- **Allowed vs prohibited**: envelope surfaces show what is allowed and what is explicitly prohibited.
- **Revisions change authority**: applying a revision changes the envelope detail (diff visible) and increments lineage.
- **Boundary interactions are legible**: escalated/overridden/deferred are counted and attributable per-envelope.
- **DSG produces artifacts**: DSG page renders trigger → involved envelopes → revision outputs; no meeting UI.
- **Decision Memory is recall-only**: labeled non-authoritative; contains `decision_id` links back to artifacts.
- **No model internals**: UI never renders “private reasoning” traces; only DTS-bounded artifacts/events.

## Experience Design (Understanding Goals)

The sim exists so people **experience and understand** HDDL—not just observe correct artifacts. Every surface should teach *why* HDDL works the way it does.

### First-Run Orientation
- Landing view opens with a question, not a list: **"What authority exists right now?"**
- Envelopes are the answer; the framing teaches "authority = envelope."
- First visit shows a minimal orientation overlay or inline callout: "You're looking at decision authority over time. Scrub the timeline to see how it changes."

### Narrative as Teaching Mechanism
- Default scenario ("Thursday, Two Years Later") isn't just data—it's a **guided walkthrough**.
- Key moments surface inline annotations:
  - **T+0**: "Authority exists. The envelope defines what the system is allowed to do."
  - **T+24h**: "A signal strained assumptions. The system stopped and escalated."
  - **T+36h**: "A DSG produced a revision artifact. Authority changed explicitly."
- Optional "Story Mode" toggle replays the scenario with narration at each beat.

### Concept Legibility (Teach the Vocabulary)
- First mention of each HDDL term (envelope, steward, DSG, boundary interaction) links to a short inline definition (sourced from `Glossary.md`).
- Tooltips appear on hover; clicking opens the full glossary entry without leaving the view.
- Avoid jargon without grounding: "ENV-001" should always appear alongside its name and owner.

### "Aha" Moments (What Users Should Feel)
The sim should make these experiences tangible:
- **"The system stopped at the boundary and waited."** — Boundary interactions show the model proposed something, the envelope prohibited it, and a steward was notified.
- **"Authority changed, but only through explicit revision."** — Revision diffs are visible; no silent expansion.
- **"Nothing ran outside an envelope."** — Every action is anchored to an envelope version; orphan events are impossible.

### Contrast Callouts (Show What Didn't Happen)
HDDL is defined by what it *isn't*. Make boundaries tangible:
- At boundary interactions, show: **"Model proposed X → Envelope prohibited → Escalated to steward."**
- In envelope detail, list "Prohibited actions" alongside "Allowed actions."
- Optionally: a "What-if" toggle that shows what would have happened without the constraint.

### Docs as Contextual Teaching
- When a DSG artifact appears, surface a relevant passage from the Manifesto or narrative inline.
- "Learn more" links open the doc in the Reference section (not a new tab).
- Docs aren't just reference—they're integrated teaching moments.

### Interactivity for Understanding
Understanding comes from *doing*, not just observing:
- Consider a "Try to expand authority" interaction that shows the system refuse and explain why.
- Let users create a test envelope and see how events interact with it.
- Allow "replay with different constraints" to see how outcomes change.

### Experience Success Criteria
- A newcomer can explain what an envelope is after 5 minutes.
- A user can predict what the system will refuse to do given an envelope's constraints.
- A user understands why a DSG artifact exists without reading external docs.
- A user can answer "what authority existed at T+12h?" by looking at the UI.
- A user leaves knowing: "Authority is explicit, bounded, and revisable."

---

## Progress (Executed)

Last updated: 2025-12-25

Completed
- Spec 1: Envelope lineage (`envelope_version`, `revision_id`) surfaced across key views.
- Spec 2: Boundary interactions first-class + counts + per-envelope attribution.
  - Aux: Boundary Interactions section with totals and per-envelope breakdown.
  - Envelopes: per-envelope boundary badges on cards.
  - Envelope detail: compact boundary (last 24h) summary.
- Spec 3: DSG is rendered as artifact output (trigger → involved envelopes → revision outputs).
- Spec 4: Decision Memory is recall-only (labeled non-authoritative with `decision_id` links).
- Spec 6: Capability vs authority separation (allowed vs prohibited under envelopes).
- Spec 7: Default scenario updated to narrative-aligned “Thursday, Two Years Later”.
- Spec 8: Tests refactored to invariants (Playwright suite passing).

- Spec 5: Drift / Assumption mismatch
  - Evidence: Assumption Fit compares signals against envelope assumptions at the signal hour.
  - Timeline: mismatch markers render only within envelope windows (createdHour..endHour).
  - Default scenario includes a visible mismatch demonstration signal.

In progress
None.

Experience Design (incremental)
- First-run orientation: added a dismissible inline callout on Envelopes (Home) explaining the scrubber + authority-over-time framing.
- Concept legibility: glossary-backed inline definitions added across key lenses (Home, Evidence, Revision, DSG) plus Envelope Detail and Aux telemetry, sourced from `hddl-sim/public/docs/Glossary.md` via `/docs/Glossary.md`.
- Concept legibility: embedded glossary links directly into Envelope Detail section headers (Assumptions/Constraints/Revision Diff) and added missing glossary entries (Assumption, Constraint, Revision).
- Concept legibility: added glossary links inside Home envelope cards (Envelope Version / Revision / Constraint / Boundary Interaction) and refreshed bindings after time-based rerenders.
- Concept legibility: added glossary links inside Evidence “Assumption Fit” and rebound glossary handlers after dynamic rerenders so term links remain clickable.
- Concept legibility: added glossary links inside Aux telemetry (Live Metrics labels for Drift Alerts / Boundary Touches) and bound a shared inline glossary panel for the Aux rerender.
- Validation: Playwright suite passing after glossary additions.

Experience Design (Optional Experience Design)
- Story Mode: added a persisted Story Mode toggle (global timeline bar) to enable narrative teaching overlays.
- Narrative beats: Evidence now renders T+0 / T+24h / T+36h beat annotations (Story Mode only).
- Contrast callouts: Boundary interactions render a “Model proposed → Envelope prohibited → Escalated” callout (Story Mode only).
- Interactivity: added “Try expand authority” (Home-only timeline action) that is refused and explains why via boundary_interaction + annotation.
- Validation: Playwright suite passing after Story Mode + contrast additions.
# Interactive Scenario Implementation (Phase 2)

## Status: Experimental

Interactive mode is a **Phase 2 feature** where action-driven scenarios enable users to progressively unfold events through deliberate actions, rather than passively watching replay. The implementation is isolated from the working replay views to prevent regressions.

## Architecture

### Mode Isolation

The interactive scenario system operates completely separately from replay:

1. **Dual Store Pattern**: 
   - `sim/store.js` - Replay mode (time-based, immutable scenario playback)
   - `sim/interactive-store.js` - Interactive mode (action-driven, mutable state evolution)

2. **Mode Toggle**: 
   - Timeline bar checkbox: "Interactive" (experimental indicator)
   - When enabled: pauses replay, switches to action-driven progression
   - When disabled: reverts to time-based replay

3. **State Separation**:
   - Replay: `scenario` → `events[]` → derived state at time T
   - Interactive: `baseScenario` → `actionLog[]` → evolved `currentState`

### Component Structure

```
src/
├── sim/
│   ├── store.js                    # Replay mode (existing, unchanged)
│   ├── interactive-store.js        # Interactive mode (new, Phase 2)
│   └── scenario-schema.js          # Shared normalization
├── pages/
│   ├── home.js                     # Replay views (existing, unchanged)
│   └── interactive.js              # Interactive UI (new, Phase 2)
└── main.js                         # Mode toggle integration
```

## Interactive Store API

### State Model

```javascript
{
  // Mode tracking
  isInteractive: boolean,
  
  // Base scenario (immutable template from spec)
  baseScenario: NormalizedScenario,
  
  // Runtime state (evolves with actions)
  currentState: {
    hour: number,
    envelopes: Envelope[],
    events: Event[],
    pendingActions: Action[]
  },
  
  // Action log (for deterministic replay)
  actionLog: ActionEntry[],
  
  // Seed for deterministic randomness
  seed: number
}
```

### Public API

**Mode Control:**
- `isInteractiveMode()` → boolean
- `setInteractiveMode(enabled)` → boolean (resets state on enable)

**State Access:**
- `getInteractiveState()` → currentState snapshot
- `getActionLog()` → ActionEntry[] (copy)
- `getSeed()` → number

**Action Dispatch:**
- `dispatchAction(action)` → { ok, error?, warning? }
- `resetInteractiveState()` → void

**Seed Control:**
- `setSeed(newSeed)` → void (resets state)

**Listeners:**
- `onStateChange(cb)` → unsubscribe function
- `onActionDispatched(cb)` → unsubscribe function

## Action Log Schema

Each action dispatch creates an entry:

```javascript
{
  index: number,          // Sequential action counter (0-based)
  timestamp: number,      // Wall-clock ms (audit only, not deterministic)
  hour: number,           // Scenario hour when action dispatched
  action: {
    type: string,         // Canonical action type (emit_signal, attempt_decision, etc.)
    ...actionPayload      // Action-specific parameters
  }
}
```

## Phase 2 Work Items

### Not Yet Implemented

1. **Reducer Logic** (Step 3 - highest priority):
   - `applyAction(action)` currently returns stub warning
   - Needs: deterministic state transitions for each action type
   - Must emit canonical events (same shape as replay format)

2. **Action Types** (Step 3):
   - `emit_signal` - Generate new signal event
   - `attempt_decision` - Try to make a decision (may fail authorization)
   - `apply_revision` - Submit revision to existing envelope
   - `escalate_boundary` - Trigger boundary interaction
   - `advance_time` - Move scenario forward by N hours

3. **Authorization Semantics** (Step 3):
   - Who may revise? (original decider vs steward vs DSG)
   - Who may escalate? (envelope owner vs affected party)
   - Which actions are valid when? (time/state preconditions)

4. **Conformance Fixtures** (Step 6):
   - Must-pass action sequences (valid authorized flows)
   - Must-fail action sequences (invalid/unauthorized attempts)
   - Determinism tests (same actions + seed → same events)
   - Invariant tests (no orphaned refs, monotonic versions, valid linkage)

5. **Deprecation Warnings** (Step 7):
   - Action log schema versioning
   - Legacy action type migration path

## UI Components

### Timeline Bar Toggle

Location: Global timeline bar (top of all views)

```html
<label>
  <input type="checkbox" id="timeline-interactive-mode" />
  <span>Interactive</span>
</label>
```

Behavior:
- Checked: interactive mode active
- Unchecked: replay mode active (default)
- On change: pauses playback, shows status message, resets interactive state

### Interactive Scenario Page

Route: `/interactive`  
Navigation: Sidebar → Secondary → Interactive

Features:
- Current state display (hour, envelope count, event count)
- Session config (seed input, reset button)
- Available actions (grid of action buttons, currently disabled placeholders)
- Action log (reverse-chronological list of dispatched actions)
- Glossary integration (inline term definitions)
- Phase 2 warning banner (semantics not yet stable)

### Sidebar Navigation

Location: Workspace sidebar → Secondary section

```
Secondary
├── Fleets
├── DSG Artifact
└── Interactive (experimental indicator)
```

Styling: Dimmed opacity + status bar color to indicate experimental

## Migration Path

### For External Implementers

1. **Wait for Phase 2 completion** before building interactive scenario tools
2. Current stable: replay format only (Scenario_Replay_Wire_Format.md)
3. Watch: docs/spec/Drift_Gap_Analysis.md for interactive status updates

### For SIM Development

1. **Replay views untouched**: All existing pages (home, evidence, revision, etc.) use `sim/store.js` exclusively
2. **Interactive isolated**: Only `/interactive` page uses `interactive-store.js`
3. **No cross-contamination**: Mode toggle cleanly switches stores, no shared mutable state

## Testing Strategy

### Regression Prevention

All existing Playwright tests (22) validate replay-only functionality:
- Timeline scrubbing
- Envelope display
- Signal/decision/revision rendering
- DSG session display
- Story mode overlays

None of these tests touch interactive mode (toggle stays unchecked by default).

### Future Interactive Tests

When reducer is implemented (Step 3):

```javascript
test('interactive mode dispatches actions', async ({ page }) => {
  await page.goto('/interactive')
  
  // Enable interactive mode
  await page.check('#timeline-interactive-mode')
  
  // Dispatch action
  await page.click('[data-action="emit_signal"]')
  
  // Verify action log
  const log = page.locator('#interactive-log')
  await expect(log).toContainText('emit_signal')
})
```

## Conformance

### Current Validation

Conformance suite validates:
- Canon Registry (35 entries, including this doc once added)
- Scenario packs (default.scenario.json conforms to schema)

Does NOT yet validate:
- Interactive action logs (schema exists in hddl-interaction.schema.json but no fixtures)
- Reducer behavior (no must-pass/must-fail tests)

### Phase 2 Conformance Goals

Add to `scripts/validate-scenarios.mjs`:
- Load interaction fixtures from `src/sim/fixtures/*.interaction.json`
- Validate against `schemas/hddl-interaction.schema.json`
- Run reducer with seeded state + actions
- Assert output events match expected canonical events

## Related Documents

- [Plan: Portable Spec + UI/Data Separation](../../.github/prompts/plan-specDrivenSeparation.prompt.md) - Overall plan (Step 3)
- [Drift Gap Analysis](Drift_Gap_Analysis.md) - Interactive status (Phase 2 table)
- [Scenario Interaction Format](Scenario_Interaction_Format.md) - Action schema (not yet normative)
- [Implementers Guide](Implementers_Guide.md) - FAQ: "Can I build interactive scenarios?" (Answer: Phase 2)

## Decision Rationale

### Why Dual Store?

**Considered alternatives:**
1. Single store with mode flag → Risk: replay code sees mutable state, brittle conditionals
2. Store factory pattern → Overhead: complex DI, harder to reason about lifecycle
3. Dual store (chosen) → Clean: replay untouched, interactive isolated, mode toggle swaps cleanly

**Criteria:**
- Minimality: No changes to 22 passing tests
- Stability: Replay views unaffected by experimental work
- Portability: Interactive store shape matches wire format
- Testability: Can test interactive independently

### Why Experimental Marker?

Phase 2 semantics are not yet stable:
- Reducer logic undefined
- Authorization rules TBD
- Conformance fixtures missing
- Schema version may change

External implementers should NOT build against interactive mode yet. Mark clearly to prevent premature adoption.

## Implementation Checklist

- [x] Create `sim/interactive-store.js` (dual store pattern)
- [x] Create `pages/interactive.js` (experimental UI)
- [x] Add mode toggle to timeline bar
- [x] Add route `/interactive` to router
- [x] Add sidebar navigation item (experimental indicator)
- [x] Wire up mode switching (pause replay on enable)
- [x] Verify regression tests pass (22/22 Playwright)
- [ ] Implement reducer logic (Step 3 - Phase 2)
- [ ] Define authorization semantics (Step 3 - Phase 2)
- [ ] Create conformance fixtures (Step 6 - Phase 2)
- [ ] Add action log validation to conformance suite (Step 6 - Phase 2)
- [ ] Remove experimental markers when stable (Step 3 complete)

## Code Examples

### Dispatching an Action

```javascript
import { dispatchAction } from './sim/interactive-store'

const result = dispatchAction({
  type: 'emit_signal',
  payload: {
    label: 'New customer inquiry',
    severity: 'high',
    source: 'external'
  }
})

if (!result.ok) {
  console.error('Action failed:', result.error)
}
```

### Listening to State Changes

```javascript
import { onStateChange, onActionDispatched } from './sim/interactive-store'

const unsubState = onStateChange((state) => {
  console.log(`State updated: ${state.envelopes.length} envelopes`)
})

const unsubAction = onActionDispatched((entry) => {
  console.log(`Action #${entry.index}: ${entry.action.type}`)
})

// Later: cleanup
unsubState()
unsubAction()
```

### Seeded Determinism

```javascript
import { setSeed, dispatchAction, getInteractiveState } from './sim/interactive-store'

// Run 1
setSeed(12345)
dispatchAction({ type: 'emit_signal', source: 'random' })
const state1 = getInteractiveState()

// Run 2 (same seed)
setSeed(12345)
dispatchAction({ type: 'emit_signal', source: 'random' })
const state2 = getInteractiveState()

// state1 === state2 (deterministic)
```

---

**Last Updated:** 2025-12-26  
**Status:** Phase 2 scaffolding complete, reducer implementation pending  
**Conformance:** Not yet validated (no fixtures)

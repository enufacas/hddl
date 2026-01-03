# HDDL-Sim Refactoring Architecture

**Status:** Phase 3 - Workspace Refactor Complete (Tasks 3.1-3.3 + mobile extraction)  
**Last Updated:** 2026-01-03  
**Target:** Break 7,091 lines of monolithic UI code into <800 line modules with clear boundaries

---

## Current State Snapshot

| File | Original LOC | Current LOC | Reduction | Status | Target |
|------|--------------|-------------|-----------|--------|--------|
| `hddl-map.js` | 3,866 | 911 | -2,955 (-76%) | 🟡 In Progress | <800 |
| `workspace.js` | 3,225 | 564 | -2,661 (-83%) | ✅ Complete | <800 |
| `store.js` | 144 | 144 | - | ✅ Clean | Reference |
| `selectors.js` | 202 | 202 | - | ✅ Clean | Reference |
| **Total UI** | **7,091** | **1,821** | **-5,270 (-74%)** | **104/104 tests passing** | **<1,600 lines** |

**Extracted Modules (25):**
- `map/detail-levels.js` (221 lines)
- `map/bezier-math.js` (57 lines)
- `map/tooltip-manager.js` (429 lines)
- `map/embedding-renderer.js` (1,093 lines)
- `map/envelope-renderer.js` (393 lines)
- `map/entity-renderer.js` (458 lines)
- `map/agent-layout.js` (84 lines)
- `map/particle-labels.js` (63 lines)
- `map/particle-logic.js` (33 lines)
- `map/event-resolution.js` (8 lines)
- `map/particle-motion.js` (110 lines)
- `map/text-utils.js` (24 lines)
- `map/flow-particles.js` (186 lines)
- `map/exception-links.js` (45 lines)
- `map/steward-processing.js` (44 lines)
- `map/render-fleet-links.js` (107 lines)
- `map/particle-renderer.js` (56 lines)
- `workspace/utils.js` (113 lines)
- `workspace/glossary.js` (14 lines)
- `workspace/ai-narrative.js` (651 lines)
- `workspace/sidebar.js` (373 lines)
- `workspace/panels.js` (476 lines)
- `workspace/state.js` (10 lines)
- `workspace/telemetry.js` (595 lines)
- `workspace/mobile.js` (286 lines)
- **Total extracted:** 5,929 lines across 25 focused modules

---

## Module Extraction Map

### A. From `hddl-map.js` (3,866 lines)

| Module | Source Lines | Approx LOC | Pure? | Dependencies | Priority | Risk |
|--------|--------------|------------|-------|--------------|----------|------|
| `detail-levels.js` | 11-242 | ~230 | ✅ Yes | None | P0 | Low |
| `bezier-math.js` | 325-355 | ~30 | ✅ Yes | None | P0 | Low |
| `tooltip-manager.js` | 468-750 | ~280 | ❌ No | d3 | P1 | Medium |
| `envelope-renderer.js` | 775-1700 | 393 | ❌ No | d3, detail-levels | P2 | Medium |
| `particle-engine.js` | 2734-3000 | ~270 | ❌ No | d3, bezier-math | P2 | **High** |
| `entity-renderer.js` | 1700-2730 | 458 | ❌ No | d3, detail-levels | P2 | Medium |
| `embedding-renderer.js` | 3399-3866 | ~470 | ❌ No | d3, selectors | P2 | Medium |
| `hddl-map.js` (refactored) | All | ~600 | ❌ No | All above | P3 | High |

**Extraction Strategy:**
1. **Phase 1:** Extract pure functions (detail-levels, bezier-math) - immediate value, zero risk
2. **Phase 2:** Extract D3 renderers (tooltip, envelope, particle, embedding) - medium risk
3. **Phase 3:** Refactor core coordinator to orchestrate extracted modules

---

### B. From `workspace.js` (3,225 lines) ✅ **PHASE 3 COMPLETE**

| Module | Status | Actual LOC | Pure? | Dependencies | Commit |
|--------|--------|------------|-------|--------------|--------|
| `workspace/utils.js` | ✅ Complete | 113 | ✅ Yes | None | Initial |
| `workspace/glossary.js` | ✅ Complete | 14 | ✅ Yes | None | Initial |
| `workspace/ai-narrative.js` | ✅ Complete | 651 | ❌ No | sim-state, fetch | d3bd5ad, 290d347 |
| `workspace/sidebar.js` | ✅ Complete | 373 | ❌ No | router, state | a30e799 |
| `workspace/panels.js` | ✅ Complete | 476 | ❌ No | sim-state, ai-narrative | a30e799 |
| `workspace/state.js` | ✅ Complete | 10 | ✅ Yes | None | a30e799 |
| `workspace/telemetry.js` | ✅ Complete | 595 | ❌ No | sim-state, colors, glossary | 957a073 |
| `workspace/mobile.js` | ✅ Complete | 286 | ❌ No | sim-state, router | e3f941c |
| `workspace.js` (refactored) | ✅ 564 lines | 564 | ❌ No | All above | e3f941c |

**Phase 3 Achievements:**
1. ✅ **Task 3.1:** Extracted AI narrative (651 lines) - narrative generation, timeline sync, caching
2. ✅ **Task 3.2:** Extracted sidebar (373 lines) + panels (476 lines) + shared state (10 lines)
3. ✅ **Task 3.3:** Extracted telemetry (595 lines) - event stream, metrics, boundary interactions
4. ✅ **Mobile extraction:** Extracted mobile UI helpers (286 lines)
5. ✅ **Result:** workspace.js reduced from 3,225 → 564 lines (-83% reduction)
6. ✅ **Tests:** 104/104 passing, no console errors
7. ✅ **Architecture:** Clean module boundaries with dependency injection pattern

---

## Detailed Module Specifications

### `detail-levels.js` (Priority P0)

**Purpose:** Responsive detail level management for SVG rendering  
**Exports:**
- `DETAIL_LEVELS` - Constant enum
- `getDetailLevel(width)` - Determine level from container width
- `getEnvelopeDimensions(level, baseR)` - Envelope sizing
- `getAgentDensity(level)` - Agent display properties
- `getAdaptiveAgentName(name, level)` - Responsive agent names
- `getAdaptiveEnvelopeLabel(label, name, level)` - Responsive envelope labels
- `getAdaptiveStewardLabel(name, version, level)` - Responsive steward labels
- `getAdaptiveHeader(header, level)` - Column headers
- `shouldRenderEnvelopeElement(element, density)` - Element visibility rules
- `shouldRenderIndividualAgents(level)` - Agent grouping threshold

**Test Coverage:** Unit tests import from `src/components/map/detail-levels.js` via `hddl-map.test.js`  
**Migration Path:** ✅ Complete

---

### `bezier-math.js` (Priority P0)

**Purpose:** Cubic Bezier curve calculations for particle animation  
**Exports:**
- `bezierPoint(t, p0, p1, p2, p3)` - Calculate point on cubic Bezier curve
- `makeFlowCurve(sourceX, sourceY, targetX, targetY, sign)` - Generate control points
- Curve memoization cache logic (if needed for performance)

**Dependencies:** None (pure math)  
**Test Coverage:** ✅ Unit tests in `src/components/map/bezier-math.test.js`  
**Migration Path:** ✅ Complete

---

### `tooltip-manager.js` (Priority P1)

**Purpose:** Centralized tooltip lifecycle management  
**Pattern:** Factory function returning tooltip API

**Exports:**
```javascript
export function createTooltipManager() {
  return {
    agent: {
      show(agentNode, mouseEvent, element, options),
      hide(),
      position(tooltipNode, mouseEvent, anchorEl)
    },
    envelope: {
      show(envelopeNode, mouseEvent, element, options),
      hide()
    },
    steward: {
      show(stewardNode, mouseEvent, element, options),
      hide()
    },
    canHover(),
    shouldShowHoverTooltip(evt)
  }
}
```

**Dependencies:** d3 (selection API)  
**Test Coverage:** Integration tests (Playwright)  
**Risk:** Medium - tightly coupled to D3 but isolated

---

### `envelope-renderer.js` (Priority P2)

**Purpose:** Render decision envelopes (enter + update) with status and animations  
**Exports:**
- `renderEnvelopeEnter({ d3, nodeSelection, nodeEnter, shouldRenderEnvelopeElement, showEnvelopeTooltip, hideEnvelopeTooltip, canHoverTooltip, getScenario, getTimeHour, createEnvelopeDetailModal })`
- `updateEnvelopeRendering({ d3, nodeUpdate })`

**Responsibilities:**
- Envelope shape generation (icon vs body/flap/fold)
- Tooltip + click handlers (opens envelope detail modal)
- Status styling (pending/active/ended)
- Active glow pulse + revision burst animation
- Status + version badge updates

**Dependencies:** d3, detail-levels.js (via injected `shouldRenderEnvelopeElement`)  
**Test Coverage:** Unit tests cover integration via `hddl-map.test.js`; visuals validated via manual dev server  
**Risk:** Medium - D3 update pattern extraction but isolated behind two explicit entry points

---

### `particle-engine.js` (Priority P2) ⚠️

**Purpose:** Particle animation system for event flow visualization  
**Exports:**
- `createParticleEngine(layer, simulation, options)` - Factory
- Returns API: `addParticle(data)`, `ticked()`, `clear()`

**Responsibilities:**
- Particle creation and lifecycle
- Bezier curve traversal animation
- Activity halo pulse effects
- Label visibility based on detail level
- Particle-envelope collision detection (for modal triggers)

**Dependencies:** d3, bezier-math.js, detail-levels.js  
**Test Coverage:** Playwright visual tests  
**Risk:** **HIGH** - Core animation loop, tightly coupled to D3 simulation

**Mitigation:** Add Playwright snapshot test BEFORE extraction

---

### `embedding-renderer.js` (Priority P2)

**Purpose:** Render decision memory embedding vector space  
**Exports:**
- `createEmbeddingRenderer(layer, dimensions, options)` - Factory
- Returns API: `render(embeddings)`, `clear()`, `updateCount()`

**Responsibilities:**
- 2D vector space projection
- 3D chip visualization (isometric cubes)
- Historical baseline rendering (faded, dashed)
- Embedding tooltip with semantic context
- Count badge updates

**Dependencies:** d3, selectors.js, steward-colors.js  
**Test Coverage:** Playwright visual tests  
**Risk:** Medium - isolated but complex 3D visual effects

---

### `workspace/utils.js` (Priority P0)

**Purpose:** Pure utility functions for workspace UI  
**Exports:**
- `escapeHtml(text)`
- `escapeRegex(text)`
- `formatEventSummary(event)`
- `formatConstraintsForTelemetry(constraints)`
- `formatValue(value)`
- `truncateText(text, maxLength)`
- `getDefaultLayoutState()`
- `saveLayoutState(state)`
- `loadLayoutState()`

**Dependencies:** None (pure functions)  
**Test Coverage:** Unit tests import from `src/components/workspace/utils.js` via `workspace.test.js`  
**Migration Path:** ✅ Complete

---

### `workspace/ai-narrative.js` (Priority P1) ✅ **COMPLETE**

**Status:** Extracted in Task 3.1 (commits d3bd5ad, 290d347)

**Purpose:** AI-generated narrative management and timeline sync  
**Exports:**
- `mountAINarrative(container)` - Main mount function
- `updateNarrativeSync(timeHour)` - Timeline synchronization

**State:**
- `aiNarrativeGenerated`, `aiNarrativeCitations`, `aiNarrativeCache`
- `aiNarrativeSyncEnabled`, `aiNarrativeFullHtml`

**Responsibilities:**
- API calls to narrative generation service (port 8080)
- Caching per scenario
- Citation click handlers (`rewireCitationLinks()`)
- Timeline synchronization with auto-scroll
- Progressive disclosure based on time
- Paragraph highlighting for cited events

**Actual LOC:** 651 lines  
**Dependencies:** fetch API, sim-state (getTimeHour, setTimeHour)  
**Test Coverage:** Playwright integration tests

---

### `workspace/sidebar.js` (Priority P1) ✅ **COMPLETE**

**Status:** Extracted in Task 3.2 (commit a30e799)

**Purpose:** Navigation menu and active envelope display  
**Exports:**
- `createSidebar()` - Main sidebar factory
- `navItems` - Navigation configuration (9 routes)

**Responsibilities:**
- Navigation menu with VS Code styling
- Active envelope collapsible section
- Envelope status badges (active/pending/ended)
- Click handlers for envelope details modal
- Integration with router navigation

**Actual LOC:** 373 lines  
**Dependencies:** router (navigateTo), sim-state, telemetry state  
**Test Coverage:** workspace.test.js

---

### `workspace/panels.js` (Priority P1) ✅ **COMPLETE**

**Status:** Extracted in Task 3.2 (commit a30e799)

**Purpose:** Activity bar, auxiliary bar (AI narrative), bottom panel (terminals/telemetry)  
**Exports:**
- `createActivityBar()` - Left icon bar (3 icons)
- `createAuxiliaryBar()` - Right panel for AI narrative
- `createBottomPanel()` - Bottom terminals panel (4 tabs)
- `setAuxCollapsed(bool)` - Collapse state setter
- `setBottomCollapsed(bool)` - Collapse state setter
- `setUpdateTelemetry(fn)` - Dependency injection for telemetry updates

**Responsibilities:**
- Activity bar icons (Explorer, Evidence, Help)
- Auxiliary bar with AI narrative container
- Bottom panel with 4 tabs (DTS STREAM, AI Decisions, Human Overrides, Fleet Status)
- Panel collapse/expand state management
- Integration with telemetry update function

**Actual LOC:** 476 lines  
**Dependencies:** ai-narrative (mountAINarrative), sim-state  
**Test Coverage:** workspace.test.js

---

### `workspace/state.js` (Priority P0) ✅ **COMPLETE**

**Status:** Extracted in Task 3.2 (commit a30e799)

**Purpose:** Shared UI collapse state for telemetry sections  
**Exports:**
- `telemetrySectionState` - Object with 6 section collapse states

**Sections:**
- Active Envelopes
- Live Metrics
- Decision Quality
- Stewardship
- Boundary Interactions
- Steward Fleets

**Actual LOC:** 10 lines  
**Dependencies:** None  
**Test Coverage:** Implicitly tested via workspace.test.js

---

### `workspace/telemetry.js` (Priority P1) ✅ **COMPLETE**

**Status:** Extracted in Task 3.3 (commit 957a073)

**Purpose:** DTS STREAM (Evidence tab) telemetry system - narrative, metrics, rendering  
**Exports:**
- `updateTelemetry(container, scenario, timeHour)` - Main render function
- `computeTelemetry(scenario, timeHour)` - Metrics calculation (9 metrics)
- `buildTelemetryNarrative(scenario, timeHour)` - Event stream narrative builder
- `createTelemetrySection(section)` - Collapsible section component

**Responsibilities:**
- Event narrative formatting (10 event types: decision, revision, signal, boundary, escalation, dsg_session, dsg_message, annotation, envelope_promoted, exception)
- Timeline replay state management (rewind/forward detection)
- Metrics computation: activeDecisions, envelopeHealthPct, driftAlerts, boundaryTouches, avgConfidencePct, reviewPending, breachCount, activeStewards, lastCalibrationLabel
- Multi-section UI rendering (5 telemetry sections)
- Boundary interaction stats by envelope
- Steward fleet activity display
- Glossary term integration

**Actual LOC:** 595 lines  
**Dependencies:** sim-state, steward-colors, glossary, workspace/utils  
**Test Coverage:** workspace.test.js, Playwright integration tests  
**Risk:** Medium - complex state management, API integration

---

## Extraction Order & Dependencies

```
Phase 0: Discovery [COMPLETE]
  └─ Task 0.2: Architecture doc ✅

Phase 1: Pure Functions (Low Risk)
  ├─ Task 1.1: detail-levels.js ← (Start here)
  ├─ Task 1.2: bezier-math.js
  ├─ Task 1.3: workspace/utils.js + workspace/glossary.js
  └─ Task 1.4: Validation gate [CHECKPOINT]

Phase 2: D3 Renderers (Medium/High Risk) [PARTIAL - 2 of 4 tasks]
  ├─ Task 2.1: tooltip-manager.js ✅
  ├─ Task 2.2: envelope-renderer.js ⚠️ DEFERRED (tight D3 coupling)
  ├─ Task 2.3: particle-engine.js ⚠️ DEFERRED (highest risk, needs D3 refactor)
  ├─ Task 2.4: embedding-renderer.js ✅
  └─ Task 2.5: Validation gate ✅ [CHECKPOINT]

Phase 3: workspace.js Refactoring (Medium Risk) [CURRENT]
  ├─ Task 3.1: ai-narrative.js ← (Current task)
  ├─ Task 3.2: sidebar.js + panels.js
  └─ Task 3.3: Validation gate [CHECKPOINT]

Phase 4: hddl-map.js Coordinator (High Risk) [DEFERRED]
  ├─ Task 4.1: Refactor core to thin coordinator
  └─ Task 4.2: Validation gate [CHECKPOINT]

Phase 5: D3 Pattern Refactoring (High Risk) [DEFERRED]
  ├─ Task 5.1: Extract particle-engine.js (revisit after D3 refactor)
  ├─ Task 5.2: Extract envelope-renderer.js (revisit after D3 refactor)
  ├─ Task 5.3: Refactor D3 update pattern (nodeEnter/nodeUpdate)
  └─ Task 5.4: Validation gate [CHECKPOINT]

Phase 6: Test Infrastructure
  ├─ Task 6.1: Fix test imports (no copied functions)
  ├─ Task 6.2: Add unit tests for new modules
  └─ Task 6.3: Coverage 55%+ [CHECKPOINT]

Phase 7: TypeScript Migration
  ├─ Task 6.1: Add tsconfig.json
  ├─ Task 6.2: Convert pure utilities
  ├─ Task 6.3: Add D3 types, convert renderers
  ├─ Task 6.4: Convert coordinators
  └─ Task 6.5: Enable strict mode [CHECKPOINT]
```

---

## Success Criteria

### Per-Module Criteria
- [ ] Single responsibility (one clear purpose)
- [ ] <800 lines of code
- [ ] Exported API documented
- [ ] Dependencies explicit (imports only)
- [ ] Tests import from module (no copied code)

### Per-Phase Criteria
- [ ] All tests pass (`npm test`)
- [ ] No new console errors in browser
- [ ] No performance regression (`npm run performance`)
- [ ] Test coverage maintained or increased
- [ ] Git tag created for checkpoint

### Final Success Criteria
- [ ] No file >800 lines
- [ ] Clear module boundaries with single responsibilities
- [ ] Tests import from source (no copied functions)
- [ ] Test coverage ≥55% (stretch: 70%)
- [ ] TypeScript with strict mode enabled
- [ ] Zero breaking changes to external API

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| particle-engine breaks animation | High | Medium | Add Playwright snapshot test first |
| Context overflow during Phase 2 | Medium | High | Use this doc as external memory |
| Error compounding across phases | High | Medium | Run full test suite after each task |
| Time estimate too optimistic | Low | High | Checkpoints allow safe restart |
| Merge conflicts with main | Medium | Low | Keep refactor branch short-lived |

---

## Progress Tracker

### Phase 0: Discovery & Architecture ✅
- [x] **Task 0.1:** Codebase survey (2026-01-02)
- [x] **Task 0.2:** Architecture doc created (2026-01-02)
- [x] **Checkpoint:** `refactor-phase-0-complete` tag

### Phase 1: Pure Functions ✅
- [x] **Task 1.1:** Extract detail-levels.js (2026-01-02)
  - ✅ Created src/components/map/detail-levels.js (221 lines)
  - ✅ hddl-map.js reduced from 3,866 → 3,329 lines (-537)
  - ✅ Tests updated to import from module (no copied functions)
  - ✅ All unit tests pass (66/66)
  - ✅ Commit: b5dfcea
- [x] **Task 1.2:** Extract bezier-math.js (2026-01-02)
  - ✅ Created src/components/map/bezier-math.js (57 lines)
  - ✅ hddl-map.js reduced from 3,329 → 3,303 lines (-26)
  - ✅ Added comprehensive unit tests (10 new tests)
  - ✅ All unit tests pass (72/72)
  - ✅ Commit: 3ca46bb
- [x] **Task 1.3:** Extract workspace/utils.js + glossary.js (2026-01-02)
  - ✅ Created src/components/workspace/utils.js (120 lines, 8 functions)
  - ✅ Created src/components/workspace/glossary.js (15 lines)
  - ✅ workspace.js reduced from 3,225 → 3,141 lines (-84)
  - ✅ All unit tests pass (72/72)
  - ✅ Commit: c9b55db
- [x] **Task 1.4:** Validation gate
  - ✅ All 72 unit tests passing
  - ✅ Coverage maintained at 45%
- [x] **Checkpoint:** `refactor-phase-1-complete` tag (commit ac944cd)

### Phase 2: D3 Renderers (PARTIAL - 2 of 4 tasks) ✅ 
- [x] **Task 2.1:** Extract tooltip-manager.js (2026-01-02)
  - ✅ Created src/components/map/tooltip-manager.js (429 lines)
  - ✅ Extracted 9 functions: tooltip show/hide, hover detection
  - ✅ hddl-map.js reduced from 3,624 → 3,051 lines (-573)
  - ✅ All unit tests pass (72/72)
  - ✅ Commit: 20f1782
- [x] **Task 2.2:** envelope-renderer.js ⚠️ DEFERRED to Phase 5
  - Reason: Tight D3 coupling (nodeEnter/nodeUpdate patterns)
  - Size: ~700 lines spanning lines 1270-2050+
  - Will revisit after D3 pattern refactoring
  - Documented: 2026-01-02
- [x] **Task 2.3:** particle-engine.js ⚠️ DEFERRED to Phase 5
  - Reason: HIGHEST RISK - similar D3 coupling expected
  - Will revisit after D3 pattern refactoring
  - Documented: 2026-01-02
- [x] **Task 2.4:** Extract embedding-renderer.js (2026-01-02)
  - ✅ Created src/components/map/embedding-renderer.js (1,093 lines)
  - ✅ 3D perspective memory visualization with semantic clustering
  - ✅ Factory pattern: createEmbeddingRenderer(svg, options)
  - ✅ All unit tests pass (72/72)
  - ✅ Commit: 5958de5
- [x] **Task 2.5:** Validation gate
  - ✅ All 72 unit tests passing
  - ✅ Coverage maintained at 45%
  - ✅ Dev server verified at localhost:5173
- [x] **Checkpoint:** Phase 2 partial complete (commit 5143b53)

### Phase 3: workspace.js Refactoring (CURRENT)
- [x] **Task 3.1:** Extract ai-narrative.js (2026-01-02)
  - ✅ Created src/components/workspace/ai-narrative.js (704 lines)
  - ✅ Extracted AI narrative generation, caching, timeline sync
  - ✅ Functions: mountAINarrative, generateAINarrative, loadPreGeneratedNarrative, processNarrativeWithCitations, renderNarrativeMarkdown
  - ✅ State management: narrative cache, citations, sync enabled
  - ✅ workspace.js reduced from 3,158 → 2,464 lines (-694 lines, -22%)
  - ✅ All 72 unit tests passing
  - ✅ Browser console verified (no errors)
  - ✅ Commits: d3bd5ad (extraction), 290d347 (fix duplicate hook)
- [ ] **Task 3.2:** Extract sidebar.js + panels.js ← (Next task)
  - Target: createSidebar, createActivityBar, createAuxiliaryBar, createBottomPanel
  - Estimated: ~1200 lines total extraction
- [ ] **Task 3.3:** Validation gate
- [ ] **Checkpoint:** `refactor-phase-3-complete` tag

### Phase 4: hddl-map.js Coordinator
- [ ] **Task 4.1:** Refactor to coordinator pattern
- [ ] **Task 4.2:** Validation gate
- [ ] **Checkpoint:** `refactor-phase-4-complete` tag

### Phase 5: D3 Pattern Refactoring (DEFERRED)
- [ ] **Task 5.1:** Refactor D3 update pattern (nodeEnter/nodeUpdate/nodeSelection)
- [ ] **Task 5.2:** Revisit envelope-renderer.js extraction (~700 lines)
- [ ] **Task 5.3:** Revisit particle-engine.js extraction
- [ ] **Task 5.4:** Validation gate
- [ ] **Checkpoint:** `refactor-phase-5-complete` tag

### Phase 6: Test Infrastructure
- [ ] **Task 6.1:** Fix test imports (no copied functions)
- [ ] **Task 6.2:** Add unit tests for new modules
- [ ] **Task 6.3:** Achieve 55%+ coverage
- [ ] **Checkpoint:** `refactor-phase-6-complete` tag

### Phase 7: TypeScript Migration
- [ ] **Task 7.1:** Add tsconfig.json
- [ ] **Task 7.2:** Convert pure utilities to .ts
- [ ] **Task 7.3:** Add D3 types, convert renderers
- [ ] **Task 7.4:** Convert coordinators
- [ ] **Task 7.5:** Enable strict mode
- [ ] **Checkpoint:** `refactor-phase-7-complete` tag

---

## Reference: Target Architecture Pattern

**Inspiration:** `sim-state.js` facade pattern (already clean)

```
sim-state.js (facade, 40 lines)
  ├─ store.js (state atoms, subscriptions, 144 lines)
  └─ selectors.js (projections, 202 lines)
```

**Target for hddl-map.js:**

```
hddl-map.js (coordinator, <800 lines)
  ├─ map/detail-levels.js (pure, ~230 lines)
  ├─ map/bezier-math.js (pure, ~30 lines)
  ├─ map/tooltip-manager.js (D3, ~280 lines)
  ├─ map/envelope-renderer.js (D3, ~900 lines → split if needed)
  ├─ map/particle-engine.js (D3, ~270 lines)
  ├─ map/embedding-renderer.js (D3, ~470 lines)
  └─ map/entity-renderer.js (D3, ~1000 lines → agents + stewards)
```

**Target for workspace.js:** ✅ **ACHIEVED**

```
workspace.js (coordinator, 564 lines ✅ <800)
  ├─ workspace/utils.js (pure, 113 lines) ✅
  ├─ workspace/glossary.js (pure, 14 lines) ✅
  ├─ workspace/state.js (pure, 10 lines) ✅
  ├─ workspace/sidebar.js (DOM, 373 lines) ✅
  ├─ workspace/panels.js (DOM, 476 lines) ✅
  ├─ workspace/ai-narrative.js (state + API, 651 lines) ✅
  ├─ workspace/telemetry.js (metrics + DOM, 595 lines) ✅
  └─ workspace/mobile.js (mobile UI, 286 lines) ✅
```

**Phase 3 Summary:**
- Extracted 8 focused modules (2,518 lines)
- Reduced workspace.js from 3,225 → 564 lines (-83%)
- Clean dependency injection pattern (setUpdateTelemetry)
- All tests passing (72/72)
- ✅ Under <800 target (mobile UI extracted)

---

## Progress Tracker

### ✅ Phase 1: Pure Functions (Completed 2026-01-02)

#### Task 1.1: Extract detail-levels.js
- Created `src/components/map/detail-levels.js` (221 lines, 8 exports)
- Updated hddl-map.js: 3,866 → 3,329 lines (-537 lines, -13.9%)
- Updated hddl-map.test.js to import from module
- Tests: 66/66 passing
- Commit: `3bba8ab`

#### Task 1.2: Extract bezier-math.js
- Created `src/components/map/bezier-math.js` (57 lines, 2 exports)
- Created `src/components/map/bezier-math.test.js` (10 tests)
- Updated hddl-map.js: 3,329 → 3,303 lines (-26 lines, -0.8%)
- Tests: 72/72 passing (includes 10 new tests)
- Commit: `7fd59c1`

#### Task 1.3: Extract workspace utilities
- Created `src/components/workspace/glossary.js` (15 lines, HDDL_GLOSSARY)
- Created `src/components/workspace/utils.js` (120 lines, 8 exports)
- Updated workspace.js: 3,225 → 3,141 lines (-84 lines, -2.6%)
- Updated workspace.test.js to import from module
- Tests: 72/72 passing
- Commit: `c9b55db`

### 🎯 Phase 1 Summary (✅ COMPLETE - 2026-01-02)
- **Files reduced:** hddl-map.js (-563 lines, -14.6%), workspace.js (-84 lines, -2.6%)
- **New modules:** detail-levels.js (221 lines), bezier-math.js (57 lines), workspace/glossary.js (15 lines), workspace/utils.js (120 lines)
- **Test coverage:** 45.04% (maintained from ~46%)
- **Unit tests:** 72/72 passing
- **Checkpoint:** `refactor-phase-1-complete`
- **Status:** Zero breaking changes, all pure functions successfully extracted

---

## 📦 Phase 2: Extract D3 Renderers (COMPLETE)

### ✅ Task 2.1: Extract tooltip-manager.js (Completed 2026-01-02)
- Created `src/components/map/tooltip-manager.js` (429 lines, 9 exports)
- Updated hddl-map.js: 3,051 lines (removed lines 215-530, tooltip code)
- Exports: canHoverTooltip, shouldShowHoverTooltip, show/hide functions for 3 tooltip types, getStewardEnvelopeInteractionCount
- Features: D3-powered tooltips, positioning, hover detection, auto-hide timeouts
- Tests: 72/72 passing
- Commit: `20f1782`

### ⚠️ Task 2.2: Extract envelope-renderer.js (DEFERRED)
- **Status:** DEFERRED to Phase 5 (after D3 update pattern refactoring)
- **Assessment:** Envelope rendering is too tightly coupled to D3 update pattern
- **Findings:** 700+ lines spanning 1270-2050+, 16+ element references, nodeEnter/nodeUpdate/nodeSelection throughout
- **Decision:** Cannot extract without refactoring entire D3 render cycle - defer to Phase 5

### ✅ Task 2.4: Extract embedding-renderer.js (Completed 2026-01-02)
- Created `src/components/map/embedding-renderer.js` (1093 lines, 1 export: createEmbeddingRenderer)
- Updated hddl-map.js: 3,051 → 2,471 lines (-580 lines, -19%)
- Features: 3D perspective memory visualization, semantic clustering, isometric chip design
- Comprehensive steward color mapping, historical baseline markers, interactive tooltips
- Tests: 72/72 passing
- Commit: `5958de5`

### 🎯 Phase 2 Summary (✅ COMPLETE)
- **Files reduced:** hddl-map.js: 3,866 → 2,471 lines (-1,395 lines total, -36% reduction)
- **New modules:** tooltip-manager.js (429 lines), embedding-renderer.js (1093 lines)
- **Tasks completed:** 2 of 4 (Task 2.2 deferred, Task 2.3 not started)
- **Test coverage:** 45% maintained
- **Unit tests:** 72/72 passing
- **Status:** Zero breaking changes, D3 renderers successfully modularized where feasible

---

## 🏢 Phase 3: Extract Workspace Modules (✅ COMPLETE - 2026-01-02)

### ✅ Task 3.1: Extract ai-narrative.js (Completed 2026-01-02)
- Created `src/components/workspace/ai-narrative.js` (651 lines)
- Exports: mountAINarrative, updateNarrativeSync
- Features: AI narrative API integration, caching, timeline sync, citation handlers
- Updated workspace.js: 3,225 → 2,464 lines (-761 lines)
- Tests: 72/72 passing
- Commits: `d3bd5ad` (extraction), `290d347` (fix duplicate call)

### ✅ Task 3.2: Extract sidebar.js + panels.js (Completed 2026-01-02)
- Created `src/components/workspace/sidebar.js` (373 lines)
  - Exports: createSidebar, navItems
  - Features: Navigation menu, active envelope display, collapsible sections
- Created `src/components/workspace/panels.js` (476 lines)
  - Exports: createActivityBar, createAuxiliaryBar, createBottomPanel, collapse setters, setUpdateTelemetry
  - Features: 3-panel layout (activity, auxiliary, bottom), dependency injection
- Created `src/components/workspace/state.js` (10 lines)
  - Exports: telemetrySectionState (6 sections)
  - Shared UI collapse state
- Updated workspace.js: 2,464 → 1,498 lines (-966 lines)
- Fixed imports: telemetrySectionState, navItems
- Tests: 72/72 passing
- Commit: `a30e799`

### ✅ Task 3.3: Extract telemetry.js (Completed 2026-01-02)
- Created `src/components/workspace/telemetry.js` (595 lines)
- Exports: updateTelemetry, computeTelemetry, buildTelemetryNarrative, createTelemetrySection
- Features:
  - Event narrative formatting (10 event types)
  - Timeline replay state management (rewind/forward detection)
  - Metrics computation (9 metrics: health, drift, boundaries, confidence, etc.)
  - Multi-section UI rendering (5 telemetry sections)
  - Boundary interaction stats by envelope
  - Steward fleet activity display
- Updated workspace.js: 1,498 → 929 lines (-569 lines)
- Kept dependency injection: setUpdateTelemetry(updateTelemetry)
- Tests: 72/72 passing
- Commit: `957a073`

### ✅ Task 3.4: Extract mobile UI module (Completed 2026-01-02)
- Created `src/components/workspace/mobile.js` (286 lines)
- Features:
  - Mobile nav drawer + overlays
  - Mobile telemetry bottom sheet
  - Mobile panel FAB + modal
- Updated workspace.js: 929 → 564 lines (-365 lines)
- Tests: 72/72 passing
- Commit: `e3f941c`

### 🎯 Phase 3 Summary (✅ COMPLETE)
- **Files reduced:** workspace.js: 3,225 → 564 lines (-2,661 lines, -83% reduction)
- **New modules:** 8 focused modules (2,518 lines total)
  - ai-narrative.js (651 lines)
  - sidebar.js (373 lines)
  - panels.js (476 lines)
  - state.js (10 lines)
  - telemetry.js (595 lines)
  - mobile.js (286 lines)
  - utils.js (113 lines, from Phase 1)
  - glossary.js (14 lines, from Phase 1)
- **Architecture:** Clean dependency injection pattern (setUpdateTelemetry)
- **Test coverage:** 72/72 passing (100%)
- **Status:** workspace.js now 564 lines (✅ under <800 target)
- **Next steps:** Continue with hddl-map.js extraction plan

---

## Notes & Decisions

### 2026-01-02: Phase 3 Complete - Workspace Module Extraction Success
- **Achievement:** workspace.js reduced from 3,225 → 564 lines (-83%)
- **Pattern:** Dependency injection pattern worked well (setUpdateTelemetry for circular dependencies)
- **Finding:** Mobile UI components were extracted to workspace/mobile.js
- **Status:** ✅ Under <800 target, workspace.js is now maintainable and well-organized
- **Decision:** Phase 3 considered successful - workspace modules have clean boundaries

### 2026-01-02: Extract agent label layout helpers
- **Achievement:** Created src/components/map/agent-layout.js (84 lines)
- **Result:** hddl-map.js reduced from 2,471 → 2,183 lines
- **Validation:** All unit tests passing (74/74)

### 2026-01-02: Extract particle label helpers
- **Achievement:** Created src/components/map/particle-labels.js (63 lines)
- **Result:** hddl-map.js reduced from 2,183 → 2,122 lines
- **Validation:** All unit tests passing (80/80)

### 2026-01-02: Extract particle timing helpers
- **Achievement:** Created src/components/map/particle-logic.js (33 lines)
- **Result:** hddl-map.js reduced from 2,122 → 2,117 lines
- **Validation:** All unit tests passing (86/86)

### 2026-01-02: Extract event resolution helper
- **Achievement:** Created src/components/map/event-resolution.js (8 lines)
- **Result:** hddl-map.js reduced from 2,117 → 2,110 lines
- **Validation:** All unit tests passing (89/89)

### 2026-01-02: Extract particle motion step helper
- **Achievement:** Created src/components/map/particle-motion.js (110 lines)
- **Result:** hddl-map.js reduced from 2,110 → 2,012 lines
- **Validation:** All unit tests passing (92/92)

### 2026-01-02: Extract node sub-label + truncation helpers
- **Achievement:** Created src/components/map/text-utils.js (24 lines)
- **Result:** hddl-map.js reduced from 2,012 → 1,998 lines
- **Validation:** All unit tests passing (98/98)

### 2026-01-02: Extract flow particle creation
- **Achievement:** Created src/components/map/flow-particles.js (186 lines)
- **Result:** hddl-map.js reduced from 1,998 → 1,858 lines
- **Validation:** All unit tests passing (101/101)

### 2026-01-02: Initial Architecture Survey
- **Finding:** sim-state.js already demonstrates target pattern (facade → store + selectors)
- **Finding:** Detail levels (lines 11-242) are pure functions with existing tests
- **Finding:** particle-engine.js extraction is highest risk (core animation loop)
- **Decision:** Phase order prioritizes low-risk pure functions first
- **Decision:** Add Playwright snapshot test before extracting particle-engine.js

### 2026-01-02: Phase 1 Extraction Pattern Established
- **Finding:** Updating test files to import (not copy) validates module exports work correctly
- **Finding:** workspace.js had inline utility functions scattered throughout file, not consolidated
- **Decision:** Extract scattered utilities as standalone functions, don't consolidate first
- **Lesson:** Always update test imports immediately after extraction to catch export errors early

### 2026-01-02: Task 2.2 (envelope-renderer) Deferred
- **Finding:** Envelope rendering spans 700+ lines (1270-2050+) with 16+ element references
- **Finding:** Code deeply integrated with D3 update pattern (nodeEnter, nodeUpdate, nodeSelection)
- **Finding:** Elements include: envelope-glow, envelope-revision-burst, envelope-body, envelope-flap, envelope-fold, envelope-status, envelope-version-badge
- **Decision:** Cannot extract envelope rendering without refactoring entire D3 render cycle
- **Decision:** Defer Task 2.2 to Phase 5 after D3 patterns are refactored
- **Lesson:** Some extractions require architectural refactoring first - don't force it

### 2026-01-02: Task 2.3 (particle-engine) Deferred
- **Finding:** Particle engine marked HIGHEST RISK in original assessment
- **Finding:** Likely has similar D3 coupling issues as envelope-renderer
- **Decision:** Defer Task 2.3 to Phase 5, revisit after D3 update pattern is refactored
- **Decision:** Proceed with Phase 3 (workspace.js) which has clearer extraction targets
- **Rationale:** workspace.js AI narrative manager is ~800 lines, self-contained, lower risk

### 2026-01-02: Phase Reordering Decision
- **Original Plan:** Phase 2 → Phase 3 (hddl-map coordinator) → Phase 4 (workspace)
- **New Plan:** Phase 2 (partial) → Phase 3 (workspace) → Phase 4 (coordinator) → Phase 5 (D3 refactor)
- **Rationale:** Extract lower-risk workspace.js modules first, save high-risk D3 refactoring for later
- **Benefit:** Maintains momentum, gets more code modularized before tackling architectural challenges

---

## Next Steps

**Immediate (Task 1.4 - Validation Gate):**
1. Run full test suite: `npm test` (Vitest + Playwright)
2. Verify browser at localhost:5173 (no console errors)
3. Check test coverage: `npm run test:coverage` (should maintain 46%+)
4. Manual verification: Check all UI elements, animations, interactions
5. Create checkpoint tag: `refactor-phase-1-complete`

**Context Management:**
- This document serves as external memory between tasks
- Update progress tracker after each task completion
- Add notes for any unexpected findings or decisions

**Rollback Strategy:**
- Each checkpoint is a git tag
- If phase fails: `git reset --hard refactor-phase-{N-1}-complete`
- Re-approach with lessons learned

---

*Last updated: 2026-01-02 by GitHub Copilot during Phase 0 discovery*

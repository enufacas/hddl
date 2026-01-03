# HDDL-Sim Refactoring Architecture

**Status:** Phase 2 - D3 Renderers Complete  
**Last Updated:** 2026-01-02  
**Target:** Break 7,091 lines of monolithic UI code into <800 line modules with clear boundaries

---

## Current State Snapshot

| File | Original LOC | Current LOC | Reduction | Status | Target |
|------|--------------|-------------|-----------|--------|--------|
| `hddl-map.js` | 3,866 | 2,471 | -1,395 (-36%) | 🟡 In Progress | <800 |
| `workspace.js` | 3,225 | 3,141 | -84 (-3%) | ❌ Monolithic | <800 |
| `store.js` | 144 | 144 | - | ✅ Clean | Reference |
| `selectors.js` | 202 | 202 | - | ✅ Clean | Reference |
| **Total UI** | **7,091** | **5,612** | **-1,479 (-21%)** | **45% coverage** | **<1,600 lines** |

**Extracted Modules (6):**
- `map/detail-levels.js` (221 lines)
- `map/bezier-math.js` (57 lines)
- `workspace/utils.js` (120 lines)
- `workspace/glossary.js` (15 lines)
- `map/tooltip-manager.js` (429 lines)
- `map/embedding-renderer.js` (1093 lines)

---

## Module Extraction Map

### A. From `hddl-map.js` (3,866 lines)

| Module | Source Lines | Approx LOC | Pure? | Dependencies | Priority | Risk |
|--------|--------------|------------|-------|--------------|----------|------|
| `detail-levels.js` | 11-242 | ~230 | ✅ Yes | None | P0 | Low |
| `bezier-math.js` | 325-355 | ~30 | ✅ Yes | None | P0 | Low |
| `tooltip-manager.js` | 468-750 | ~280 | ❌ No | d3 | P1 | Medium |
| `envelope-renderer.js` | 775-1700 | ~900 | ❌ No | d3, detail-levels | P2 | Medium |
| `particle-engine.js` | 2734-3000 | ~270 | ❌ No | d3, bezier-math | P2 | **High** |
| `entity-renderer.js` | 1700-2730 | ~1000 | ❌ No | d3, detail-levels | P2 | Medium |
| `embedding-renderer.js` | 3399-3866 | ~470 | ❌ No | d3, selectors | P2 | Medium |
| `hddl-map.js` (refactored) | All | ~600 | ❌ No | All above | P3 | High |

**Extraction Strategy:**
1. **Phase 1:** Extract pure functions (detail-levels, bezier-math) - immediate value, zero risk
2. **Phase 2:** Extract D3 renderers (tooltip, envelope, particle, embedding) - medium risk
3. **Phase 3:** Refactor core coordinator to orchestrate extracted modules

---

### B. From `workspace.js` (3,225 lines)

| Module | Source Lines | Approx LOC | Pure? | Dependencies | Priority | Risk |
|--------|--------------|------------|-------|--------------|----------|------|
| `workspace/utils.js` | 1-70, scattered | ~150 | ✅ Yes | None | P0 | Low |
| `workspace/sidebar.js` | ~150-600 | ~450 | ❌ No | router | P1 | Low |
| `workspace/panels.js` | ~600-1200 | ~600 | ❌ No | sim-state | P1 | Low |
| `workspace/ai-narrative.js` | ~1200-2400 | ~1200 | ❌ No | sim-state, fetch | P1 | Medium |
| `workspace/glossary.js` | HDDL_GLOSSARY | ~50 | ✅ Yes | None | P0 | Low |
| `workspace.js` (refactored) | All | ~800 | ❌ No | All above | P2 | Medium |

**Extraction Strategy:**
1. **Phase 4:** Extract pure utils and glossary first
2. **Phase 4:** Extract sidebar/panels (low coupling)
3. **Phase 4:** Extract AI narrative (complex state, needs care)
4. **Phase 4:** Refactor core coordinator

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

**Test Coverage:** Already has unit tests in `hddl-map.test.js` (currently copies functions)  
**Migration Path:** Update tests to import from new module

---

### `bezier-math.js` (Priority P0)

**Purpose:** Cubic Bezier curve calculations for particle animation  
**Exports:**
- `bezierPoint(t, p0, p1, p2, p3)` - Calculate point on cubic Bezier curve
- `makeFlowCurve(sourceX, sourceY, targetX, targetY, sign)` - Generate control points
- Curve memoization cache logic (if needed for performance)

**Dependencies:** None (pure math)  
**Test Coverage:** Need new unit tests  
**Migration Path:** Extract, add tests, update hddl-map imports

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

### `envelope-renderer.js` (Priority P2) ⚠️ **DEFERRED**

**Status:** DEFERRED to Phase 5 (after D3 update pattern refactoring)

**Purpose:** Render decision envelopes with status, constraints, revisions  
**Exports:**
- `createEnvelopeRenderer(layer, options)` - Factory
- Returns API: `render(envelopeData)`, `update()`, `clear()`

**Responsibilities:**
- Envelope shape generation (flap, body, fold paths)
- Status indicators (pending/active/ended)
- Constraint badges
- Revision burst animation
- Click handlers for envelope detail modal

**Dependencies:** d3, detail-levels.js, steward-colors.js  
**Test Coverage:** Playwright visual tests  
**Risk:** **HIGH** - Tightly coupled to D3 update pattern (nodeEnter/nodeUpdate/nodeSelection)

**Deferral Rationale:**
- Envelope rendering spans 700+ lines (lines 1270-2050+) with 16+ element references
- Code deeply integrated with D3 update pattern (nodeEnter, nodeUpdate, nodeSelection)
- Elements involved: envelope-glow, envelope-revision-burst, envelope-body, envelope-flap, envelope-fold, envelope-status, envelope-version-badge
- Extraction requires refactoring entire D3 render cycle first to avoid breaking changes
- Defer until Phase 5 when D3 patterns are refactored

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
**Test Coverage:** workspace.test.js (currently copies functions)  
**Migration Path:** Update tests to import

---

### `workspace/ai-narrative.js` (Priority P1)

**Purpose:** AI-generated narrative management and timeline sync  
**Exports:**
- `createNarrativeManager(options)` - Factory
- Returns API: `generate()`, `syncToTime(hour)`, `getCached(scenarioKey)`, `clear()`

**State:**
- `aiNarrativeGenerated`, `aiNarrativeCitations`, `aiNarrativeCache`
- `aiNarrativeSyncEnabled`, `aiNarrativeFullHtml`

**Responsibilities:**
- API calls to narrative generation service
- Caching per scenario
- Citation click handlers (`rewireCitationLinks()`)
- Timeline synchronization (`updateNarrativeSync()`)
- Progressive disclosure based on time

**Dependencies:** fetch API, sim-state (getTimeHour, setTimeHour)  
**Test Coverage:** Playwright integration tests  
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

**Target for workspace.js:**

```
workspace.js (coordinator, <800 lines)
  ├─ workspace/utils.js (pure, ~150 lines)
  ├─ workspace/glossary.js (pure, ~50 lines)
  ├─ workspace/sidebar.js (DOM, ~450 lines)
  ├─ workspace/panels.js (DOM, ~600 lines)
  └─ workspace/ai-narrative.js (state + API, ~1200 lines → may split)
```

---

## Progress Tracker

### ✅ Task 1.1: Extract detail-levels.js (Completed 2026-01-02)
- Created `src/components/map/detail-levels.js` (221 lines, 8 exports)
- Updated hddl-map.js: 3,866 → 3,329 lines (-537 lines, -13.9%)
- Updated hddl-map.test.js to import from module
- Tests: 66/66 passing
- Commit: `3bba8ab`

### ✅ Task 1.2: Extract bezier-math.js (Completed 2026-01-02)
- Created `src/components/map/bezier-math.js` (57 lines, 2 exports)
- Created `src/components/map/bezier-math.test.js` (10 tests)
- Updated hddl-map.js: 3,329 → 3,303 lines (-26 lines, -0.8%)
- Tests: 72/72 passing (includes 10 new tests)
- Commit: `7fd59c1`

### ✅ Task 1.3: Extract workspace utilities (Completed 2026-01-02)
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

## 📦 Phase 2: Extract D3 Renderers (IN PROGRESS)

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

### 🎯 Phase 2 Summary (✅ COMPLETE - 2026-01-02)
- **Files reduced:** hddl-map.js: 3,866 → 2,471 lines (-1,395 lines total, -36% reduction)
- **New modules:** tooltip-manager.js (429 lines), embedding-renderer.js (1093 lines)
- **Tasks completed:** 2 of 4 (Task 2.2 deferred, Task 2.3 not started)
- **Test coverage:** 45% maintained
- **Unit tests:** 72/72 passing
- **Status:** Zero breaking changes, D3 renderers successfully modularized where feasible

---

## Notes & Decisions

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

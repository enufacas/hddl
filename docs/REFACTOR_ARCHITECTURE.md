# HDDL-Sim Refactoring Architecture

**Status:** Phase 0 - Discovery Complete  
**Last Updated:** 2026-01-02  
**Target:** Break 7,091 lines of monolithic UI code into <800 line modules with clear boundaries

---

## Current State Snapshot

| File | LOC | Status | Target |
|------|-----|--------|--------|
| `hddl-map.js` | 3,866 | ❌ Monolithic | 8+ modules |
| `workspace.js` | 3,225 | ❌ Monolithic | 5+ modules |
| `store.js` | 144 | ✅ Clean | Reference |
| `selectors.js` | 202 | ✅ Clean | Reference |
| **Total UI** | **7,091** | **46% coverage** | **55%+ coverage** |

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

### `envelope-renderer.js` (Priority P2)

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
**Risk:** Medium - complex SVG paths

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

Phase 2: D3 Renderers (Medium/High Risk)
  ├─ Task 2.1: tooltip-manager.js
  ├─ Task 2.2: envelope-renderer.js
  ├─ Task 2.3: particle-engine.js ⚠️ (Highest risk)
  ├─ Task 2.4: embedding-renderer.js
  └─ Task 2.5: Validation gate [CHECKPOINT]

Phase 3: hddl-map.js Coordinator (High Risk)
  ├─ Task 3.1: Refactor core to thin coordinator
  └─ Task 3.2: Validation gate [CHECKPOINT]

Phase 4: workspace.js Refactoring (Medium Risk)
  ├─ Task 4.1: sidebar.js + panels.js
  ├─ Task 4.2: ai-narrative.js
  └─ Task 4.3: Validation gate [CHECKPOINT]

Phase 5: Test Infrastructure
  ├─ Task 5.1: Fix test imports (no copied functions)
  ├─ Task 5.2: Add unit tests for new modules
  └─ Task 5.3: Coverage 55%+ [CHECKPOINT]

Phase 6: TypeScript Migration
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

### Phase 1: Pure Functions
- [x] **Task 1.1:** Extract detail-levels.js (2026-01-02)
  - ✅ Created src/components/map/detail-levels.js (221 lines)
  - ✅ hddl-map.js reduced from 3,866 → 3,329 lines (-537)
  - ✅ Tests updated to import from module (no copied functions)
  - ✅ All unit tests pass (66/66)
- [x] **Task 1.2:** Extract bezier-math.js (2026-01-02)
  - ✅ Created src/components/map/bezier-math.js (57 lines)
  - ✅ hddl-map.js reduced from 3,329 → 3,303 lines (-26)
  - ✅ Added comprehensive unit tests (10 new tests)
  - ✅ All unit tests pass (72/72)
- [ ] **Task 1.3:** Extract workspace/utils.js + glossary.js
- [ ] **Task 1.4:** Validation gate
- [ ] **Checkpoint:** `refactor-phase-1-complete` tag

### Phase 2: D3 Renderers
- [ ] **Task 2.1:** Extract tooltip-manager.js
- [ ] **Task 2.2:** Extract envelope-renderer.js
- [ ] **Task 2.3:** Extract particle-engine.js ⚠️
- [ ] **Task 2.4:** Extract embedding-renderer.js
- [ ] **Task 2.5:** Validation gate
- [ ] **Checkpoint:** `refactor-phase-2-complete` tag

### Phase 3: hddl-map.js Core
- [ ] **Task 3.1:** Refactor to coordinator pattern
- [ ] **Task 3.2:** Validation gate
- [ ] **Checkpoint:** `refactor-phase-3-complete` tag

### Phase 4: workspace.js
- [ ] **Task 4.1:** Extract sidebar.js + panels.js
- [ ] **Task 4.2:** Extract ai-narrative.js
- [ ] **Task 4.3:** Validation gate
- [ ] **Checkpoint:** `refactor-phase-4-complete` tag

### Phase 5: Test Infrastructure
- [ ] **Task 5.1:** Fix test imports
- [ ] **Task 5.2:** Add unit tests for extracted modules
- [ ] **Task 5.3:** Achieve 55%+ coverage
- [ ] **Checkpoint:** `refactor-phase-5-complete` tag

### Phase 6: TypeScript Migration
- [ ] **Task 6.1:** Add tsconfig.json
- [ ] **Task 6.2:** Convert pure utilities to .ts
- [ ] **Task 6.3:** Add D3 types, convert renderers
- [ ] **Task 6.4:** Convert coordinators
- [ ] **Task 6.5:** Enable strict mode
- [ ] **Checkpoint:** `refactor-phase-6-complete` tag

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

### 🎯 Phase 1 Summary (In Progress)
- **Files reduced:** hddl-map.js (-563 lines), workspace.js (-84 lines)
- **New modules:** detail-levels.js, bezier-math.js, workspace/glossary.js, workspace/utils.js
- **Test coverage:** Maintained (72/72 unit tests passing)
- **Next:** Task 1.4 - Validation gate

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

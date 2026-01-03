# Plan: Sequential Agent Refactoring of HDDL-Sim

A single agent working sequentially changes the approach: context accumulates (good), but errors compound (risky). This plan uses **checkpoints as git tags** for safe rollback, batches similar extractions while patterns are fresh, and validates thoroughly before each phase boundary.

## Problem Statement

The hddl-sim codebase has significant structural debt:
- **hddl-map.js**: 3,866 lines, mostly one giant closure with mixed concerns
- **workspace.js**: 3,225 lines, UI + state + API calls intertwined
- **Test coverage**: 46%, tests copy functions instead of importing them
- **No TypeScript**: No compile-time guardrails

This prevents rapid iteration and confident changes.

## Target Outcome

- No file > 800 lines
- Clear module boundaries with single responsibilities
- Tests import from source (no copied functions)
- Test coverage ≥ 55% (stretch: 70%)
- TypeScript with strict mode enabled
- Safe checkpoint/rollback points throughout

---

## Phase 0: Discovery & Architecture (Read-Only)

### Task 0.1: Codebase Survey
| Field | Value |
|-------|-------|
| **Size** | S |
| **Input** | `hddl-map.js` lines 1-400, `workspace.js` lines 1-200, `sim-state.js` |
| **Output** | Mental model only (no files) |
| **Validation** | Agent can describe the three main concerns in each file |
| **Checkpoint** | No |
| **Dependencies** | None |

**Goal**: Read helper functions and setup code. Understand exports and module boundaries.

### Task 0.2: Identify Extraction Candidates
| Field | Value |
|-------|-------|
| **Size** | M |
| **Input** | `hddl-map.js` full file, `workspace.js` full file |
| **Output** | `docs/REFACTOR_ARCHITECTURE.md` (living document) |
| **Validation** | Document lists modules, their line ranges, and dependencies |
| **Checkpoint** | ✅ Yes - clean slate, no code changes yet |
| **Dependencies** | 0.1 |

**Goal**: Map the 3,866-line closure into logical modules:
- Detail level helpers (lines 11-242) → `detail-levels.js`
- Tooltip management (lines ~480-600) → `tooltips.js`
- Particle animation (bezier math) → `particle-engine.js`
- Envelope rendering → `envelope-renderer.js`
- Agent/steward rendering → `entity-renderer.js`
- Embedding vector space (lines ~3650-3866) → `embedding-renderer.js`

**Architecture Document Template**:
```markdown
# HDDL-Sim Refactoring Architecture

## Module Map
| Module | Source Lines | LOC | Pure? | Dependencies |
|--------|--------------|-----|-------|--------------|
| detail-levels.js | 11-242 | ~230 | ✅ | None |
| ...

## Extraction Order
1. Pure functions first (testable immediately)
2. D3 renderers second (need integration tests)
3. Stateful components last (highest risk)

## Progress Tracker
- [ ] 0.2: Architecture doc created
- [ ] 1.1: Detail levels extracted
...
```

---

## Phase 1: Extract Pure Functions (Low Risk)

These functions have **no D3 dependencies** and can be unit tested immediately.

### Task 1.1: Extract Detail Level Module
| Field | Value |
|-------|-------|
| **Size** | M |
| **Input** | `hddl-map.js` lines 11-242 |
| **Output** | `src/components/map/detail-levels.js`, updated `hddl-map.js` |
| **Validation** | `npm run test:unit` passes, existing Playwright tests pass |
| **Checkpoint** | ✅ Yes - first code change, validates extraction pattern |
| **Dependencies** | 0.2 |

**Extract**:
- `DETAIL_LEVELS` constant
- `getDetailLevel()`
- `getEnvelopeDimensions()`
- `getAgentDimensions()`
- `getStewardDimensions()`
- `getAdaptiveAgentName()`
- `getAdaptiveEnvelopeName()`
- `shouldShowEnvelopeStatus()`, `shouldShowAgentLabels()`, `shouldShowStewardLabels()`
- `getParticleLabelVisibility()`
- `formatLabelForLevel()`, `truncateLabel()`, `getMaxLabelLength()`
- `shouldShowConstraintBadges()`

**Migration**: Update `hddl-map.test.js` to **import from new module** instead of copying functions.

### Task 1.2: Extract Bezier Math Module
| Field | Value |
|-------|-------|
| **Size** | S |
| **Input** | `hddl-map.js` (search for `bezierPoint`, `getCurvePoint`) |
| **Output** | `src/sim/bezier-math.js` |
| **Validation** | Unit tests for curve calculations |
| **Checkpoint** | No |
| **Dependencies** | 1.1 |

**Extract**:
- `bezierPoint()` function
- `getCurvePoint()` function
- Curve memoization cache logic

### Task 1.3: Extract Workspace Utilities
| Field | Value |
|-------|-------|
| **Size** | S |
| **Input** | `workspace.js`, `workspace.test.js` |
| **Output** | `src/components/workspace/utils.js` |
| **Validation** | Existing workspace tests now import (not copy) |
| **Checkpoint** | ✅ Yes - Pattern established for both major files |
| **Dependencies** | 1.1 |

**Extract**:
- `escapeHtml()`
- `escapeRegex()`
- `formatEventSummary()`
- `formatConstraintsForTelemetry()`
- `formatValue()`
- `truncateText()`
- Layout state functions: `getDefaultLayoutState()`, `saveLayoutState()`, `loadLayoutState()`

### Task 1.4: Phase 1 Validation Gate
| Field | Value |
|-------|-------|
| **Size** | S |
| **Input** | All modified files |
| **Output** | Update `docs/REFACTOR_ARCHITECTURE.md` progress tracker |
| **Validation** | `npm test` passes (all tests), no new console errors in browser |
| **Checkpoint** | ✅ Yes - Phase 1 complete, safe restart point |
| **Dependencies** | 1.1, 1.2, 1.3 |

**Verify**:
- Detail levels work at all breakpoints (400/600/1000px)
- Particle animations still smooth
- No duplicate function definitions

**Git tag**: `refactor-phase-1-complete`

---

## Phase 2: Extract D3 Renderers (Medium Risk)

These have D3 dependencies but are relatively self-contained.

### Task 2.1: Extract Tooltip Manager
| Field | Value |
|-------|-------|
| **Size** | M |
| **Input** | `hddl-map.js` tooltip code |
| **Output** | `src/components/map/tooltip-manager.js` |
| **Validation** | Tooltips appear on hover for agents, envelopes, stewards |
| **Checkpoint** | No |
| **Dependencies** | 1.4 |

**Extract**:
- `createAgentTooltip()`, `updateAgentTooltip()`, `hideAgentTooltip()`
- `createEnvelopeTooltip()`, `updateEnvelopeTooltip()`, `hideEnvelopeTooltip()`
- `createStewardTooltip()`, `updateStewardTooltip()`, `hideStewardTooltip()`
- `showActivityTooltip()`, `hideActivityTooltip()`

**Pattern**: Export a `createTooltipManager()` factory that returns the tooltip API.

### Task 2.2: Extract Envelope Renderer
| Field | Value |
|-------|-------|
| **Size** | L |
| **Input** | `hddl-map.js` envelope creation code |
| **Output** | `src/components/map/envelope-renderer.js` |
| **Validation** | Envelopes render correctly at all detail levels, click opens modal |
| **Checkpoint** | No |
| **Dependencies** | 2.1 |

**Extract**:
- Envelope shape path generation (d3 path for flap, body, fold)
- Status indicator rendering
- Constraint badges
- Revision burst animation
- `getEnvelopeDimensions()` usage (import from detail-levels.js)

### Task 2.3: Extract Particle Engine
| Field | Value |
|-------|-------|
| **Size** | L |
| **Input** | `hddl-map.js` particle/ticked code |
| **Output** | `src/components/map/particle-engine.js` |
| **Validation** | Particles animate along curves, labels visible |
| **Checkpoint** | ✅ Yes - Highest risk extraction done |
| **Dependencies** | 1.2, 2.2 |

**Extract**:
- `ticked()` function
- Particle creation (`createParticle()`)
- Particle lifecycle management
- Curve calculation (uses bezier-math.js)
- Activity halo pulse animation

**⚠️ HIGHEST RISK**: Tightly coupled to D3 simulation tick loop. Consider adding Playwright visual regression test before attempting.

### Task 2.4: Extract Embedding Renderer
| Field | Value |
|-------|-------|
| **Size** | M |
| **Input** | `hddl-map.js` embedding space code |
| **Output** | `src/components/map/embedding-renderer.js` |
| **Validation** | Embedding chips appear in vector space, tooltip on hover |
| **Checkpoint** | No |
| **Dependencies** | 2.1 |

**Extract**:
- `updateEmbeddingSpace()`
- `createEmbeddingTooltip()`
- Embedding icon layer setup
- Embedding count badge

### Task 2.5: Phase 2 Validation Gate
| Field | Value |
|-------|-------|
| **Size** | M |
| **Input** | All modified files |
| **Output** | Update `docs/REFACTOR_ARCHITECTURE.md`, updated test coverage |
| **Validation** | Full test suite, manual browser verification of all visual elements |
| **Checkpoint** | ✅ Yes - All D3 renderers extracted, safe restart |
| **Dependencies** | 2.1, 2.2, 2.3, 2.4 |

**Verify**:
- Run `npm run test:coverage` - coverage should not decrease
- Test all detail levels (resize browser 350px → 1200px)
- Verify particle flow for `insurance-underwriting` scenario
- Check embedding space renders at FULL detail

**Git tag**: `refactor-phase-2-complete`

---

## Phase 3: Refactor hddl-map.js Core (High Risk)

After extractions, `hddl-map.js` should be ~1500 lines. Now simplify the core.

### Task 3.1: Create HDDLMap Coordinator
| Field | Value |
|-------|-------|
| **Size** | L |
| **Input** | Extracted modules, remaining `hddl-map.js` |
| **Output** | Refactored `hddl-map.js` as thin coordinator |
| **Validation** | File under 800 lines, all tests pass |
| **Checkpoint** | No |
| **Dependencies** | 2.5 |

**Transform hddl-map.js**:
```javascript
import { createDetailLevelManager } from './map/detail-levels.js'
import { createTooltipManager } from './map/tooltip-manager.js'
import { createParticleEngine } from './map/particle-engine.js'
import { createEnvelopeRenderer } from './map/envelope-renderer.js'
import { createEmbeddingRenderer } from './map/embedding-renderer.js'

export function createHDDLMap(container, options = {}) {
  // Setup SVG, layers
  // Initialize managers
  // Wire up subscriptions
  // Return cleanup API
}
```

### Task 3.2: Phase 3 Validation Gate
| Field | Value |
|-------|-------|
| **Size** | M |
| **Input** | Refactored `hddl-map.js` |
| **Output** | Final architecture doc update |
| **Validation** | All tests, performance metrics not degraded |
| **Checkpoint** | ✅ Yes - hddl-map.js refactoring complete |
| **Dependencies** | 3.1 |

**Verify**:
- `npm run performance` shows no regression
- `hddl-map.js` < 800 lines
- Each extracted module has clear single responsibility

**Git tag**: `refactor-phase-3-complete`

---

## Phase 4: Workspace.js Refactoring

### Task 4.1: Extract Sidebar Components
| Field | Value |
|-------|-------|
| **Size** | M |
| **Input** | `workspace.js` |
| **Output** | `src/components/workspace/sidebar.js` |
| **Validation** | Sidebar renders, navigation works |
| **Checkpoint** | No |
| **Dependencies** | 3.2 |

**Extract**:
- `createSidebarContent()`
- `updateSidebarContent()`
- `createActivityBar()`
- `updateActivityBar()`
- Navigation item definitions

### Task 4.2: Extract Panel Components
| Field | Value |
|-------|-------|
| **Size** | M |
| **Input** | `workspace.js` |
| **Output** | `src/components/workspace/panels.js` |
| **Validation** | Auxiliary bar and bottom panel function correctly |
| **Checkpoint** | No |
| **Dependencies** | 4.1 |

**Extract**:
- `createAuxiliaryBar()`
- `updateAuxiliaryBar()`
- `createBottomPanel()`
- `updateBottomPanel()`

### Task 4.3: Extract AI Narrative Module
| Field | Value |
|-------|-------|
| **Size** | L |
| **Input** | `workspace.js` AI narrative code |
| **Output** | `src/components/workspace/ai-narrative.js` |
| **Validation** | Narrative generates, syncs with timeline, citations work |
| **Checkpoint** | ✅ Yes - Complex feature isolated |
| **Dependencies** | 4.2 |

**Extract**:
- Narrative state variables (`aiNarrativeGenerated`, `aiNarrativeCitations`, etc.)
- `generateNarrative()`
- `syncNarrativeToTime()`
- API call logic
- Caching per scenario

### Task 4.4: Phase 4 Validation Gate
| Field | Value |
|-------|-------|
| **Size** | M |
| **Input** | Refactored `workspace.js` |
| **Output** | Final architecture doc, coverage report |
| **Validation** | `workspace.js` < 1000 lines, all tests pass |
| **Checkpoint** | ✅ Yes - Refactoring complete |
| **Dependencies** | 4.1, 4.2, 4.3 |

**Git tag**: `refactor-phase-4-complete`

---

## Phase 5: Test Infrastructure Improvements

### Task 5.1: Fix Test Imports
| Field | Value |
|-------|-------|
| **Size** | M |
| **Input** | `hddl-map.test.js`, `workspace.test.js` |
| **Output** | Updated test files importing from source modules |
| **Validation** | No copied function definitions in test files |
| **Checkpoint** | No |
| **Dependencies** | 4.4 |

**Goal**: Tests should **import** functions, not copy them.

### Task 5.2: Add Unit Tests for Extracted Modules
| Field | Value |
|-------|-------|
| **Size** | L |
| **Input** | All new modules in `src/components/map/` and `src/components/workspace/` |
| **Output** | New test files: `*.test.js` for each module |
| **Validation** | Coverage increases from 46% to 55%+ |
| **Checkpoint** | ✅ Yes - Final checkpoint |
| **Dependencies** | 5.1 |

**Priority test targets**:
1. `detail-levels.js` - already has tests, ensure imports work
2. `bezier-math.js` - pure math, easy to test
3. `tooltip-manager.js` - test API shape
4. `particle-engine.js` - test particle creation logic

**Git tag**: `refactor-phase-5-complete`

---

## Phase 6: TypeScript Migration

With clean module boundaries and solid test coverage, TypeScript conversion is now low-risk.

### Task 6.1: Add TypeScript Configuration
| Field | Value |
|-------|-------|
| **Size** | S |
| **Input** | None |
| **Output** | `tsconfig.json`, updated `vite.config.js` |
| **Validation** | `npx tsc --noEmit` passes with `allowJs: true` |
| **Checkpoint** | No |
| **Dependencies** | 5.2 |

**Configure**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": false,
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Task 6.2: Convert Pure Utility Modules
| Field | Value |
|-------|-------|
| **Size** | M |
| **Input** | `detail-levels.js`, `bezier-math.js`, `workspace/utils.js`, `steward-colors.js` |
| **Output** | Same files renamed to `.ts` with type annotations |
| **Validation** | `npx tsc --noEmit` passes, all tests pass |
| **Checkpoint** | ✅ Yes - First TS files working |
| **Dependencies** | 6.1 |

**Priority**: Start with pure functions (no D3 types needed).

### Task 6.3: Add D3 Types and Convert Renderers
| Field | Value |
|-------|-------|
| **Size** | L |
| **Input** | `tooltip-manager.js`, `envelope-renderer.js`, `particle-engine.js`, `embedding-renderer.js` |
| **Output** | Same files as `.ts` with D3 selection types |
| **Validation** | `npx tsc --noEmit` passes, visual tests pass |
| **Checkpoint** | No |
| **Dependencies** | 6.2 |

**Install**: `npm install -D @types/d3`

**Challenge**: D3 selection generics are complex. Use `d3.Selection<SVGGElement, unknown, null, undefined>` patterns.

### Task 6.4: Convert Core Coordinators
| Field | Value |
|-------|-------|
| **Size** | L |
| **Input** | `hddl-map.js`, `workspace.js`, `store.js`, `selectors.js` |
| **Output** | Same files as `.ts` |
| **Validation** | `npx tsc --noEmit` passes, full test suite passes |
| **Checkpoint** | No |
| **Dependencies** | 6.3 |

### Task 6.5: Enable Strict Mode
| Field | Value |
|-------|-------|
| **Size** | M |
| **Input** | `tsconfig.json`, all `.ts` files |
| **Output** | `strict: true` enabled, all errors fixed |
| **Validation** | `npx tsc --noEmit` passes with strict mode |
| **Checkpoint** | ✅ Yes - TypeScript migration complete |
| **Dependencies** | 6.4 |

**Enable incrementally**:
1. `strictNullChecks: true` first (most valuable)
2. `noImplicitAny: true` second
3. `strict: true` final

**Git tag**: `refactor-phase-6-complete`

---

## Checkpoint Summary

```
Phase 0: Discovery
  └─ [CHECKPOINT 0.2] Architecture doc created
       Tag: refactor-phase-0-complete

Phase 1: Pure Functions  
  └─ [CHECKPOINT 1.4] All pure functions extracted, tests pass
       Tag: refactor-phase-1-complete

Phase 2: D3 Renderers
  └─ [CHECKPOINT 2.5] All renderers extracted, visual verification done
       Tag: refactor-phase-2-complete

Phase 3: hddl-map Core
  └─ [CHECKPOINT 3.2] hddl-map.js < 800 lines
       Tag: refactor-phase-3-complete

Phase 4: workspace.js
  └─ [CHECKPOINT 4.4] workspace.js < 1000 lines
       Tag: refactor-phase-4-complete

Phase 5: Test Infrastructure
  └─ [CHECKPOINT 5.2] Coverage 55%+, no copied functions in tests
       Tag: refactor-phase-5-complete

Phase 6: TypeScript Migration
  └─ [CHECKPOINT 6.2] First TS files working
  └─ [CHECKPOINT 6.5] Strict mode enabled, full TS coverage
       Tag: refactor-phase-6-complete
```

---

## Validation Checklist (Run After Each Task)

```markdown
- [ ] `npm run test:unit` passes (all Vitest tests)
- [ ] `npm test` passes (all Playwright tests)
- [ ] No new console errors in browser at localhost:5173
- [ ] Changed file count ≤ 5 files per task
- [ ] Git commit with descriptive message
```

## Validation Checklist (Run At Each Checkpoint)

```markdown
- [ ] All above checks pass
- [ ] Manual browser verification of visual elements
- [ ] `npm run test:coverage` - coverage not decreased
- [ ] `npm run performance` - no performance regression
- [ ] Git tag created
- [ ] `docs/REFACTOR_ARCHITECTURE.md` updated
```

---

## Risk Mitigation

### Error Compounding Prevention
1. Run tests after every extraction (not just at checkpoints)
2. Validate browser manually at each phase gate
3. Keep git commits atomic - one module per commit

### Context Overflow Prevention
1. Architecture doc serves as **external memory**
2. Each module has clear API boundary
3. Checkpoint documents capture decisions

### Rollback Strategy
- Each checkpoint is a **git tag**
- If phase N fails, `git reset --hard refactor-phase-{N-1}-complete`
- Re-approach with lessons learned

---

## Open Questions

1. ~~**TypeScript timing**: Defer until after structure stabilizes (Phase 6), or introduce earlier for guardrails?~~ **Resolved**: Phase 6 after structure is clean.

2. **Visual regression before Task 2.3**: Should we add Playwright snapshot test before extracting particle engine?

3. **Coverage target**: 55% is conservative. Push to 70% in Phase 5 or defer to Phase 6 when types help identify gaps?

---

## Effort Estimate

| Phase | Tasks | Relative Size |
|-------|-------|---------------|
| Phase 0 | 2 | S+M = 1.5 |
| Phase 1 | 4 | M+S+S+S = 2.5 |
| Phase 2 | 5 | M+L+L+M+M = 4.5 |
| Phase 3 | 2 | L+M = 2.0 |
| Phase 4 | 4 | M+M+L+M = 3.5 |
| Phase 5 | 2 | M+L = 2.0 |
| Phase 6 | 5 | S+M+L+L+M = 5.0 |
| **Total** | **24 tasks** | **21 units** |

Where S=0.5, M=1.0, L=1.5 relative units.

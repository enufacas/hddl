# Plan: Sequential Agent Refactoring of HDDL-Sim

A single agent working sequentially changes the approach: context accumulates (good), but errors compound (risky). This plan uses **checkpoints as git tags** for safe rollback, batches similar extractions while patterns are fresh, and validates thoroughly before each phase boundary.

## Problem Statement (Original)

The hddl-sim codebase had significant structural debt:
- **hddl-map.js**: 3,866 lines, mostly one giant closure with mixed concerns
- **workspace.js**: 3,225 lines, UI + state + API calls intertwined
- **Test coverage**: ~46% baseline
- **No TypeScript**: No compile-time guardrails

This prevented rapid iteration and confident changes.

## Target Outcome

| Goal | Target | Current | Status |
|------|--------|---------|--------|
| No file > 800 lines | ≤800 | hddl-map: 780, workspace: 564 | ✅ Achieved |
| Clear module boundaries | Single responsibilities | 18 map + 8 workspace modules | ✅ Achieved |
| Tests import from source | No copied functions | All imports | ✅ Achieved |
| Test coverage | ≥55% (stretch: 70%) | 62.4% | ✅ Achieved |
| TypeScript strict mode | Enabled | Not started | 🔲 Remaining |

---

## Current Repo Status (2026-01-03)

### Completed Targets ✅

**hddl-map.js:** 780 lines (from 3,866) — 18 extracted modules with tests:
- `src/components/map/detail-levels.js` + test
- `src/components/map/bezier-math.js` + test
- `src/components/map/agent-layout.js` + test
- `src/components/map/particle-labels.js` + test
- `src/components/map/particle-logic.js` + test
- `src/components/map/event-resolution.js` + test
- `src/components/map/particle-motion.js` + test
- `src/components/map/text-utils.js` + test
- `src/components/map/flow-particles.js` + test
- `src/components/map/exception-links.js` + test
- `src/components/map/steward-processing.js` + test
- `src/components/map/render-fleet-links.js` + test
- `src/components/map/particle-renderer.js` + test
- `src/components/map/map-chrome.js` + test
- `src/components/map/simulation-handlers.js` + test
- `src/components/map/envelope-renderer.js` + test
- `src/components/map/entity-renderer.js` + test
- `src/components/map/tooltip-manager.js` + test
- `src/components/map/embedding-renderer.js` + test

**workspace.js:** 564 lines (from 3,225) — 8 extracted modules:
- `src/components/workspace/ai-narrative.js`
- `src/components/workspace/sidebar.js`
- `src/components/workspace/panels.js`
- `src/components/workspace/state.js`
- `src/components/workspace/telemetry.js`
- `src/components/workspace/mobile.js`
- `src/components/workspace/utils.js`
- `src/components/workspace/glossary.js`

**Test Infrastructure:**
- 249 unit tests passing (28 test files)
- 62.4% overall coverage (exceeds 55% target)
- All tests import from source modules

### Git Tags Created
- `refactor-phase-0-complete`
- `refactor-phase-1-complete`
- `refactor-phase-2-checkpoint-01` through `04`

Note: Actual execution order deviated from original plan (workspace extraction happened concurrently with map extraction).

---

## Phase 0: Discovery & Architecture ✅ COMPLETE

### Task 0.1: Codebase Survey ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Output** | Mental model established |

### Task 0.2: Identify Extraction Candidates ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Git Tag** | `refactor-phase-0-complete` |

---

## Phase 1: Extract Pure Functions ✅ COMPLETE

### Task 1.1: Extract Detail Level Module ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Output** | `src/components/map/detail-levels.js` with tests |

### Task 1.2: Extract Bezier Math Module ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Output** | `src/components/map/bezier-math.js` with tests |

### Task 1.3: Extract Workspace Utilities ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Output** | `src/components/workspace/utils.js` |

### Task 1.4: Phase 1 Validation Gate ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Git Tag** | `refactor-phase-1-complete` |

---

## Phase 2: Extract D3 Renderers ✅ COMPLETE

All D3 renderer modules extracted with comprehensive unit tests.

### Task 2.1: Extract Tooltip Manager ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Output** | `src/components/map/tooltip-manager.js` + test |

### Task 2.2: Extract Envelope Renderer ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Output** | `src/components/map/envelope-renderer.js` + test |

### Task 2.3: Extract Particle Engine ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Output** | Multiple modules: `particle-logic.js`, `particle-motion.js`, `particle-labels.js`, `particle-renderer.js`, `flow-particles.js` |
| **Note** | Decomposed further than original plan for better separation |

### Task 2.4: Extract Embedding Renderer ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Output** | `src/components/map/embedding-renderer.js` + test |

### Additional Extractions (Beyond Original Plan) ✅
| Module | Description |
|--------|-------------|
| `agent-layout.js` | Agent positioning logic |
| `entity-renderer.js` | Agent/steward rendering |
| `event-resolution.js` | Event type resolution |
| `exception-links.js` | Exception flow visualization |
| `map-chrome.js` | Map UI chrome elements |
| `render-fleet-links.js` | Fleet connection rendering |
| `simulation-handlers.js` | Simulation event handlers |
| `steward-processing.js` | Steward data processing |
| `text-utils.js` | Text formatting utilities |

### Task 2.5: Phase 2 Validation Gate ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Git Tags** | `refactor-phase-2-checkpoint-01` through `04` |

---

## Phase 3: Refactor hddl-map.js Core ✅ COMPLETE

### Task 3.1: Create HDDLMap Coordinator ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Result** | hddl-map.js reduced to 780 lines (target: <800) |

The coordinator now imports from 18+ extracted modules with clear single responsibilities.

### Task 3.2: Phase 3 Validation Gate ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Validation** | All tests pass, 780 lines < 800 target |

---

## Phase 4: Workspace.js Refactoring ✅ COMPLETE

### Task 4.1: Extract Sidebar Components ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Output** | `src/components/workspace/sidebar.js` |

### Task 4.2: Extract Panel Components ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Output** | `src/components/workspace/panels.js` |

### Task 4.3: Extract AI Narrative Module ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Output** | `src/components/workspace/ai-narrative.js` |

### Additional Extractions ✅
| Module | Description |
|--------|-------------|
| `state.js` | Layout state management |
| `telemetry.js` | Telemetry formatting |
| `mobile.js` | Mobile responsiveness |
| `glossary.js` | Glossary panel |

### Task 4.4: Phase 4 Validation Gate ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Result** | workspace.js reduced to 564 lines (target: <1000) |

---

## Phase 5: Test Infrastructure Improvements ✅ COMPLETE

### Task 5.1: Fix Test Imports ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Result** | All tests import from source modules |

### Task 5.2: Add Unit Tests for Extracted Modules ✅
| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Result** | 249 tests across 28 test files |
| **Coverage** | 62.4% (exceeds 55% target, near 70% stretch) |

**Test file coverage by module:**
- 18 test files in `src/components/map/`
- 8 test files in `src/sim/`
- 2 test files in `src/components/`

---

## Phase 6: TypeScript Migration 🔲 REMAINING

With clean module boundaries and solid test coverage (62.4%), TypeScript conversion is now low-risk.

### Task 6.1: Add TypeScript Configuration
| Field | Value |
|-------|-------|
| **Status** | 🔲 Not Started |
| **Size** | S |
| **Output** | `tsconfig.json`, updated `vite.config.js` |
| **Validation** | `npx tsc --noEmit` passes with `allowJs: true` |

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
| **Status** | 🔲 Not Started |
| **Size** | M |
| **Input** | `detail-levels.js`, `bezier-math.js`, `workspace/utils.js`, `steward-colors.js` |
| **Output** | Same files renamed to `.ts` with type annotations |
| **Checkpoint** | ✅ Yes - First TS files working |

**Priority**: Start with pure functions (no D3 types needed).

### Task 6.3: Add D3 Types and Convert Renderers
| Field | Value |
|-------|-------|
| **Status** | 🔲 Not Started |
| **Size** | L |
| **Input** | `tooltip-manager.js`, `envelope-renderer.js`, `particle-*.js`, `embedding-renderer.js` |
| **Output** | Same files as `.ts` with D3 selection types |

**Install**: `npm install -D @types/d3`

**Challenge**: D3 selection generics are complex. Use `d3.Selection<SVGGElement, unknown, null, undefined>` patterns.

### Task 6.4: Convert Core Coordinators
| Field | Value |
|-------|-------|
| **Status** | 🔲 Not Started |
| **Size** | L |
| **Input** | `hddl-map.js`, `workspace.js`, `store.js`, `selectors.js` |
| **Output** | Same files as `.ts` |

### Task 6.5: Enable Strict Mode
| Field | Value |
|-------|-------|
| **Status** | 🔲 Not Started |
| **Size** | M |
| **Output** | `strict: true` enabled, all errors fixed |
| **Checkpoint** | ✅ Yes - TypeScript migration complete |

**Enable incrementally**:
1. `strictNullChecks: true` first (most valuable)
2. `noImplicitAny: true` second
3. `strict: true` final

**Git tag**: `refactor-phase-6-complete`

---

## Checkpoint Summary

```
Phase 0: Discovery ✅ COMPLETE
  └─ Tag: refactor-phase-0-complete

Phase 1: Pure Functions ✅ COMPLETE
  └─ Tag: refactor-phase-1-complete

Phase 2: D3 Renderers ✅ COMPLETE
  └─ Tags: refactor-phase-2-checkpoint-01 through 04

Phase 3: hddl-map Core ✅ COMPLETE
  └─ Result: 780 lines (target: <800)

Phase 4: workspace.js ✅ COMPLETE
  └─ Result: 564 lines (target: <1000)

Phase 5: Test Infrastructure ✅ COMPLETE
  └─ Result: 249 tests, 62.4% coverage

Phase 6: TypeScript Migration 🔲 REMAINING
  └─ 6.1: Add tsconfig.json
  └─ 6.2: Convert pure utilities to .ts
  └─ 6.3: Add D3 types, convert renderers
  └─ 6.4: Convert core coordinators
  └─ 6.5: Enable strict mode
       Tag: refactor-phase-6-complete (pending)
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
- [ ] Documentation lives in git history + coverage outputs
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

1. ~~**TypeScript timing**: Defer until after structure stabilizes (Phase 6), or introduce earlier for guardrails?~~ **Resolved**: Phase 6 after structure is clean. Structure is now clean.

2. ~~**Visual regression before Task 2.3**: Should we add Playwright snapshot test before extracting particle engine?~~ **Resolved**: Extraction completed successfully without snapshot tests.

3. ~~**Coverage target**: 55% is conservative. Push to 70% in Phase 5 or defer to Phase 6 when types help identify gaps?~~ **Resolved**: Achieved 62.4%, near the 70% stretch goal.

---

## Notes

This plan intentionally avoids effort/time estimates. Use git checkpoints/tags and the architecture doc as the primary progress tracker.

**Lessons Learned:**
- Execution order deviated from plan (workspace and map extraction happened concurrently)
- Particle engine decomposed into 5 modules instead of 1 (better separation of concerns)
- Test coverage exceeded expectations (62.4% vs 55% target)
- Incremental git checkpoints during Phase 2 proved valuable for safe rollback points

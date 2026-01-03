# HDDL Test Coverage Report

**Date:** December 29, 2025  
**Branch:** ux-improvements

## Test Suite Overview

| Category | Tests | Passing | Failing | Skipped | Pass Rate |
|----------|-------|---------|---------|---------|-----------|
| **Integration (Playwright)** | 188 | 164 | 10 | 14 | 87% |
| **Unit (Vitest)** | 66 | 66 | 0 | 0 | 100% |
| **Total** | **254** | **230** | **10** | **14** | **91%** |

## Test Commands

```bash
# Run all tests
npm test

# Integration tests only
npx playwright test

# Unit tests only  
npm run test:unit

# Unit tests (watch mode)
npm run test:unit:watch

# Coverage report (manual workflow - see README.md)
# Terminal 1: $env:VITE_COVERAGE='true'; npm run dev
# Terminal 2: npx playwright test
# Terminal 3: npx nyc report --reporter=html
```

## Test Files (22 files)

### Integration Tests (Playwright)
| File | Tests | Status | Focus |
|------|-------|--------|-------|
| `ui-verification.spec.js` | 18 | 16 passing, 2 failing | UI structure, navigation, timeline |
| `hddl-map-detail-levels.spec.js` | 5 | All passing | Adaptive rendering at FULL/STANDARD/COMPACT/MINIMAL |
| `particle-flow.spec.js` | 19 | 15 passing, 4 failing | Particle visualization regression |
| `hddl-map-rendering.spec.js` | 12 | 11 passing, 1 failing | Core map rendering |
| `hddl-map-stewards-fleets.spec.js` | 26 | 25 passing, 1 failing | Steward filtering, fleet views |
| `hddl-map-critical-paths.spec.js` | 11 | All passing | Critical rendering paths |
| `mobile-layout-improvements.spec.js` | 11 | 10 passing, 1 failing | Mobile-specific layouts |
| `mobile-basic.spec.js` | 6 | All passing | Core mobile functionality |
| `mobile-responsive.spec.js` | 27 | 12 passing, 10 skipped, 5 failing | Mobile gestures, responsive UI |
| `embedding-visual-check.spec.js` | 5 | All passing | 3D embedding visualization |
| `workspace-layout.spec.js` | 8 | All passing | Workspace panels, resizing |
| `workspace-state-management.spec.js` | 7 | 6 passing, 1 failing | URL state, navigation |
| `scenario-validation.spec.js` | 6 | All passing | Scenario data integrity |
| `coverage-collection.spec.js` | 5 | All passing | Coverage infrastructure |
| `layout-focus.spec.js` | 2 | All passing | Agent positioning |
| `layout-focus-agent-names.spec.js` | 1 | All passing | Label collision |
| `agent-names-with-filter.spec.js` | 6 | All passing | Steward filter behavior |
| `agent-grid-scaling.spec.js` | 2 | All passing | Grid layout |
| `ux-review.spec.js` | 1 | All passing | AI-led review harness |
| `docs-style.spec.js` | 1 | All passing | Documentation rendering |
| `platform.spec.js` | 9 | All passing | Platform checks |

### Unit Tests (Vitest)
| File | Tests | Status | Focus |
|------|-------|--------|-------|
| `src/components/hddl-map.test.js` | 33 | All passing | Pure functions: detail levels, adaptive labels, Bezier math |
| `src/components/workspace.test.js` | 33 | All passing | Utilities: XSS prevention, event filtering, ID transforms |

## Known Failing Tests (10)

**Visual Regression (4 tests)** - Screenshot pixel diffs from scenario changes:
- `particle-flow.spec.js` - Particles at hour 2, hour 3 (boundary), hour 4 (revision), initial state

**Agent Rendering (2 tests)**:
- `hddl-map-rendering.spec.js` - Agent count assertion (expected ≤10, got 12)
- `hddl-map-stewards-fleets.spec.js` - Agent stroke/fill color detection

**Mobile UI (1 test)**:
- `mobile-layout-improvements.spec.js` - Timeline speed selector visibility

**UI Structure (3 tests)**:
- `ui-verification.spec.js` - Agent name overlap detection
- `ui-verification.spec.js` - Sidebar "Stewardship" navigation item
- `workspace-state-management.spec.js` - Activity bar click handler

## Skipped Tests (14)

**Mobile Features Not Implemented (10 tests)**:
- `mobile-responsive.spec.js` - Sidebar overlay, landscape layout, tablet viewport tests

**Other (4 tests)**:
- Various tests waiting on UI feature implementation

## Coverage Infrastructure

**Status:** ✅ Fully functional

**Measured Coverage (E2E: Playwright + Istanbul):**
| Metric | Coverage |
|--------|----------|
| Statements | 45.89% |
| Branches | 26.46% |
| Functions | 42.97% |
| Lines | 47.91% |

**Automated Script:**
```bash
npm run test:unit:coverage    # Unit coverage (Vitest) -> coverage/unit/
npm run test:coverage         # E2E coverage (Playwright/Istanbul), opens browser
npm run test:coverage -- -v   # Verbose test output
npm run test:coverage -- -s   # Skip opening browser
```

Unit coverage is intentionally scoped to TS-target surfaces (`src/sim/**`, `src/components/map/**`).

The `run-coverage.mjs` script:
1. Cleans old coverage data (`.nyc_output/`, `coverage/e2e/`)
2. Runs `istanbul-coverage.spec.js` with `VITE_COVERAGE=true` (and forces a fresh dev server)
3. Extracts `window.__coverage__` from browser via Playwright
4. Writes Istanbul-format JSON to `.nyc_output/`
5. Generates HTML + text reports via nyc
6. Opens `coverage/e2e/index.html` in browser

**Tools:**
- vite-plugin-istanbul - Code instrumentation (populates `window.__coverage__`)
- nyc - Report generation
- `tests/istanbul-coverage.spec.js` - Extracts coverage from browser
- `scripts/run-coverage.mjs` - Automation script

## Component Coverage (Measured)

| Component | Statements | Branches | Functions | Lines |
|-----------|------------|----------|-----------|-------|
| **hddl-map.js** | 58% | 34% | 66% | 61% |
| **workspace.js** | 53% | 21% | 44% | 56% |
| **resizable-panel.js** | 50% | 32% | 29% | 51% |
| **layout-manager.js** | 2% | 0% | 3% | 2% |
| **home.js** | 63% | 64% | 77% | 76% |
| **scenario-selector.js** | 71% | 43% | 46% | 71% |
| **envelope-detail.js** | 67% | 58% | 65% | 69% |
| **steward-colors.js** | 100% | 100% | 100% | 100% |

**Total:** 45.89% statements, 47.91% lines

## Test Quality Metrics

✅ **Behavioral Assertions** - Tests verify user-visible behavior, not implementation details  
✅ **Timeline-Aware** - Particle tests account for simulation playback state  
✅ **Flexible Assertions** - Range checks accommodate scenario evolution  
✅ **Mobile Support** - Touch interactions, responsive layouts  
✅ **Visual Regression** - Screenshot-based particle flow validation  
✅ **Unit Test Isolation** - Pure functions tested independently  

## Next Steps

1. **Fix Visual Regression Tests** - Update snapshots after scenario stabilization
2. **Implement Mobile Features** - Enable 10 skipped mobile tests
3. **Increase Coverage** - Target 60% statements (currently 46%)
4. **Fix Known Failures** - Address 10 failing tests
5. **Add Unit Tests** - Cover layout-manager.js (2% → 50%)
6. **Add Integration Tests** - Telemetry system, resizable panels

## Test Architecture

**Playwright (Integration):**
- Config: `playwright.config.js`
- Dev server: Auto-starts on port 5173 (or next available)
- Browser: Chromium only
- Parallel: 6 workers
- Reports: HTML report in `playwright-report/`

**Vitest (Unit):**
- Config: `vitest.config.js`
- Include: `src/**/*.test.js`
- Exclude: `tests/**/*.spec.js`
- Speed: <250ms for 66 tests
- Watch mode: Available

**Coverage:**
- Config: `.nycrc.json`, `vite.config.js` (istanbul plugin)
- Activation: `$env:VITE_COVERAGE='true'`
- Reports: HTML in `coverage/`, text to console
- Tool: NYC with Istanbul instrumentation

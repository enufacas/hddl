# HDDL Testing Guide

## Quick Start

```bash
# Run all tests
npm test                    # Playwright integration tests
npm run test:unit          # Vitest unit tests

# Watch modes
npm run test:unit:watch    # Auto-rerun unit tests on change
npx playwright test --ui   # Interactive Playwright UI

# Coverage (automated)
npm run test:coverage       # Run tests with coverage, generate report, open in browser
npm run test:coverage:verbose  # Show detailed test output
```

## Test Suite Status

**Total:** 254 tests (230 passing, 10 failing, 14 skipped)  
**Pass Rate:** 91% overall, 100% unit tests

For detailed breakdown see [TEST_REPORT.md](TEST_REPORT.md)

## Test Infrastructure

### Test Types

1. **Unit Tests (Vitest)** - Pure function testing
   - Location: `src/**/*.test.js`
   - Run: `npm run test:unit`
   - Watch mode: `npm run test:unit:watch`
   - Fast (<1s), no browser needed

2. **Integration Tests (Playwright)** - Browser-based E2E
   - Location: `tests/*.spec.js`  
   - Run: `npm test` (includes conformance check)
   - Direct: `npx playwright test`
   - Slow (~1-2min), requires dev server

3. **Coverage Analysis**
   - Run: `npm run test:coverage`
   - Requires: `VITE_COVERAGE=true` environment variable
   - Output: `coverage/index.html`

4. **Performance Testing** - Browser rendering metrics
   - Location: `analysis/performance-metrics.mjs`
   - Run: `npm run performance [scenario]`
   - Suite: `npm run performance:suite` (5 runs with statistics)
   - See: [`../analysis/README.md`](../analysis/README.md#performance-testing-workflow) for details

## Current Test Suite

**Total: 254 tests across 22 files (91% pass rate)**

| Type | Files | Tests | Status |
|------|-------|-------|--------|
| Vitest unit tests | 2 | 66 | ✅ All passing |
| Playwright integration | 20 | 188 | 164 passing, 10 failing, 14 skipped |
| **Total** | **22** | **254** | **91% pass rate** |

**See [TEST_REPORT.md](TEST_REPORT.md) for detailed test breakdown and failure analysis.**

### Test Commands

```bash
# Run all integration tests
npx playwright test

# Run specific test file
npx playwright test tests/hddl-map-rendering.spec.js

# Run in UI mode (interactive)
npx playwright test --ui

# Run unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch
```

## Workflows

### Development (Fast Iteration)

```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Unit tests (watch mode)
npm run test:unit:watch

# When needed: Run integration tests
npx playwright test tests/specific-test.spec.js
```

### Pre-Commit Validation

```bash
# Full suite (includes conformance check)
npm test

# Just unit tests
npm run test:unit -- --run
```

### Coverage Analysis

```bash
# Run coverage report (fully automated)
npm run test:coverage

# Verbose mode (see test output)
npm run test:coverage -- -v

# Skip opening browser
npm run test:coverage -- -s
```

**Current Coverage:**
| Metric | Coverage |
|--------|----------|
| Statements | 45.89% |
| Branches | 26.46% |
| Functions | 42.97% |
| Lines | 47.91% |

**How it works:**
1. Cleans `.nyc_output/` and `coverage/` directories
2. Runs `istanbul-coverage.spec.js` with `VITE_COVERAGE=true`
3. Playwright's webServer starts with Istanbul instrumentation
4. Tests run, extracting `window.__coverage__` after each test
5. Coverage data written to `.nyc_output/playwright-coverage.json`
6. nyc generates HTML report in `coverage/`
7. Opens `coverage/index.html` in browser

## Configuration

### Vite (vite.config.js)

- **istanbul plugin**: Only active when `VITE_COVERAGE=true`
- Excludes: `tests/`, `**/*.test.js`, `**/*.spec.js`
- Why: Prevents instrumentation from breaking dev server

### Vitest (vitest.config.js)

- **Include**: `src/**/*.test.js`
- **Exclude**: `tests/**/*.spec.js` (Playwright tests)
- Why: Separates unit tests from integration tests

### Playwright (playwright.config.js)

- **Pretest hook**: Runs `npm run conformance` (scenario validation)
- **Test directory**: `tests/`
- **Parallel workers**: 6
- Why: Ensures scenario data quality before UI tests

## Adding New Tests

### Unit Test (Fast Functions)

1. Create `src/components/module.test.js`
2. Import functions from implementation
3. Use Vitest: `describe`, `it`, `expect`
4. Run: `npm run test:unit:watch`

Example:
```javascript
import { describe, it, expect } from 'vitest'

function add(a, b) { return a + b }

describe('add', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })
})
```

### Integration Test (UI Components)

1. Create `tests/feature.spec.js`
2. Import from `@playwright/test`
3. Test against `http://localhost:5173/`
4. Run: `npx playwright test tests/feature.spec.js`

Example:
```javascript
import { test, expect } from '@playwright/test'

test('map renders', async ({ page }) => {
  await page.goto('http://localhost:5173/')
  await page.waitForSelector('.hddl-map')
  await expect(page.locator('.hddl-map')).toBeVisible()
})
```

## Troubleshooting

### "Page not loading" in Playwright tests

- ✅ Check: Dev server running on port 5173
- ✅ Check: `VITE_COVERAGE` not set (breaks app)
- ✅ Check: No console errors in browser

### Vitest picking up Playwright tests

- ✅ Check: `vitest.config.js` excludes `tests/` directory
- ✅ Check: Test files named `*.test.js` not `*.spec.js`

### Istanbul breaking the app

- ✅ Check: `requireEnv: true` in vite.config.js
- ✅ Check: Only set `VITE_COVERAGE=true` for coverage runs
- ✅ Never: Set coverage env var for normal development

## Coverage Goals

**Current Estimate**: ~15-20% (no accurate baseline yet)

**Target**: 50%+ in phases
1. Phase 1: Get accurate baseline with istanbul
2. Phase 2: 30% (critical paths)
3. Phase 3: 50% (comprehensive coverage)

**Priority Areas** (0% coverage):
- resizable-panel.js (431 lines)
- layout-manager.js (455 lines)
- tour.js (344 lines)
- layout-orchestrator.js (329 lines)
- embedding-store.js (241 lines)

## Test Maintenance

### When to Update Tests

- ❌ **Don't**: Update tests for every minor UI tweak
- ✅ **Do**: Update when component contracts change
- ✅ **Do**: Add tests for bugs before fixing
- ✅ **Do**: Run full suite before merging

### Screenshot Tests

Located in `tests/**/snapshots/`
- Regenerate: `npx playwright test --update-snapshots`
- Review diffs carefully before committing
- Use sparingly (brittle, slow)

## CI/CD Integration

**Pre-commit**:
```bash
npm run conformance && npm run test:unit -- --run
```

**Pre-merge**:
```bash
npm test
```

**Coverage tracking** (future):
```bash
npm run test:coverage
# Enforce threshold in CI (start at 30%)
```

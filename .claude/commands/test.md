# test

Run appropriate test suite based on recent changes.

## Instructions

Run the test suite that matches your recent changes:

### Quick Test (Default)
```bash
cd hddl-sim && npm run test:unit
```
- **When:** For most changes (pure functions, utilities, sim logic)
- **Speed:** Fast (~5 seconds)
- **Coverage:** Unit tests only

### Full Test Suite
```bash
cd hddl-sim && npm test
```
- **When:** UI changes, component modifications, or before commits
- **Speed:** Slower (~1-2 minutes)
- **Includes:** Conformance (pretest) + Playwright integration tests

### Conformance Only
```bash
cd hddl-sim && npm run conformance
```
- **When:** Scenario data or schema changes
- **Speed:** Very fast (~1 second)
- **Purpose:** Validate JSON schema compliance

### Coverage Reports

**Unit test coverage (TS-readiness KPI):**
```bash
cd hddl-sim && npm run test:unit:coverage
```
- Opens: `hddl-sim/coverage/unit/index.html`
- Scope: `src/sim/**` and `src/components/map/**`

**E2E test coverage (critical-flow KPI):**
```bash
cd hddl-sim && npm run test:coverage:e2e
```
- Opens: `hddl-sim/coverage/e2e/index.html`
- Scope: Browser execution paths

## Report Format

Report test results clearly with counts:

```
✓ Unit Tests: 47 passed in 4.2s
```

Or if failures:

```
✗ Unit Tests: 2 failed, 45 passed
  - getStewardColor: Expected '#ff0000' but got '#00ff00'
  - toSemver: TypeError: undefined is not a function
```

## When Tests Fail

1. **Read the error message carefully** - tests tell you exactly what broke
2. **Fix the code or update the test** - decide if behavior change was intentional
3. **Re-run tests** - iterate until passing
4. **Don't commit failing tests** - all tests must pass before commit

## Notes

- Part of Boris's inner loop workflow (Principle #7)
- Faster than typing full npm commands repeatedly
- Use `/verify` for complete pre-commit validation

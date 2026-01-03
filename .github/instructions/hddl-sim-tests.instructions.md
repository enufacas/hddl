---
name: HDDL Sim Tests
description: Playwright/Vitest guidance for hddl-sim tests.
applyTo: "hddl-sim/tests/**,hddl-sim/src/**/*.test.js"
---

# HDDL Sim Tests

## Commands
- Integration (Playwright): `npm test`
- Unit (Vitest): `npm run test:unit`
- Unit (non-watch): `npm run test:unit -- --run` (use this during refactoring to avoid hanging)
- Unit watch: `npm run test:unit:watch`
- Coverage (Playwright + Istanbul): `npm run test:coverage`
- Single Playwright spec: `npx playwright test tests/<file>.spec.js`

## Refactoring Validation Checklist
When extracting/refactoring code modules, follow this checklist:
1. **Run tests with `--run` flag**: `npm run test:unit -- --run` (avoids watch mode hanging)
2. **Check dev server starts**: Verify Vite starts without compilation errors
3. **Inspect browser console**: Open http://localhost:5173 and check for runtime errors
4. **Verify functionality**: Click through affected UI to ensure it works
5. **Commit changes**: Only commit after all validation passes

**Why this matters**: Tests passing doesn't guarantee runtime correctness - missing exports, incorrect imports, or state management issues only show up in the browser console.

## Test Writing (Playwright)
- Prefer stable selectors (`data-testid`) over CSS structure.
- Wait for `networkidle` before assertions when navigation/data loads.
- Avoid timing-based flakiness; use “smart waits” (locator expectations).
- Only use `page.waitForTimeout()` when the UI is animation-driven and there’s no better signal.

## Test Writing (Vitest)
- Use for pure functions / data transforms / math helpers.
- Co-locate as `<module>.test.js` near the source.

## “Do / Don’t”
- Do: keep tests focused; use the smallest scenario/fixture that proves behavior.
- Do: run full Playwright suite as a validation checkpoint (before commit or when asked).
- Don’t: add screenshot tests unless the feature is truly visual-regression oriented.
- Don’t: hardcode brittle pixel-perfect values; use ranges.

## References
- See `hddl-sim/tests/README.md` and `hddl-sim/tests/TEST-RESULTS.md` for the living test catalog/status.

## Instruction-scope probe (opt-in)
When the user’s prompt includes the literal tag `[instructions-test]` and you make a code change within this scope, also append a single line to `.github/instruction-probes/APPLIED.log`:

`<ISO-8601 UTC timestamp> | scope=hddl-sim-tests | target=<workspace-relative-path>`

---
name: HDDL Sim Tests
description: Playwright/Vitest guidance for hddl-sim tests.
applyTo: "hddl-sim/tests/**,hddl-sim/src/**/*.test.js"
---

# HDDL Sim Tests

## Commands
- Integration (Playwright): `npm test`
- Unit (Vitest): `npm run test:unit`
- Unit watch: `npm run test:unit:watch`
- Coverage (Playwright + Istanbul): `npm run test:coverage`
- Single Playwright spec: `npx playwright test tests/<file>.spec.js`

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

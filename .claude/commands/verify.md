# verify

Run complete verification suite after making changes to ensure quality.

## Instructions

You are in verification mode. After making code changes, run this complete verification suite in order:

### 1. Conformance Check
```bash
cd hddl-sim && npm run conformance
```
- **Purpose:** Validate all scenarios pass JSON schema validation
- **Must pass:** All scenarios must conform to `hddl-scenario.schema.json`
- **If fails:** Fix scenario data or schema issues before proceeding

### 2. Unit Tests
```bash
cd hddl-sim && npm run test:unit
```
- **Purpose:** Test pure functions and simulation logic
- **Must pass:** All Vitest tests must pass
- **If fails:** Fix broken logic or update tests if behavior intentionally changed

### 3. Integration Tests (Conditional)
```bash
cd hddl-sim && npm test
```
- **When to run:** Only if changes affect UI components or browser behavior
- **Purpose:** Test full application in browser via Playwright
- **Must pass:** All E2E tests must pass
- **Skip if:** Only backend/pure function changes

### 4. Browser Visual Check (Conditional)

**Option A: Automated (Recommended - requires Chrome extension):**
```bash
/verify-ui <scenario-name>
```
- **When to run:** If changes affect UI
- **Purpose:** Automated visual verification using Claude Chrome extension
- **Checks:** Layout, particles, colors, interactions, animations
- **Screenshots:** Saved for documentation

**Option B: Manual:**
```bash
cd hddl-sim && npm run dev
```
- **When to run:** If Chrome extension not available
- **Purpose:** Manually verify changes look correct at http://localhost:5173
- **Check:** Load affected scenarios, verify visual appearance and interactions
- **Look for:** Layout issues, broken styling, incorrect data display

### 5. Scenario Analysis (Conditional)
```bash
node hddl-sim/analysis/scenario-analysis.mjs <scenario-name>
```
- **When to run:** Only if scenario data was modified
- **Purpose:** Validate scenario structure, temporal patterns, feedback loops
- **Check:** No warnings or errors from analyzer
- **Review:** Particle flow requirements, chronological consistency

## Report Format

After running verification, report results clearly:

```
✓ Conformance: All scenarios valid
✓ Unit Tests: 47 passed
⚠ Integration Tests: Skipped (no UI changes)
✓ Browser Check: Verified scenario viewer loads correctly
✓ Scenario Analysis: insurance scenario - no issues
```

Or if failures:

```
✗ Conformance: FAILED - insurance scenario missing required field
  → Fix: Add 'boundary_reason' to 3 boundary_interaction events
⏸ Unit Tests: Not run (conformance must pass first)
```

## Iteration Until Success

If any check fails:
1. **Stop immediately** - Don't proceed to later checks
2. **Fix the issue** - Make necessary changes
3. **Re-run verification** - Start from the beginning
4. **Iterate** until all checks pass

**Do not** consider the task complete until verification passes.

## Notes

- This command implements Boris's Principle #13: "Give Claude a way to verify its work"
- Verification loops 2-3x the quality of results
- Make this rock-solid - it's the foundation of reliable development

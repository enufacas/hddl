# verify-ui

Visual UI verification using Claude Chrome extension (Boris's Principle #13).

## Prerequisites

**Claude Chrome extension must be enabled:**
```bash
# Enable in this session
claude --chrome

# Or add to .claude/settings.json:
{
  "chrome": true
}
```

## Instructions

You are in UI verification mode. Use the Claude Chrome extension to visually verify the scenario viewer.

### Step 1: Start Dev Server
```bash
cd hddl-sim && npm run dev
```
Wait for server to be ready at http://localhost:5173

### Step 2: Launch Browser and Navigate
- Open Chrome browser
- Navigate to http://localhost:5173
- Wait for page to fully load

### Step 3: Load Scenario
- Find scenario dropdown selector
- Select the specified scenario (e.g., "insurance", "test-minimal")
- Wait for scenario to load and render

### Step 4: Visual Verification Checklist

**Layout & Structure:**
- ✓ Page loads without errors
- ✓ Workspace component visible
- ✓ HDDL map renders
- ✓ Timeline visible at bottom
- ✓ Detail level controls visible

**Scenario Visualization:**
- ✓ Particles appear on the map
- ✓ Particles are distinct colors (steward colors working)
- ✓ Particle labels are readable
- ✓ Envelope boxes render correctly
- ✓ Event markers on timeline

**Interactions:**
- ✓ Hover over particle shows details
- ✓ Click particle highlights it
- ✓ Play/pause button works
- ✓ Timeline scrubbing works
- ✓ Detail level toggle changes visible elements
- ✓ Zoom/pan controls work

**Animation:**
- ✓ Particles animate along paths (if scenario has motion)
- ✓ Particle trails render smoothly
- ✓ No stuttering or performance issues
- ✓ Transitions are smooth

**Console Errors:**
- ✓ No JavaScript errors in console
- ✓ No 404s or failed resource loads
- ✓ No React warnings

### Step 5: Take Screenshots

Capture evidence of successful render:
- Screenshot 1: Full scenario view (overview)
- Screenshot 2: Particles at FULL detail level
- Screenshot 3: Specific interaction (hover tooltip, selected particle)

Save to: `hddl-sim/screenshots/<scenario-name>-<timestamp>.png`

### Step 6: Report Results

Provide clear visual verification report:

```
UI VERIFICATION: insurance scenario

✓ PASSED - Visual verification successful

Page Load:
- ✓ No console errors
- ✓ All resources loaded
- ✓ 47 events rendered

Visual Quality:
- ✓ 12 distinct steward colors
- ✓ Particle labels readable
- ✓ Timeline distribution clear
- ✓ Animations smooth (60fps)

Interactions:
- ✓ Hover tooltips work
- ✓ Play controls functional
- ✓ Detail levels toggle correctly

Screenshots saved:
- hddl-sim/screenshots/insurance-20260105-1430.png

RECOMMENDATION: Ready to commit
```

Or if issues found:

```
UI VERIFICATION: insurance scenario

✗ FAILED - Issues detected

Issues Found:
1. Steward colors not distinct - S_003 and S_005 both appear blue
2. Particle labels overlap at FULL detail level
3. Console error: "Cannot read property 'x' of undefined"
4. Timeline scrubbing jumps instead of smooth seek

Screenshots:
- hddl-sim/screenshots/insurance-error-20260105-1430.png

RECOMMENDATION: Fix issues before commit
```

## When to Use

- After implementing UI changes
- Before creating PR with visual changes
- When debugging visual rendering issues
- When user reports "it doesn't look right"

## Advantages Over Manual Testing

- **Repeatable** - Same checks every time
- **Documented** - Screenshots prove it worked
- **Faster** - No manual navigation
- **Comprehensive** - Checklist ensures nothing missed
- **Shareable** - Screenshots in PR show what was verified

## Integration with /verify

The complete verification flow becomes:
1. **Conformance** - Schema validation (fast)
2. **Unit tests** - Pure function logic (fast)
3. **Integration tests** - Playwright E2E (slow)
4. **UI verification** - Chrome visual check (this command)
5. **Analysis** - Scenario structure validation (conditional)

## Notes

- Requires Chrome extension enabled
- Requires dev server running
- Takes screenshots for documentation
- Boris: "This is how I verify every change to claude.ai/code"
- Visual verification 2-3x more thorough than automated tests alone

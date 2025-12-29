# Copilot Instructions for HDDL Project

## Development Workflow

### Iteration Speed Priority
- **Use Vite dev server** at `localhost:5173` for hot module replacement (HMR)
- **Do NOT run Playwright tests** after each change during active iteration
- Tests are for validation checkpoints, not continuous feedback
- Rely on browser hot reload to verify UI changes immediately

### Starting Dev Server
```bash
cd hddl-sim && npm run dev
```

### When to Run Tests
- Before committing
- After completing a feature set
- When explicitly requested
- NOT after every small UI tweak

## Code Patterns

### Steward Colors
Use shared utility for consistent steward coloring:
```js
import { getStewardColor, toSemver } from '../sim/steward-colors.js'
```

### CSS Variables
Prefer VS Code theme variables for consistency:
- `var(--vscode-editor-background)`
- `var(--vscode-sideBar-background)`
- `var(--status-success)`, `var(--status-warning)`, etc.

### Color Tinting Pattern
For subtle background tints based on dynamic colors:
```js
`color-mix(in srgb, ${color} 10%, var(--vscode-sideBar-background))`
```

## Project Structure
- `hddl-sim/src/components/` - UI components (workspace.js, hddl-map.js)
- `hddl-sim/src/pages/` - Page layouts (home.js)
- `hddl-sim/src/sim/` - Simulation logic and utilities
- `hddl-sim/schemas/` - JSON schemas for scenarios
- `hddl-sim/analysis/` - Analysis tools and reports
- `hddl-sim/tests/` - Playwright integration tests
- `docs/spec/` - Canonical specifications and enhancement proposals

## Testing

### Quick Reference

```bash
npm test                    # All integration tests (includes conformance)
npm run test:unit          # Vitest unit tests only
npm run test:unit:watch    # Unit tests in watch mode
npm run test:coverage      # Generate coverage report (opens browser)
```

### Test Infrastructure

| Type | Location | Framework | Speed |
|------|----------|-----------|-------|
| Unit Tests | `src/**/*.test.js` | Vitest | Fast (<1s) |
| Integration | `tests/*.spec.js` | Playwright | Slow (1-2min) |
| Coverage | `tests/istanbul-coverage.spec.js` | Istanbul | ~30s |

### Current Status

- **254 tests** (230 passing, 91% pass rate)
- **Coverage**: 45.89% statements, 47.91% lines
- See `.github/instructions/hddl-sim-tests.instructions.md` for detailed testing guidelines

### When to Run Which Tests

| Situation | Command | Why |
|-----------|---------|-----|
| Developing UI | `npm run dev` + browser | HMR is faster than tests |
| New pure function | `npm run test:unit:watch` | Instant feedback |
| Before commit | `npm test` | Full validation |
| Checking coverage | `npm run test:coverage` | Opens HTML report |
| Specific feature | `npx playwright test tests/feature.spec.js` | Focused testing |

## Analysis Workflow

**Analysis tools are measurement instruments** - they output structured data to console, not files.

### Available Analysis Tools

1. **scenario-analysis.mjs** - Scenario validation
   - Structure, temporal patterns, feedback loops
   - Particle flow validation (visual requirements)
   - Actor/envelope/event relationships
   - Run: `node hddl-sim/analysis/scenario-analysis.mjs <scenario-name>`

2. **cognitive-load-metrics.mjs** - UX information design
   - Information density (element counts by detail level)
   - Pattern complexity (feedback cycle visibility)
   - Concurrent particle load (animation complexity)
   - Interaction complexity (hover/click targets)
   - Run: `npm run cognitive-load <scenario-name>`

3. **performance-metrics.mjs** - Browser rendering performance
   - FPS during animation
   - SVG complexity (DOM nodes, path segments)
   - Memory usage (heap size)
   - Render times (initial load, first paint)
   - Run: `npm run performance <scenario-name>` (requires dev server running)

### Creating Analysis Reports

**When user asks for "analysis" or "report":**

1. **Run the appropriate tools** based on what's being analyzed:
   - Scenario quality → `scenario-analysis.mjs`
   - UX complexity → `cognitive-load-metrics.mjs`
   - Performance → `performance-metrics.mjs`
   - Complete analysis → all three

2. **Capture tool output** and synthesize into markdown report

3. **Structure the report:**
   - Executive summary with key findings
   - Metrics tables from tool outputs
   - Analysis sections (structure, patterns, performance)
   - Recommendations for improvement

4. **Save to `hddl-sim/analysis/<Scenario>_Analysis.md`**

**Updating existing reports:**
- Re-run tools to get current metrics
- Update metrics sections with new data
- Preserve hand-written analysis/context where valuable
- Note date of analysis refresh

**Example prompt patterns:**
- "Analyze the insurance scenario" → Run all 3 tools, create comprehensive report
- "What's the cognitive load of this scenario?" → Run cognitive-load-metrics.mjs only
- "Update the insurance deep dive" → Re-run tools, refresh existing markdown
- "How's performance at FULL detail level?" → Run performance-metrics.mjs, report findings

## Spec Change Workflow

When proposing or implementing changes to the HDDL specification, follow this checklist:

### 1. Schema Update (Required)
**File:** `hddl-sim/schemas/hddl-scenario.schema.json`
- Update field definitions with proper types, enums, descriptions
- Mark fields as required/optional appropriately
- Add inline documentation for complex fields
- Maintain backward compatibility when possible

### 2. Scenario Data Update (Required)
**Files:** `hddl-sim/src/sim/scenarios/*.scenario.json`
- Update at least one scenario to demonstrate the new field
- Ensure all required fields are present
- Add realistic domain-specific examples
- Run conformance tests: `npm run conformance`

### 3. Implementation Update (Required)
**Files:** `hddl-sim/src/components/*.js`, `hddl-sim/src/sim/*.js`
- Update code to read/use the new fields
- Handle both presence and absence (optional fields)
- Update UI labels, tooltips, visualizations
- Add console logging for debugging (remove before commit)

### 4. Documentation Updates (Required)
Update ALL of these:

**a) Enhancement Proposal** (for non-trivial changes)
- **File:** `docs/spec/Schema_Enhancement_[Name].md`
- Document: problem, solution, benefits, migration path
- Include examples (before/after)
- Note backward compatibility impact

**b) Implementers Guide**
- **File:** `docs/spec/Implementers_Guide.md`
- Add FAQ entry if developer-facing
- Include code examples showing usage
- Update relevant sections (Event Types, Key Concepts, etc.)

**c) Particle Flow Rules** (if visualization changes)
- **File:** `hddl-sim/docs/PARTICLE_FLOW_RULES.md`
- Update particle type definitions
- Document visual behavior changes
- Update scenario data requirements section

**d) Wire Format Spec** (rarely needed)
- **File:** `docs/spec/Scenario_Replay_Wire_Format.md`
- Usually defers to JSON schema, update only if normative behavior changes

### 5. Testing & Validation (Required)
- Run conformance: `npm run conformance`
- Verify in browser at `localhost:5173`
- Check console for errors/warnings
- Test with multiple scenarios if available

## Canonical Event Patterns

### Closed Loop Requirements

**CRITICAL:** Embeddings are not optional decoration—they are the feedback mechanism that enables agent learning.

#### REQUIRED Embeddings:

1. **Every `revision` MUST have an embedding**
   - `embeddingType: "revision"` with `sourceEventId` pointing to revision
   - Created ~0.5-1 hour after revision
   - **Why:** Policy changes must be retrievable for agents to understand governance evolution

2. **Every `boundary_interaction` MUST have an embedding**
   - `embeddingType: "boundary_interaction"` with `sourceEventId` pointing to boundary
   - Created ~0.5-1 hour after boundary
   - **Why:** Escalation patterns teach agents their authority boundaries

#### RECOMMENDED Patterns:

3. **Steward decisions SHOULD have embeddings**
   - Especially decisions resolving boundary interactions
   - Shows human judgment patterns for agent learning

4. **Boundary interactions SHOULD be preceded by retrieval**
   - Add retrieval ~0.5 hours before boundary
   - Shows agent "thinking with memory" before escalating
   - Query relevant historical patterns and recent decisions

5. **Scenarios SHOULD include historical baseline**
   - Add embeddings at `hour < 0` (e.g., hour -48)
   - Represents pre-existing knowledge agents start with
   - Makes agent behavior realistic (not starting with blank memory)

### The 6-Event Feedback Cycle

Complete pattern for boundary → approval → policy evolution:

```json
// 1. Retrieval (hour X-0.5) - recommended
{
  "type": "retrieval",
  "queryText": "similar situations + resolution",
  "retrievedEmbeddings": ["EMB-HIST-001", "EMB-005"],
  "relevanceScores": [0.93, 0.81]
}

// 2. Boundary Interaction (hour X)
{
  "type": "boundary_interaction",
  "eventId": "boundary:X",
  "boundary_kind": "escalated"
}

// 3. Boundary Embedding (hour X+0.5) - REQUIRED
{
  "type": "embedding",
  "embeddingType": "boundary_interaction",
  "sourceEventId": "boundary:X"
}

// 4. Steward Decision (hour X+1)
{
  "type": "decision",
  "eventId": "decision:X+1",
  "status": "allowed"
}

// 5. Decision Embedding (hour X+1.5) - recommended
{
  "type": "embedding",
  "embeddingType": "decision",
  "sourceEventId": "decision:X+1"
}

// 6. Revision (hour X+2)
{
  "type": "revision",
  "eventId": "revision:X+2",
  "resolvesEventId": "boundary:X"
}

// 7. Revision Embedding (hour X+2.5) - REQUIRED
{
  "type": "embedding",
  "embeddingType": "revision",
  "sourceEventId": "revision:X+2"
}
```

### Chronological Consistency

**CRITICAL:** Retrievals can only reference embeddings that exist BEFORE the retrieval:

```json
// INVALID - time paradox
{
  "type": "retrieval",
  "hour": 28.7,
  "retrievedEmbeddings": ["EMB-009"]  // Created at hour 29!
}

// VALID - chronologically consistent
{
  "type": "retrieval",
  "hour": 28.7,
  "retrievedEmbeddings": ["EMB-HIST-004", "EMB-001"]  // Both exist before 28.7
}
```

### Semantic Vector Space

Position embeddings in 2D space where similar patterns cluster:

- **X-axis**: `policy (0) ↔ operational (1)`
  - 0.0-0.3: High-level governance, policy definitions
  - 0.7-1.0: Day-to-day operational decisions

- **Y-axis**: `routine (0) ↔ exceptional (1)`
  - 0.0-0.3: Standard procedures, common patterns
  - 0.7-1.0: Unusual cases, edge conditions, escalations

**Examples:**
- Bundle discount: `[0.68, 0.35]` - operational + routine
- Threshold escalation: `[0.80, 0.75]` - very operational + exceptional
- Policy revision: `[0.30, 0.65]` - policy-level + exceptional

### Reference Documentation

See these canonical specifications for details:
- `docs/spec/Canonical_Event_Patterns.md` - Complete feedback loop patterns
- `docs/spec/Scenario_Replay_Wire_Format.md` - Closed loop requirements (normative)
- `docs/spec/Agent_Learning_Feedback_Loop.md` - Feedback loop architecture
- `docs/spec/Implementers_Guide.md` - FAQs on closed loops

### Conformance Validation

Run `npm run conformance` to validate:
- ✅ Every revision has embedding
- ✅ Every boundary interaction has embedding
- ✅ Retrievals only reference chronologically valid embeddings
- ⚠️ Boundaries should have preceding retrieval
- ⚠️ Steward decisions should have embeddings
- ⚠️ Scenarios should have historical baseline

### 5. Testing & Validation (Previously Required)
- Run conformance: `npm run conformance`
- Verify in browser at `localhost:5173`
- Check console for errors/warnings
- Test with multiple scenarios if available

### Spec Change Checklist Template
```markdown
- [ ] Schema updated with field definition
- [ ] At least one scenario uses new field
- [ ] Code reads and uses new field correctly
- [ ] Enhancement proposal written (if non-trivial)
- [ ] Implementers Guide updated with examples
- [ ] Particle Flow Rules updated (if UI change)
- [ ] Conformance tests pass
- [ ] Verified in browser
- [ ] Backward compatibility considered
```

### Example: Adding `boundary_reason` Field
1. ✅ Schema: Added optional `boundary_reason: { type: "string" }`
2. ✅ Scenario: Added to 6 boundary_interactions in insurance scenario
3. ✅ Code: Updated hddl-map.js to show reason in particle labels
4. ✅ Docs: Created Schema_Enhancement_Boundary_Reason.md
5. ✅ Docs: Updated Implementers_Guide.md with FAQ
6. ✅ Docs: Updated PARTICLE_FLOW_RULES.md with reason codes
7. ✅ Tests: Schema validates, browser shows new labels

### Backward Compatibility Guidelines
- **Optional fields:** Safe to add anytime
- **Required fields:** Breaking change, needs migration plan
- **Enum constraints:** Can expand (add values), cannot contract (remove values)
- **Field renames:** Use Drift + Gap Analysis normalizer for legacy support

## Communication Guidelines

### Never Fabricate Project History or Time Estimates
- **DO NOT** make up timelines, development duration, or effort estimates
- **DO NOT** add phrases like "months of work", "weeks of iteration", "extensive development"
- **DO NOT** invent project history or milestones that didn't happen
- **DO NOT** estimate task durations in hours/days/weeks - these guesses are always wrong and sound stupid
- **DO NOT** write "Total time investment: X hours" or "This will take Y days" - you have no basis for these numbers
- Stick to observable facts: features present, tests passing, code structure
- If asked about project history, only reference git commit history or explicitly documented facts
- If asked for time estimates, acknowledge you cannot reliably estimate development time

### CHANGELOG Maintenance

**When to update CHANGELOG.md:**
- Major conceptual shifts (e.g., making implicit patterns normative)
- Breaking changes requiring migration
- New normative specifications
- Session-level work spanning multiple specifications
- Context that explains "why" not captured in commits

**When NOT to update CHANGELOG.md:**
- Routine bug fixes (commit messages suffice)
- Minor code refactoring
- Single-file changes
- Implementation details (code comments suffice)
- Anything well-captured by `git log` and `git diff`

**What to include in CHANGELOG entries:**
- **High-level summary** (2-4 sentences max)
- **Context & rationale** - Why this change? What problem does it solve?
- **Breaking changes** - What requires migration?
- **Migration guide** - How to update existing code/scenarios
- **Impact** - What's different for users/implementers?
- **Key files** - Link to major new/updated specifications (not exhaustive list)

**What to omit from CHANGELOG:**
- File-by-file change lists (use `git log --stat` instead)
- Line-by-line implementation details
- Every file touched in a session
- Routine updates to documentation formatting

**Format guidance:**
```markdown
### Added - YYYY-MM-DD: Brief Title

**High-level summary of change.**

#### Summary
2-4 sentences explaining what changed and why.

#### What Changed
- Major new specs with links
- Breaking changes
- New tooling

#### Context & Rationale
Why this work was needed. What problem was discovered.

#### Migration Guide
Code examples showing how to update.

#### Impact
What's different for users.
```

# Claude Code Instructions for HDDL Project

## Helper Agent System

This project uses a multi-agent architecture to accelerate development. Main Claude (claude-sonnet-4.5) coordinates three helper agents that handle specialized tasks.

### Agent Architecture

```
Main Claude (claude-sonnet-4.5)
├─ Test-Writer (claude-4.5 subagent)    → Automatic testing
├─ Reviewer (gpt-5.2 via copilot)      → User perspective reviews
└─ Quick-Helper (gpt-5-mini via copilot) → Fast simple tasks
```

### Starting Helper Agents

**Option A - Manual** (recommended first time):
```
/init-helpers
```

**Option B - Automatic** (requires hook setup):
- Helpers auto-initialize on first message of each session
- See `.claude/HOOK_SETUP.md` for configuration

### When Each Agent Is Used

#### Test-Writer (Claude 4.5 Subagent)
**Triggers**: Automatically after code edits

**What it does**:
- Writes unit tests for new functions/components
- Runs test suite and reports failures
- Checks coverage metrics
- Suggests test improvements

**You don't need to ask** - Main Claude automatically delegates testing tasks.

#### Reviewer (GPT-5.2)
**Triggers**: After feature completion or before PRs

**What it does**:
- Reviews code from user perspective
- Identifies UX issues and edge cases
- Checks documentation clarity
- Validates accessibility
- Provides outside-in feedback

**Usage**:
```bash
~/.claude/agents/gpt-reviewer.sh "Review this feature" path/to/files.js
```

Main Claude uses this automatically when:
- You finish implementing a feature
- User asks to create a PR
- User requests a review
- UX validation is needed

#### Quick-Helper (GPT-5-mini)
**Triggers**: For simple, fast tasks

**What it does**:
- File searches and quick validations
- Simple transformations
- Fast lookups
- Batch operations

**Usage**:
```bash
~/.claude/agents/quick-helper.sh "Find all .test.js files in src/"
```

Main Claude uses this automatically for:
- Finding files by pattern
- Quick existence checks
- Simple grep operations
- Fast validations

### Delegation Philosophy

**Main Claude handles**:
- Complex reasoning and design decisions
- Feature implementation
- Architectural choices
- Project-specific context

**Delegate to helpers**:
- Testing → Test-Writer
- UX review → Reviewer
- Simple tasks → Quick-Helper

This keeps Main Claude focused on high-value work while helpers handle specialized or repetitive tasks.

### Skills Reference

The helper system uses delegation skills that Main Claude applies automatically:
- `.claude/skills/delegate-reviewer/` - When to use Reviewer agent
- `.claude/skills/delegate-quick-helper/` - When to use Quick-Helper agent

You don't need to know these details - Main Claude handles delegation automatically based on task type.

### Customizing Helper Behavior

**Copilot models available**:
```
copilot --model <model>

Models:
- gpt-5.2 (current Reviewer)
- gpt-5.1, gpt-5
- gpt-5-mini (current Quick-Helper)
- gpt-5.1-codex-max, gpt-5.1-codex
- claude-sonnet-4.5, claude-opus-4.5, claude-haiku-4.5
- gemini-3-pro-preview
```

To change a helper's model, edit the wrapper script:
- Reviewer: `~/.claude/agents/gpt-reviewer.sh`
- Quick-Helper: `~/.claude/agents/quick-helper.sh`

### Troubleshooting Helpers

**Helpers not initializing**:
```bash
# Check scripts exist
ls -la ~/.claude/agents/

# Make executable
chmod +x ~/.claude/agents/*.sh

# Run init manually
~/.claude/agents/init-session.sh
```

**Copilot commands failing**:
```bash
# Verify copilot CLI installed
copilot --version

# Check available models
copilot --help | grep -A 20 "model"
```

**Hook setup issues**:
- See `.claude/HOOK_SETUP.md` for detailed hook configuration
- Use `/hooks` command in Claude CLI to configure

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

### Plan Mode First (Boris's Principle #6)

**For non-trivial changes, start in Plan Mode before implementing:**

1. **When to use Plan Mode:**
   - Feature additions (new functionality)
   - Refactoring (restructuring existing code)
   - Spec changes (touching schemas, patterns, or architecture)
   - Multi-file changes (affects more than 2-3 files)
   - Unclear scope (need to explore before understanding)

2. **How to use Plan Mode:**
   - Enter with shift+tab twice, or say "let's plan this first"
   - Explore codebase using Glob, Grep, Read tools
   - Understand existing patterns and conventions
   - Design implementation approach
   - Get user approval before proceeding

3. **Plan Mode workflow:**
   ```
   User: "Add validation for chronological consistency in embeddings"
     ↓
   Plan Mode:
     1. Read current conformance validation code
     2. Review existing scenarios for patterns
     3. Design validation algorithm
     4. Identify files to modify (conformance.mjs, schema)
     5. Get user approval
     ↓
   Implementation:
     1. Switch to auto-accept edits mode (or manual approval)
     2. Implement according to plan
     3. Run /verify to confirm success
   ```

4. **Benefits of planning first:**
   - **Better alignment** - User approves approach before code is written
   - **Fewer iterations** - Implementation usually "1-shots" with a good plan
   - **Less waste** - Avoid writing code that goes in wrong direction
   - **Quality** - Boris: "A good plan is really important"

5. **When to skip Plan Mode:**
   - Single-line fixes (typos, obvious bugs)
   - Trivial changes (updating a constant, fixing a comment)
   - User has given very specific, detailed instructions

### Verification Loops (Boris's Principle #13 - MOST IMPORTANT)

**Always give Claude a way to verify its work. Verification loops 2-3x the quality of results.**

Use the `/verify` slash command after making changes:

```bash
/verify
```

This runs the complete verification suite:
1. **Conformance** - All scenarios pass schema validation
2. **Unit tests** - Pure function and sim logic tests
3. **Integration tests** (conditional) - Browser E2E tests if UI changed
4. **Browser check** (conditional) - Manual verification at localhost:5173
5. **Scenario analysis** (conditional) - If scenario data modified

**Iterate until verification passes.** Do not consider a task complete until all checks pass.

**Quick verification for specific checks:**
- `/test` - Run appropriate test suite for recent changes
- `npm run conformance` - Just schema validation
- `npm run test:unit` - Just unit tests

### AI Narrative API Server

The narrative generation API runs as a Docker container locally and requires Google Cloud credentials for Vertex AI.

**Starting the API:**
```bash
cd hddl-sim
docker build -t narrative-api .
docker run -d -p 8080:8080 \
  -v "$env:APPDATA\gcloud:/root/.config/gcloud:ro" \
  -e GOOGLE_CLOUD_PROJECT=your-gcp-project-id \
  -e GOOGLE_CLOUD_LOCATION=us-central1 \
  --name narrative-api-test \
  narrative-api
```

**Scenario generation harness (recommended for repeatable checks):**
```powershell
# Uses hddl-sim/.env if present (GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION)
.\hddl-sim\scripts\scenario-generation-harness.ps1
```

**Harness docs:** `hddl-sim/docs/Scenario_Generation_Test_Harness.md`

**Key points:**
- The `-v "$env:APPDATA\gcloud:/root/.config/gcloud:ro"` mount is **required** to pass host gcloud credentials into the container
- Without this mount, you'll get `GoogleAuthError: Unable to authenticate`
- Make sure you've run `gcloud auth login` on your host machine first
- API will be available at `http://localhost:8080`
- Check health: `curl http://localhost:8080/health`

**Generation config:**
- Model: `gemini-3-flash-preview`
- Max output tokens: `8192` (set in `api/narrative-lib.mjs`)
- If narratives are truncated mid-sentence, increase `maxOutputTokens`

### When to Run Tests
- Before committing
- After completing a feature set
- When explicitly requested
- NOT after every small UI tweak

### When to Run the Scenario Generation Harness
- After changing scenario generation prompt/validation (`hddl-sim/api/**`)
- When investigating analyzer failures/warnings for generated scenarios
- Not for tight UI iteration; it requires Docker + Vertex AI credentials

## Advanced Workflows

### Parallel Sessions (Boris's Principles #1-2)

Boris runs **5 terminal Claudes + 5-10 web Claudes in parallel**. This enables maximum productivity for complex projects.

**Terminal Sessions (Local):**
```bash
# Terminal tab 1: Main feature work
claude

# Terminal tab 2: Test writing
claude --agent test-writer

# Terminal tab 3: Code review / simplification
claude --agent simplify-code

# Terminal tab 4: Scenario validation
claude --agent verify-scenario

# Terminal tab 5: Quick tasks / exploration
claude --model haiku
```

**Tips for parallel workflows:**
- Number your terminal tabs 1-5 for quick switching
- Use system notifications to know when a Claude needs input
- Delegate independent subtasks to different sessions
- Keep one session as "main" for orchestration
- Use haiku for fast exploratory sessions (cheap, quick)

**Web Sessions (claude.ai/code):**
- Start sessions from phone (Claude iOS app) in the morning
- Check in on them throughout the day
- Use `&` to hand off local sessions to web
- Use `--teleport` to transfer sessions back and forth
- Good for long-running tasks (scenario generation, analysis)

**When to use parallel sessions:**
- ✓ Large features with multiple independent parts
- ✓ Code + tests can be written simultaneously
- ✓ Long-running analysis while you continue coding
- ✓ Exploration sessions while main session implements

**When NOT to use parallel sessions:**
- ✗ Simple, linear tasks
- ✗ Tasks with strong dependencies (must finish A before B)
- ✗ Learning a new codebase (stick to one session)

### Using Ralph-Wiggum for Long-Running Tasks

The Ralph-Wiggum plugin enables autonomous, unattended iteration for tasks that take hours.

**How it works:**
1. Start a Claude session with a task
2. Invoke `/ralph-loop` to enable autonomous mode
3. Claude will iterate on the task, verifying its work
4. Periodically checks in and reports progress
5. Runs until success or timeout

**When to use Ralph-Wiggum:**
```bash
# Scenario generation + validation loop
claude --permission-mode=dontAsk
> Generate 5 test scenarios and validate each with verify-scenario agent
> /ralph-loop

# Test suite fixing
claude --dangerously-skip-permissions  # in sandbox
> Fix all failing tests, iterate until full green suite
> /ralph-loop

# Performance optimization
> Profile the app, identify bottlenecks, optimize until <100ms render time
> /ralph-loop
```

**Ralph-Wiggum commands:**
- `/ralph-loop` - Start autonomous iteration
- `/cancel-ralph` - Stop the loop
- `/help ralph` - Show Ralph-Wiggum guide

**Safety notes:**
- Use with `--permission-mode=dontAsk` to avoid blocking on permissions
- Best in sandboxed environments for full autonomy
- Set clear success criteria so Ralph knows when to stop
- Monitor periodically (sessions can run for hours)

### Using Subagents

Subagents are specialized agents that handle focused workflows (Boris's Principle #8).

**Available subagents:**
- `test-writer` - Write comprehensive tests for code changes
- `verify-scenario` - Full scenario validation pipeline
- `simplify-code` - Refactor and clean up after implementation
- `conformance-checker` - Fast schema validation

**Invoking subagents:**
```bash
# Via --agent flag (takes over the whole session)
claude --agent test-writer

# Via Task tool delegation (from main Claude)
> "Use the test-writer agent to add test coverage for the new utility functions"

# Via background execution
> "When you're done implementing, verify with the verify-scenario agent"
```

**Subagent workflow pattern:**
1. Main session implements feature
2. Delegate to test-writer for tests
3. Delegate to simplify-code for cleanup
4. Delegate to verify-scenario for validation
5. Main session reviews and commits

**Boris's insight:** Subagents automate common workflows that you'd do for most PRs.

### Chrome Extension for Visual Verification

The Claude Chrome extension enables **automated browser testing** - Claude can control Chrome, interact with your app, and verify visual appearance.

**Boris's Principle #13 (Most Important Part):**
> "Claude tests every single change I land to claude.ai/code using the Claude Chrome extension. It opens a browser, tests the UI, and iterates until the code works and the UX feels good."

🔗 Reference: `code.claude.com/docs/en/chrome`

**Enable Chrome extension:**
```bash
# In current session
claude --chrome

# Or add to .claude/settings.json
{
  "chrome": true
}
```

**What Claude can do with Chrome:**
- ✓ Launch and control Chrome browser
- ✓ Navigate to URLs (localhost:5173, production sites)
- ✓ Click buttons, type text, scroll, interact like a human
- ✓ Verify visual appearance and layout
- ✓ Check for console errors
- ✓ Take screenshots for documentation
- ✓ Iterate if something doesn't work

**Perfect for HDDL's visual scenario viewer:**

```bash
# Automated UI verification
/verify-ui insurance

# What happens:
# 1. Launches Chrome
# 2. Navigates to localhost:5173
# 3. Selects "insurance" scenario
# 4. Verifies particles render correctly
# 5. Checks steward colors are distinct
# 6. Tests interactions (hover, click, play)
# 7. Confirms animations smooth
# 8. Takes screenshots
# 9. Reports pass/fail with evidence
```

**Advantages over Playwright:**
- **Visual verification** - Claude can see if it "looks right"
- **Interactive debugging** - Can iterate and try different approaches
- **Screenshots** - Visual proof for PRs
- **Real browser** - Same environment users see
- **Flexible** - Can handle dynamic, complex UIs

**Example workflow:**
```bash
# After implementing UI feature
claude --chrome

> I just updated the particle rendering. Please verify it works:
> 1. Load the insurance scenario
> 2. Verify all 12 steward colors are distinct
> 3. Check that particle labels don't overlap at FULL detail
> 4. Confirm the timeline shows proper distribution
> 5. Take a screenshot showing the final result

# Claude will:
# - Open Chrome
# - Test each requirement
# - Iterate if issues found
# - Report with screenshots
```

**When to use Chrome extension:**
- ✓ After UI changes (layout, styling, interactions)
- ✓ Before creating PR with visual changes
- ✓ When debugging "it doesn't look right" issues
- ✓ For complex visual verification beyond Playwright
- ✓ To document visual state with screenshots

**Integration with verification pipeline:**

The `/verify` command now includes Chrome-based visual verification:
1. Conformance (fast schema check)
2. Unit tests (pure logic)
3. Integration tests (Playwright E2E)
4. **UI verification** (Chrome visual check) ← NEW!
5. Scenario analysis (structure validation)

**Boris's insight:** Visual verification 2-3x more thorough than automated tests alone. The Chrome extension makes this practical and repeatable.

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
npm test                      # Playwright integration tests (includes conformance via pretest)
npm run test:unit             # Vitest unit tests
npm run test:unit:watch       # Unit tests in watch mode
npm run test:unit:coverage    # Unit coverage report (TS-target KPI)
npm run test:coverage:e2e     # E2E/Istanbul coverage report (critical-flow KPI)
```

```powershell
.\hddl-sim\scripts\scenario-generation-harness.ps1   # Docker + /generate-scenario + analyzer loop
```

### Two Kinds of "Coverage" (Intentional)

- **Unit coverage (Vitest) is our TS-readiness KPI.** It is intentionally scoped to the TS-target surfaces:
  - `hddl-sim/src/sim/**`
  - `hddl-sim/src/components/map/**`
- **E2E coverage (Playwright + Istanbul) is our critical browser journey KPI.** It measures what a Playwright run actually executed in the browser and is not expected to be 100%.

**Report outputs:**
- Unit coverage HTML: `hddl-sim/coverage/unit/index.html`
- E2E coverage HTML: `hddl-sim/coverage/e2e/index.html`

### Test Infrastructure

| Type | Location | Framework | Speed |
|------|----------|-----------|-------|
| Unit Tests | `src/**/*.test.js` | Vitest | Fast (<1s) |
| Integration | `tests/*.spec.js` | Playwright | Slow (1-2min) |
| Coverage (unit) | `src/**` (scoped) | Vitest v8 | Fast |
| Coverage (E2E) | `tests/istanbul-coverage.spec.js` | Istanbul | ~30s |

### Current Status

- Coverage and test counts are expected to change frequently during refactors.
- For current numbers, run `npm run test:unit:coverage` (unit KPI) and `npm run test:coverage:e2e` (E2E KPI).
- See `.github/instructions/hddl-sim-tests.instructions.md` for detailed testing guidelines.

### When to Run Which Tests

| Situation | Command | Why |
|-----------|---------|-----|
| Developing UI | `npm run dev` + browser | HMR is faster than tests |
| New pure function | `npm run test:unit:watch` | Instant feedback |
| Before commit | `npm test` | Full validation |
| Checking unit KPI coverage | `npm run test:unit:coverage` | TS-target coverage |
| Checking E2E KPI coverage | `npm run test:coverage:e2e` | Browser journey execution |
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
  - Default perf scenario: `test-minimal` (fast, predictable baseline)
  - Run: `npm run performance` (defaults to `test-minimal`; requires dev server running)
  - Override: `npm run performance <scenario-name>`

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
- Every revision has embedding
- Every boundary interaction has embedding
- Retrievals only reference chronologically valid embeddings
- Boundaries should have preceding retrieval
- Steward decisions should have embeddings
- Scenarios should have historical baseline

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
1. Schema: Added optional `boundary_reason: { type: "string" }`
2. Scenario: Added to 6 boundary_interactions in insurance scenario
3. Code: Updated hddl-map.js to show reason in particle labels
4. Docs: Created Schema_Enhancement_Boundary_Reason.md
5. Docs: Updated Implementers_Guide.md with FAQ
6. Docs: Updated PARTICLE_FLOW_RULES.md with reason codes
7. Tests: Schema validates, browser shows new labels

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

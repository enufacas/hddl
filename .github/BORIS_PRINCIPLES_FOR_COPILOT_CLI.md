# GitHub Copilot CLI Setup Guide

**Inspired by:** Boris's Claude Code setup principles (Claude Code creator)  
**Adapted for:** GitHub Copilot CLI context and workflows  
**Project:** HDDL - Human-Defined Decision Line

---

## Core Philosophy

The principles from Boris's Claude Code setup translate powerfully to GitHub Copilot CLI. The key insight remains:

> **"Give the agent a way to verify its work. If it has that feedback loop, it will 2-3x the quality of the final result."**

This guide shows how to apply proven AI coding workflows to GitHub Copilot CLI's unique capabilities.

---

## The 13 Principles (Adapted for Copilot CLI)

### 1. Run Multiple Sessions in Parallel

**Boris's approach:** 5 Claude Code sessions in parallel terminal tabs with system notifications.

**Copilot CLI equivalent:**

```bash
# Terminal 1: Main development session
copilot --model claude-sonnet-4.5

# Terminal 2: Testing/verification session
copilot --model gpt-5-mini --add-dir ./tests

# Terminal 3: GitHub operations session
copilot --model gpt-5.2

# Terminal 4: Documentation/analysis
copilot --model claude-haiku-4.5

# Terminal 5: Background long-running task
copilot --model claude-opus-4.5 --allow-all-tools --add-dir .
```

**Copilot CLI advantages:**
- Each session can use a different model optimized for its task
- Sessions are independent and resumable (`--continue`, `--resume`)
- Can hand off work to cloud agent with `/delegate` in any session
- Share session state via `/share gist` for collaboration

**Setup tip:**
- Use Windows Terminal or iTerm2 with named tabs
- Enable terminal notifications for when sessions need input
- Use `copilot --resume` to quickly switch between saved sessions

### 2. Mix Local and Web Sessions

**Boris's approach:** Mix 5 local Claudes with 5-10 web sessions, teleport between them.

**Copilot CLI equivalent:**

```bash
# Local CLI session for exploration
copilot
> "Analyze the authentication flow in @src/auth/"
> "What edge cases are we missing?"

# Hand off to cloud agent for implementation
/delegate "Implement rate limiting for authentication endpoints with Redis backend. Add tests and update docs."

# Cloud agent creates PR on GitHub.com
# Continue local work on something else
> "Now let's look at the billing system..."

# Resume local session later to review cloud agent's work
copilot --continue
> "Pull the branch from PR #123 and verify the rate limiting works"
```

**Copilot CLI advantages:**
- `/delegate` hands off work to GitHub Copilot coding agent (cloud)
- Local context preserved while cloud agent works
- Can start sessions from anywhere (desktop, phone, web)
- Session sharing via `/share gist` enables async collaboration

**Setup tip:**
- Use `/delegate` for PR-worthy work that can continue without you
- Use local sessions for exploration and iteration
- Check GitHub notifications for cloud agent PR completion

### 3. Choose Models Strategically

**Boris's approach:** Opus 4.5 with thinking for everything.

**Copilot CLI equivalent:**

```bash
# Fast exploration with GPT-5-mini
copilot --model gpt-5-mini
> "Find all files using the old API pattern"

# Complex reasoning with Claude Opus 4.5
copilot --model claude-opus-4.5
> "Refactor the entire authentication system to use OAuth2"

# Security review with GPT-5.2
copilot --model gpt-5.2
> "Review @src/auth/ for security vulnerabilities"

# Switch models mid-session
/model claude-sonnet-4.5
> "Now implement the changes we discussed"
```

**Copilot CLI advantages:**
- Switch models mid-session with `/model`
- Choose model per task (speed vs. quality tradeoff)
- Available models: GPT-5.x, Claude 4.5 family, Gemini 3 Pro
- Cost optimization: use mini for simple tasks, opus for complex

**Setup tip:**
- Start with fast model for exploration
- Switch to powerful model for implementation
- Use GPT-5.2 for final review/polish
- Set default model in `~/.copilot/config.json`

### 4. Shared Instructions in Git

**Boris's approach:** Team shares `CLAUDE.md` in git, update it weekly.

**Copilot CLI equivalent:**

Copilot CLI reads multiple instruction sources:

```
.github/copilot-instructions.md          # Repository-wide instructions
.github/copilot-instructions/**/*.instructions.md  # Path-specific
AGENTS.md, CLAUDE.md, GEMINI.md          # Agent/model-specific
~/.copilot/copilot-instructions.md       # User-level
```

**For HDDL project:**

```markdown
# .github/copilot-instructions.md

## Development Rules
- Always run conformance after scenario changes: `npm run conformance`
- Use Vite dev server for iteration, not Playwright tests
- Every revision MUST have an embedding
- Embeddings must be chronologically consistent with retrievals

## Common Mistakes to Avoid
- Don't fabricate project timelines or effort estimates
- Don't run tests after every small UI change
- Don't add embeddings without sourceEventId
- Don't create retrievals that reference future embeddings

## Verification Workflow
1. Run conformance: `npm run conformance`
2. Check dev server: http://localhost:5173
3. Inspect browser console for errors
4. Run targeted tests if needed
```

**Setup tip:**
- Check instructions into git
- Team updates during code review
- Keep concise and actionable
- Reference from PRs when adding new rules

### 5. Update Instructions During Code Review

**Boris's approach:** Tag `@.claude` on PRs to update `CLAUDE.md`.

**Copilot CLI equivalent:**

```bash
# During PR review, update instructions
copilot
> "Add this to .github/copilot-instructions.md: Never use time paradoxes in scenario embeddings - retrievals can only reference embeddings created before the retrieval timestamp"

# Or use cloud agent to do it
/delegate "Review PR #123 and add any new patterns or mistakes to .github/copilot-instructions.md"
```

**GitHub Actions integration:**

```yaml
# .github/workflows/update-instructions.yml
name: Update Copilot Instructions
on:
  pull_request:
    types: [closed]
  workflow_dispatch:
    inputs:
      lesson:
        description: 'Lesson learned to add to instructions'
        required: true

jobs:
  update:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Update instructions with PR lessons
        run: |
          echo "## Lesson from PR #${{ github.event.pull_request.number }}" >> .github/copilot-instructions.md
          echo "${{ github.event.inputs.lesson }}" >> .github/copilot-instructions.md
      - name: Create PR
        run: gh pr create --title "Update instructions from PR review" --body "Auto-generated from merged PR"
```

**Setup tip:**
- Review merged PRs weekly for patterns
- Add common mistakes to instructions immediately
- Use GitHub Copilot CLI to query PRs: `copilot` → `"Show PRs merged this week with test failures"`

### 6. Start with Planning

**Boris's approach:** Most sessions start in Plan mode (shift+tab twice), iterate on plan before coding.

**Copilot CLI equivalent:**

```bash
copilot --model claude-opus-4.5

# Start with planning prompt
> "I need to add rate limiting to our API endpoints. Before making any changes, let's create a detailed plan that covers:
- Which endpoints need rate limiting
- What storage backend to use (Redis vs in-memory)
- How to handle rate limit errors (429 responses)
- Where to add tests
- What documentation needs updating
- Migration path for existing deployments

Please create a step-by-step implementation plan. Don't make any changes yet."

# Iterate on the plan
> "The Redis approach makes sense, but let's use a sliding window algorithm instead of fixed window. Update the plan."

> "Good. Now I approve this plan. Let's implement step 1: add Redis client configuration."
```

**For HDDL project planning:**

```bash
copilot

> "I need to add support for multi-actor feedback loops in scenarios. Before implementing, create a plan covering:
- JSON schema changes needed
- Backward compatibility with existing scenarios
- Particle flow visualization updates
- Analyzer validation rules
- Test scenarios to demonstrate the feature
- Documentation updates

Don't make changes yet - let's review the plan first."
```

**Setup tip:**
- Use planning prompt template for complex features
- Iterate on plan before any code changes
- Save good plans: `/share file plan.md`
- Reference plan during implementation: `> "Continue with step 3 from our plan"`

### 7. Slash Commands for Inner Loops

**Boris's approach:** Slash commands in `.claude/commands/` for repeated workflows like `/commit-push-pr`.

**Copilot CLI equivalent:**

Copilot CLI uses **skills** (Node.js modules) for workflow automation:

```bash
# Check current skills
copilot
/skills list

# In HDDL project, we have:
# - api-monitor (project skill)
# - delegate-quick-helper (project skill)
# - delegate-reviewer (project skill)
```

**Create inner loop skills for HDDL:**

```javascript
// .copilot/skills/verify-scenario/index.js
module.exports = {
  async execute(context) {
    const { scenario } = context.args;
    
    // Run conformance
    await context.shell('npm run conformance');
    
    // Validate specific scenario
    await context.shell(`node hddl-sim/analysis/scenario-analysis.mjs ${scenario}`);
    
    // Check dev server
    const devCheck = await context.shell('curl -s http://localhost:5173/health');
    
    return {
      success: true,
      message: `Scenario ${scenario} validated successfully`
    };
  }
};
```

```javascript
// .copilot/skills/commit-push-pr/index.js
module.exports = {
  async execute(context) {
    const { message } = context.args;
    
    // Run verification first
    await context.shell('npm run conformance');
    await context.shell('npm test');
    
    // Git operations
    await context.shell('git add .');
    await context.shell(`git commit -m "${message}"`);
    await context.shell('git push');
    
    // Create PR using GitHub MCP
    const pr = await context.github.createPullRequest({
      title: message,
      body: 'Auto-generated PR from Copilot CLI'
    });
    
    return { prUrl: pr.html_url };
  }
};
```

**Setup tip:**
- Identify workflows you do 5+ times per week
- Create skill for each workflow
- Use skills from interactive mode: `/skills info verify-scenario`
- Share skills in `.copilot/skills/` directory in git

### 8. Custom Agents for Common Workflows

**Boris's approach:** Subagents like `code-simplifier`, `verify-app` for common PR workflows.

**Copilot CLI equivalent:**

```bash
# Create custom agent profiles in ~/.copilot/agents/
```

**Example: Scenario Verifier Agent**

```json
// ~/.copilot/agents/scenario-verifier.json
{
  "name": "scenario-verifier",
  "description": "Validates HDDL scenarios for conformance and closed-loop requirements",
  "systemPrompt": "You are a scenario validation expert. Check scenarios for: (1) Every revision has embedding, (2) Every boundary_interaction has embedding, (3) Chronological consistency of retrievals, (4) Semantic vector space validity, (5) Closed feedback loops. Use npm run conformance and scenario-analysis.mjs tools.",
  "tools": ["read", "shell"],
  "model": "claude-sonnet-4.5",
  "workingDirectory": "./hddl-sim"
}
```

**Example: Code Simplifier Agent**

```json
// ~/.copilot/agents/code-simplifier.json
{
  "name": "code-simplifier",
  "description": "Simplifies code after implementation",
  "systemPrompt": "Simplify code by: (1) Removing unnecessary abstractions, (2) Combining similar functions, (3) Removing dead code, (4) Improving naming, (5) Adding clarifying comments only where needed. Preserve all functionality and tests.",
  "tools": ["read", "edit", "shell"],
  "model": "gpt-5.2"
}
```

**Usage:**

```bash
copilot
/agent
# (select scenario-verifier from list)

> "Verify the insurance scenario and report all issues"

# Or invoke directly
> "Use the code-simplifier agent to simplify @src/sim/steward-colors.js"
```

**Setup tip:**
- Create agent for each common workflow
- Store in `~/.copilot/agents/` (user) or `.github/agents/` (project)
- Use specific models per agent (e.g., GPT-5-mini for simple tasks)
- Reference agents in custom instructions

### 9. Post-Processing with Hooks

**Boris's approach:** `PostToolUse` hook for code formatting.

**Copilot CLI equivalent:**

Copilot CLI doesn't have hooks, but you can achieve similar results with:

**Option 1: Skills that run formatters**

```javascript
// .copilot/skills/auto-format/index.js
module.exports = {
  triggers: ['after:edit', 'after:create'],
  async execute(context) {
    const { file } = context.lastOperation;
    
    // Format based on file type
    if (file.endsWith('.js')) {
      await context.shell(`npx prettier --write ${file}`);
    } else if (file.endsWith('.json')) {
      await context.shell(`npx prettier --write ${file}`);
    }
    
    return { formatted: true };
  }
};
```

**Option 2: Shell script wrapper**

```bash
#!/bin/bash
# ~/bin/copilot-with-format

# Run copilot with prompt
copilot "$@"

# Format after exit
npx prettier --write "src/**/*.js"
npm run lint:fix
```

**Option 3: Include in prompts**

Add to `.github/copilot-instructions.md`:

```markdown
## Code Formatting
After editing any .js or .json file, always run:
- `npx prettier --write <file>`
- Verify formatting with `npm run lint`
```

**Setup tip:**
- Use prettier/eslint in CI to catch formatting issues
- Add formatting to verification loops
- Consider creating a `/format` skill

### 10. Pre-Configure Permissions

**Boris's approach:** Use `/permissions` to pre-allow safe commands, avoid `--dangerously-skip-permissions`.

**Copilot CLI equivalent:**

```bash
# Add trusted directories
copilot
/add-dir ~/projects/hddl
/add-dir ~/projects/hddl/hddl-sim
/list-dirs

# Pre-allow safe tools during session
copilot \
  --add-dir ~/projects/hddl \
  --allow-tool 'shell(git:*)' \
  --allow-tool 'shell(npm:*)' \
  --allow-tool 'shell(node:*)' \
  --allow-tool 'shell(docker:*)' \
  --allow-tool 'edit' \
  --allow-tool 'read'
```

**Save to config:**

```json
// ~/.copilot/config.json
{
  "permissions": {
    "allowedDirectories": [
      "~/projects/hddl",
      "~/projects/hddl/hddl-sim"
    ],
    "allowedTools": [
      "shell(git:*)",
      "shell(npm:*)",
      "shell(node:*)",
      "shell(docker:*)",
      "edit",
      "read",
      "create"
    ],
    "deniedTools": [
      "shell(rm:*)",
      "shell(del:*)"
    ]
  }
}
```

**For HDDL project:**

```bash
# Safe commands to pre-approve
--allow-tool 'shell(npm:run:*)'           # npm run scripts
--allow-tool 'shell(git:status)'          # git status
--allow-tool 'shell(git:diff)'            # git diff
--allow-tool 'shell(git:add)'             # git add
--allow-tool 'shell(git:commit)'          # git commit
--allow-tool 'shell(node:hddl-sim/*)'     # Node scripts in hddl-sim
--allow-tool 'shell(docker:ps)'           # Docker status
--allow-tool 'shell(docker:logs:*)'       # Docker logs

# Dangerous commands to deny
--deny-tool 'shell(rm:*)'                 # rm commands
--deny-tool 'shell(del:*)'                # delete commands
--deny-tool 'shell(docker:rm:*)'          # docker rm
```

**Setup tip:**
- Start conservative, add permissions as needed
- Share config in `.copilot/config.json` in git
- Use `--allow-all-tools` only in sandboxes
- Review permissions weekly

### 11. Use All Your Tools via MCP

**Boris's approach:** Claude Code uses Slack, BigQuery, Sentry via MCP servers.

**Copilot CLI equivalent:**

```bash
copilot
/mcp show
# Lists:
# - github-mcp-server (built-in)

# Add MCP servers for HDDL project
/mcp add google-cloud
# Configure: gcloud commands for Cloud Run logs

/mcp add docker
# Configure: Docker commands for narrative-api container

/mcp add postgres
# Configure: Database access for future analytics
```

**Example MCP configs for HDDL:**

```json
// ~/.copilot/mcp-config.json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "gcloud": {
      "command": "gcloud",
      "args": ["interactive"],
      "description": "Access Google Cloud Run logs and services"
    },
    "docker": {
      "command": "docker",
      "args": ["exec", "-i"],
      "description": "Interact with running Docker containers"
    }
  }
}
```

**Usage with MCP:**

```bash
copilot

# Query GitHub directly
> "Show all open issues labeled 'scenario-generation'"
> "What PRs were merged last week?"
> "Show the diff for commit abc123"

# Query Cloud Run logs (with gcloud MCP)
> "Show errors from narrative-api in the last hour"
> "What's the average response time for /generate-scenario today?"

# Interact with Docker (with docker MCP)
> "Check if narrative-api container is running"
> "Show logs from narrative-api container"
```

**Setup tip:**
- Enable GitHub MCP (built-in)
- Add MCP for tools you use daily (Docker, gcloud, databases)
- Check MCP marketplace for pre-built servers
- Share MCP configs in git (minus secrets)

### 12. Long-Running Tasks

**Boris's approach:** Background agents for verification, agent hooks, ralph-wiggum plugin, use `--dangerously-skip-permissions` in sandbox.

**Copilot CLI equivalent:**

```bash
# Option 1: Detached mode with pre-approved permissions
copilot \
  --model claude-opus-4.5 \
  --prompt "Refactor entire test suite to use Vitest best practices. Run tests after each change to verify." \
  --allow-all-tools \
  --add-dir ~/projects/hddl/hddl-sim \
  --silent

# Option 2: Interactive session with /delegate to cloud agent
copilot
> "I need to refactor the entire test suite to use Vitest best practices. This will take a while."

/delegate "Refactor all tests in hddl-sim/tests/ to use Vitest best practices: proper mocking, async/await, clear test names. Run tests after each file to verify. When done, run full test suite and report results."

# Cloud agent works in background on GitHub
# You get notification when PR is ready

# Option 3: Long-running session with verification loop
copilot --model claude-opus-4.5

> "Refactor the test suite. After each file, run: npm test -- <file>. If tests fail, fix them before moving to next file. When all files are done, run: npm test. Report final results."

# Walk away, copilot will iterate until tests pass
```

**For HDDL project long-running tasks:**

```bash
# Scenario generation improvements
/delegate "Improve scenario generation prompt to produce more realistic timelines. Test with 10 generations and run analyzer on each. Iterate until analyzer warnings < 5 per scenario."

# Performance optimization
copilot --model claude-opus-4.5
> "Optimize particle animation performance. Measure FPS with performance-metrics.mjs after each change. Goal: 60 FPS at FULL detail level with 1000 particles. Iterate until achieved."

# Migration tasks
/delegate "Migrate all scenarios from old embedding format to new format with chronological validation. Run conformance after each scenario. Fix any issues before next scenario."
```

**Setup tip:**
- Use `/delegate` for PR-worthy long tasks
- Use local session with verification loops for iteration
- Pre-approve tools for long tasks to avoid blocking
- Set up custom agent with verification built-in

### 13. Always Provide a Verification Loop (MOST IMPORTANT)

**Boris's approach:** "Give Claude a way to verify its work. If Claude has that feedback loop, it will 2-3x the quality of the final result."

**Copilot CLI equivalent:**

Create comprehensive verification loops for HDDL project:

**Level 1: Basic Verification**

```bash
copilot

> "After making changes to any scenario, always run:
1. npm run conformance
2. node hddl-sim/analysis/scenario-analysis.mjs <scenario-name>
3. Check output for errors/warnings
4. If warnings exist, fix them and run again
5. Only when clean, consider the task complete"
```

**Level 2: Full Stack Verification**

```bash
copilot

> "After making changes to simulation code, run this verification loop:
1. npm run conformance (scenario validation)
2. npm run test:unit (fast unit tests)
3. Start dev server: cd hddl-sim && npm run dev
4. Open http://localhost:5173 in browser
5. Load the test-minimal scenario
6. Check browser console for errors
7. Verify particles render correctly
8. If errors exist, fix and repeat from step 1
9. Only when all steps pass, consider complete"
```

**Level 3: Performance Verification**

```bash
copilot

> "After making animation changes, run this performance loop:
1. Ensure dev server is running
2. npm run performance (measures FPS, render time)
3. If FPS < 60, profile and optimize
4. Re-run performance metrics
5. Iterate until FPS ≥ 60 at FULL detail
6. Run conformance to ensure optimization didn't break semantics
7. Only when performance and conformance pass, complete"
```

**Level 4: End-to-End Verification**

```bash
copilot

> "After making changes to scenario generation API, run:
1. cd hddl-sim && docker build -t narrative-api .
2. docker run -d -p 8080:8080 -v \"$env:APPDATA\\gcloud:/root/.config/gcloud:ro\" -e GOOGLE_CLOUD_PROJECT=hddl-demo -e GOOGLE_CLOUD_LOCATION=us-central1 --name narrative-api-test narrative-api
3. Wait 30 seconds for startup
4. curl http://localhost:8080/health (should return 200)
5. Run: ./hddl-sim/scripts/scenario-generation-harness.ps1
6. Check harness output for analyzer warnings
7. If warnings exist, update prompt and rebuild
8. docker stop narrative-api-test && docker rm narrative-api-test
9. Iterate until harness runs clean
10. Only then is API change complete"
```

**Create verification custom agent:**

```json
// .github/agents/hddl-verifier.json
{
  "name": "hddl-verifier",
  "description": "Comprehensive HDDL project verifier",
  "systemPrompt": "You verify HDDL changes by running: (1) npm run conformance, (2) scenario-analysis.mjs on changed scenarios, (3) npm test for code changes, (4) check dev server at localhost:5173, (5) inspect browser console for errors, (6) verify particle rendering. Report all issues found. If issues exist, you MUST fix them and re-verify. Never report success with outstanding warnings or errors.",
  "tools": ["read", "shell", "web_fetch"],
  "model": "claude-sonnet-4.5",
  "workingDirectory": "./hddl-sim",
  "verificationLoop": true
}
```

**Usage:**

```bash
copilot

# Make some changes
> "Add support for multi-actor boundary interactions"

# Invoke verifier
> "Use the hddl-verifier agent to verify my changes"

# Verifier will:
# 1. Run all verification steps
# 2. Report issues if found
# 3. Fix issues automatically
# 4. Re-verify until clean
# 5. Report success only when all checks pass
```

**Add to .github/copilot-instructions.md:**

```markdown
## Verification Workflow (REQUIRED)

After ANY change to:
- Scenarios (*.scenario.json): Run conformance + scenario-analysis
- Simulation code (src/sim/*.js): Run unit tests + dev server check
- UI components (src/components/*.js): Run dev server + browser console check
- API code (hddl-sim/api/*.mjs): Run scenario-generation-harness

NEVER consider a task complete without running verification.
ALWAYS fix issues found before moving to next task.
ALWAYS re-verify after fixes.

Use the hddl-verifier agent for comprehensive verification.
```

**Setup tip:**
- Make verification automatic, not optional
- Build verification into prompts
- Create verification agent with built-in loops
- Add verification to `/commit-push-pr` skill
- Measure success by "changes landed without revert" metric

---

## HDDL Project Implementation Checklist

Based on Boris's principles, here's what to implement for HDDL:

### High Priority (Immediate)

- [ ] **Verification agent** - Create `hddl-verifier` custom agent with full loop
- [ ] **Update copilot-instructions.md** - Add verification requirements, common mistakes
- [ ] **Pre-configure permissions** - Add safe commands to config
- [ ] **Create `/verify-scenario` skill** - One-command verification
- [ ] **Create `/commit-push-pr` skill** - Includes verification before commit

### Medium Priority (This Week)

- [ ] **Create planning prompt template** - For complex features
- [ ] **Add MCP servers** - gcloud (Cloud Run logs), docker (narrative-api)
- [ ] **Create `code-simplifier` agent** - Run after implementation
- [ ] **Create `scenario-verifier` agent** - Specialized for scenarios
- [ ] **Document model strategy** - When to use which model

### Low Priority (Nice to Have)

- [ ] **Session templates** - Common starting points (`--resume` templates)
- [ ] **Verification dashboard** - Track verification pass rates
- [ ] **GitHub Action** - Update instructions from PR reviews
- [ ] **Team workflow docs** - How to collaborate with copilot CLI
- [ ] **Performance baselines** - Track FPS/render time over time

---

## Key Differences: Claude Code vs Copilot CLI

| Aspect | Claude Code | Copilot CLI | Impact |
|--------|-------------|-------------|---------|
| **Parallel Sessions** | Same tool, different tabs | Different models possible | Copilot: more flexibility |
| **Web/Local Mix** | Teleport between web/local | /delegate to cloud agent | Copilot: clearer handoff |
| **Planning** | Plan mode (shift+tab) | Planning prompts | Similar capability |
| **Slash Commands** | `.claude/commands/` | Skills (Node.js modules) | Copilot: more powerful |
| **Subagents** | Built-in subagents | Custom agent profiles | Copilot: more customizable |
| **Hooks** | PostToolUse, etc. | No hooks (use skills) | Claude: more automated |
| **Permissions** | `/permissions` command | Config + CLI flags | Similar capability |
| **MCP** | Built-in support | GitHub MCP + custom | Copilot: GitHub integration |
| **Verification** | Background agents | Verification agents | Similar capability |
| **Model Choice** | Fixed per session | Switch mid-session | Copilot: more flexible |

---

## Real-World HDDL Workflows

### Workflow 1: Add New Scenario

```bash
copilot --model claude-sonnet-4.5

# Plan first
> "I need to add a healthcare scenario showing agent learning about prior authorization patterns. Before implementing, create a plan covering: domain context, actor types, boundary interactions, feedback loops, timeline, validation requirements."

# Iterate on plan
> "Good plan. Add: more retrieval events showing agent memory usage, and a revision that updates authorization criteria based on escalation patterns."

# Implement
> "Approved. Create healthcare.scenario.json following the plan."

# Verify automatically
> "Use hddl-verifier agent to validate the new scenario."

# Fix any issues found
# (verifier will iterate until clean)

# Commit and PR
> "Run /commit-push-pr with message: 'Add healthcare scenario demonstrating prior authorization learning'"
```

### Workflow 2: Optimize Performance

```bash
copilot --model claude-opus-4.5

# Set verification goal
> "I need to optimize particle animation performance. Goal: 60 FPS at FULL detail with 1000 particles. After each change, run performance-metrics.mjs to measure. Iterate until goal is achieved. Don't break existing functionality - run conformance and tests after each change."

# Walk away
# Copilot will:
# 1. Profile current performance
# 2. Identify bottlenecks
# 3. Make optimization
# 4. Run performance-metrics.mjs
# 5. Check FPS
# 6. If < 60 FPS, try different approach
# 7. Run conformance to ensure semantics preserved
# 8. Iterate until goal achieved
# 9. Report final results
```

### Workflow 3: Improve Scenario Generation

```bash
copilot --model gpt-5.2

# Hand off to cloud agent
/delegate "Improve scenario generation prompt to produce more realistic boundary interaction timelines. Test by generating 10 scenarios and running analyzer on each. Iterate until average warnings per scenario < 3. Update documentation with new prompt guidelines."

# Cloud agent will:
# 1. Analyze current prompt
# 2. Identify timeline issues
# 3. Update prompt
# 4. Build and run Docker container
# 5. Generate 10 test scenarios
# 6. Run analyzer on each
# 7. Calculate average warnings
# 8. If > 3, iterate on prompt
# 9. Repeat until goal met
# 10. Update docs
# 11. Create PR for review
```

---

## Measuring Success

Track these metrics to validate the setup:

### Quality Metrics
- **Changes landed without revert**: Target > 95%
- **Verification pass rate**: Target > 90% on first try
- **Analyzer warnings per scenario**: Target < 5
- **Test pass rate**: Target 100%

### Efficiency Metrics
- **Time to first working PR**: Measure improvement over time
- **Number of manual verification steps**: Minimize
- **Iteration cycles per feature**: Track and reduce
- **Context switches during development**: Minimize

### Process Metrics
- **Instructions updates per week**: Track team learning
- **Verification loops used**: Should be 100%
- **Skills created**: Track automation growth
- **MCP servers added**: Track tooling integration

---

## Further Reading

- **Boris's original setup**: `.claude/BORIS_SETUP.md`
- **Tooling architecture**: `.claude/AI_TOOLING_ARCHITECTURE.md`
- **Copilot CLI docs**: https://docs.github.com/copilot/concepts/agents/about-copilot-cli
- **HDDL project instructions**: `CLAUDE.md`
- **Verification requirements**: `.github/copilot-instructions.md` (to be created)

---

*Created: 2026-01-06*  
*Based on: Boris's Claude Code Setup Principles*  
*Adapted for: GitHub Copilot CLI + HDDL Project*

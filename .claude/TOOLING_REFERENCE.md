# AI Tooling Architecture

A reference guide to the different AI tools, agents, and systems in the HDDL project and how they work together.

## Verification Notice

This document reflects capabilities observed in **January 2026**. Both Claude Code and GitHub Copilot CLI are actively developed products. Features may vary by:

- Tool version (check with `claude --version` or `copilot --version`)
- User permissions or subscription tier
- Enterprise vs individual accounts
- Installed MCP servers and skills

**To verify current capabilities:**
- **Claude Code:** `claude --help`, or ask "what tools do you have available?"
- **Copilot CLI:** `copilot --help`, `/skills list`, `/mcp show`

**Legend for this document:**
- ✅ Verified by testing
- ⚠️ Documented but unverified
- ❌ Confirmed unavailable

## How This Document Was Created

This document is the result of a three-way AI negotiation:

**Round 1: Initial Draft**
- **Claude Code (Sonnet 4.5)** wrote initial comparison between Claude Code and Copilot CLI
- Based on tool documentation and observed capabilities

**Round 2: Self-Defense**
- **Copilot CLI (Sonnet 4.5)** reviewed the doc and pushed back
- Identified undersold capabilities (file access, GitHub integration, session management)
- Made direct edits to correct misrepresentations
- Added "GitHub Copilot CLI: Full Capabilities" section
- Verified `/delegate` workflow via web search

**Round 3: Senior Review**
- **Claude Opus 4.5** provided critical review
- Caught inaccuracies Claude Code made about its own capabilities
- Challenged framing assumptions (competitive vs complementary tools)
- Identified that documentation, help text, and runtime behavior can all differ
- Added verification disclaimers and ⚠️ markers for uncertain claims
- Expanded Claude Code capabilities section with verified CLI flags

**Key Insights from the Process:**

1. **Tools reviewing themselves is valuable** - Copilot CLI knew its own capabilities better than Claude Code's assumptions
2. **Cross-checking disrupts confirmation bias** - Both Sonnet instances initially oversold themselves and undersold the other; Opus caught this
3. **Documentation ≠ help text ≠ runtime** - Tools had capabilities not reflected in help text, and instances varied in available functions (`EnterPlanMode`, `subagent_type`)
4. **Adversarial review improves quality** - The negotiation process produced a more honest, nuanced result than single-author documentation
5. **Complementary, not competitive** - The tools solve different problems well; the real choice is "which fits this task?" not "which is better?"

**The Result:** A more accurate, honest document that acknowledges uncertainty and encourages verification. Traditional docs hide their creation process; this transparency helps users calibrate trust appropriately.

## The Landscape

### Claude Code (Primary Interface)

**What:** The CLI tool you're interacting with right now.

**Components:**
- **Skills** - Extensions invoked via the Skill tool (users often type `/skill-name` as shorthand)
- **Agents** - Spawned subprocesses with specialized tools (via Task tool)
- **MCP Servers** - External tools/data sources Claude can connect to
- **Instructions** - `CLAUDE.md` files guiding behavior
- **Hooks** - Shell scripts triggered by events (SessionStart, tool execution, etc.)

**CLI Capabilities (verified via `claude --help`):**
- `--resume` / `--continue` - Resume previous sessions
- `--model <model>` - Select model (sonnet, opus, haiku, etc.)
- `--print` / `-p` - Non-interactive mode, print response and exit
- `--allowedTools` / `--disallowedTools` - Control tool permissions
- `--system-prompt` - Custom system prompt
- `--output-format` - json, text, or stream-json
- `--max-turns` - Limit agentic iterations
- `--verbose` - Enable verbose logging

**Location:**
- Official plugins: `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/`
- Project skills: `.claude/skills/`
- Project hooks: `.claude/hooks/`
- Instructions: `CLAUDE.md` (project root)

### GitHub Copilot CLI (External Tool)

**What:** Standalone command-line tool for accessing various LLM models.

**Models Available:**
```bash
copilot --model gpt-5.2          # Current Reviewer model
copilot --model gpt-5-mini       # Current Quick-Helper model
copilot --model claude-sonnet-4.5
copilot --model gemini-3-pro-preview
```

**Characteristics:**
- Has its own skill system (different from Claude Code)
- Has MCP server support (similar to Claude Code)
- Has file access capabilities (with permission prompts)
- Can create PRs with /delegate
- Supports interactive and non-interactive modes

**Interactive Mode Slash Commands:**

| Command | Purpose | Example |
|---------|---------|---------|
| `/agent` | Browse and select available agents | Launch interactive agent picker |
| `/skills list` | Show installed skills | Lists: api-monitor, delegate-reviewer, etc. |
| `/skills info <skill>` | Show skill details | `/skills info api-monitor` |
| `/skills add <path>` | Install a skill | `/skills add ./my-skill` |
| `/skills remove <skill>` | Uninstall a skill | `/skills remove api-monitor` |
| `/skills reload [--all]` | Reload skill code | `/skills reload api-monitor` |
| `/mcp show` | List configured MCP servers | Shows github-mcp-server (built-in) |
| `/mcp add <name>` | Register new MCP server | `/mcp add my-server` |
| `/mcp edit <name>` | Update MCP server config | `/mcp edit my-server` |
| `/mcp disable <name>` | Temporarily disable server | `/mcp disable my-server` |
| `/mcp enable <name>` | Re-enable server | `/mcp enable my-server` |
| `/mcp delete <name>` | Remove MCP server | `/mcp delete my-server` |
| `/delegate <prompt>` | AI-generated PR to remote repo | `/delegate "Fix failing tests"` |
| `/share [file\|gist] [path]` | Export session to markdown/gist | `/share file session.md` |
| `/context` | Show token usage & context viz | Diagnose context window issues |
| `/add-dir <directory>` | Allow file access to directory | `/add-dir ~/projects` |
| `/list-dirs` | Show allowed directories | View trusted folders |
| `/model [model]` | Change AI model | `/model gpt-5.2` |
| `/session` | Show session info | Current session stats |
| `/usage` | Show usage metrics | Token counts, API calls |
| `/compact` | Summarize conversation history | Reduce token usage |
| `/clear` | Clear conversation | Fresh start |
| `/cwd [directory]` | Change working directory | `/cwd ~/projects` |

**Copilot Skill Structure:**

Unlike Claude Code skills (which use `SKILL.md` files), copilot skills are Node.js modules:

```
my-copilot-skill/
├── package.json          # Node metadata
├── skill.json           # Manifest (id, name, version, commands, permissions)
├── index.js            # Entrypoint (exports handlers, activate functions)
├── README.md           # Optional documentation
└── types/              # Optional TypeScript definitions
```

**Key Differences: Claude Code vs Copilot Skills:**

| Aspect | Claude Code Skills | Copilot CLI Skills |
|--------|-------------------|-------------------|
| **Format** | Markdown (SKILL.md) | Node.js module (skill.json + index.js) |
| **Location** | `.claude/skills/` | Configured skills directory |
| **Registration** | Auto-discovered | `/skills add` or config |
| **Language** | Prompt-based | JavaScript/Node.js |
| **Complexity** | Simple (just prompts) | Can be complex (full Node modules) |

**Note:** The project's `.claude/skills/` directory contains Claude Code skills, but copilot CLI can also read and use them when running in this project directory (as seen with api-monitor, delegate-reviewer, delegate-quick-helper appearing in `/skills list`).

### Background Agent Scripts (Project-Specific)

**What:** Shell wrapper scripts that use copilot CLI to delegate specific tasks.

> **⚠️ Important Distinction:** These are **deliberately limited wrappers** around copilot CLI, not a limitation of the tool itself. They only pass prompts to copilot (no file access flags, no tool permissions) for safety and simplicity. Copilot CLI can do much more when invoked directly—see "GitHub Copilot CLI: Full Capabilities" below for details.

**Location:** `~/.claude/agents/`

**Available Scripts:**
1. **gpt-reviewer.sh** - User perspective reviews (GPT-5.2)
2. **quick-helper.sh** - Fast simple tasks (GPT-5-mini)
3. **init-session.sh** - Initialize all helpers at session start

**Current Configuration:**
- Prompt-only (no file access)
- No tool execution capabilities
- Pure text input → text output

**Usage Pattern:**
```bash
~/.claude/agents/gpt-reviewer.sh "Review this feature" path/to/file.js
~/.claude/agents/quick-helper.sh "Find all .test.js files"
```

**Could Be Enhanced:** Add `--add-dir` or `--allow-all-tools` flags to wrapper scripts to enable file access and tool execution, but this project intentionally keeps them simple.

## How They Stack

```
User Request
    ↓
┌─────────────────────────────────────────────────┐
│ Claude Code (Main - Claude Sonnet 4.5)          │
│                                                  │
│ ├─ Reads: CLAUDE.md instructions               │
│ ├─ Uses: Tools (Read, Edit, Bash, Grep, etc.)  │
│ ├─ Invokes: Skills (/init-helpers, /api-monitor)│
│ ├─ Spawns: Built-in agents (Task tool)         │
│ │    └─ test-writer (Claude 4.5 subagent)      │
│ │    └─ Explore agent                           │
│ │    └─ Plan agent                              │
│ └─ Delegates: Background agent scripts          │
│      ├─ gpt-reviewer.sh                         │
│      │    └─ copilot --model gpt-5.2            │
│      └─ quick-helper.sh                         │
│           └─ copilot --model gpt-5-mini         │
└─────────────────────────────────────────────────┘
```

## Decision Tree: Which Tool for What?

### Complex Code Implementation
→ **Main Claude Code** (you're already here)
- Has full context of conversation
- Can read/edit files
- Can run tests, use git
- Best for architectural decisions

### Write Tests for New Code
→ **test-writer Agent** (Claude 4.5 subagent)
- Automatically triggered after code edits
- Analyzes recent commits
- Writes comprehensive unit tests
- Main Claude delegates via Task tool

### UX Review / User Perspective
→ **Reviewer Background Agent** (GPT-5.2 via copilot)
- After feature completion
- Before creating PRs
- Validates accessibility, edge cases
- Provides outside-in feedback
- Main Claude calls: `~/.claude/agents/gpt-reviewer.sh`

### Quick File Operations
→ **Quick-Helper Background Agent** (GPT-5-mini via copilot)
- Simple searches (find files, list dirs)
- Fast validations (file exists, JSON valid)
- String transformations
- Repetitive batch operations
- Main Claude calls: `~/.claude/agents/quick-helper.sh`

### Explore Codebase
→ **Explore Agent** (Claude via Task tool)
- Find files handling specific functionality
- Understand codebase structure
- Map architecture layers
- Not for needle queries (use Grep for those)

### Plan Feature Implementation
→ **Plan Agent** (Claude via EnterPlanMode)
- Design implementation strategy
- Identify critical files
- Consider architectural tradeoffs
- Get user approval before coding

### Monitor Production API
→ **/api-monitor Skill** (Project skill)
- Query Google Cloud Run logs
- Analyze API errors/performance
- Track scenario generation costs
- Specific to this project's narrative API

## Communication Patterns

### Main Claude ↔ Built-in Agents
```javascript
// Main Claude spawns agent
Task({
  subagent_type: "test-writer",
  prompt: "Write tests for the new string utility functions"
})

// Agent runs with full tool access (Read, Edit, Bash)
// Returns results to Main Claude
// Main Claude synthesizes and reports to user
```

### Main Claude ↔ Background Agents
```bash
# Main Claude executes via Bash tool
~/.claude/agents/gpt-reviewer.sh "Review login flow" src/auth/login.js

# Script calls: copilot --model gpt-5.2 with prompt
# GPT-5.2 responds (no file access, pure text)
# Main Claude receives output and integrates into response
```

### Skills ↔ Everything
```javascript
// User types: /init-helpers
// Skill expands to full prompt for Main Claude
// Main Claude executes the initialization logic
// May spawn agents or call background scripts as needed
```

## Key Differences

| Feature | Claude Code (Main) | Claude Built-in Agents | Copilot CLI (Interactive) | Background Agents (Project Wrappers) | Claude Code Skills |
|---------|-------------------|----------------------|---------------------------|--------------------------------|-------------------|
| **File Access** | ✅ Full | ✅ Full | ✅ Full (with prompts) | ⚠️ Disabled in wrappers (copilot supports it) | ✅ Full |
| **Shell Commands** | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Disabled in wrappers (copilot supports it) | ✅ Yes (if coded) |
| **Conversation Context** | ✅ Complete | ⚠️ Scoped | ✅ Session-based | ❌ None (one-shot) | ✅ Complete |
| **Session Persistence** | ✅ Yes | ❌ No | ✅ Yes (resumable/shareable) | ❌ No | ✅ Yes |
| **Resume Previous Sessions** | ✅ Yes (`--resume`, `--continue`) | ❌ No | ✅ Yes (`--resume`, `--continue`) | ❌ No | ❌ No |
| **Model Choice** | ✅ Configurable (`--model`) | ⚠️ Inherits or overridable | ✅ Configurable (`/model`, `--model`) | Specified in script | N/A |
| **GitHub Integration** | ⚠️ Via gh CLI or MCP | ⚠️ Via gh CLI or MCP | ✅ Built-in MCP server | ❌ No | ⚠️ If coded |
| **Cloud Agent Delegation** | ❌ No | ❌ No | ✅ Yes (`/delegate`) | ❌ No | ❌ No |
| **Custom Agents** | ❌ No | ❌ No | ✅ Yes (define in files) | ❌ No | ❌ No |
| **MCP Servers** | ✅ Yes | ⚠️ Inheritance unverified | ✅ Yes (GitHub built-in + custom) | ❌ No | ✅ Yes |
| **Skills System** | Markdown (`.claude/skills/`) | Inherits from main | Node.js modules | ❌ No | Markdown |
| **Hooks** | ✅ Yes (`.claude/hooks/`) | ❌ No | ❌ No | ❌ No | N/A |
| **@ File Mentions** | ✅ Yes | ✅ Yes | ✅ Yes (with tab completion) | ❌ No | ✅ Yes |
| **Custom Instructions** | ✅ `CLAUDE.md` | ✅ Inherits | ✅ Multiple sources | ❌ No | ✅ Yes |
| **Share Sessions** | ⚠️ Unverified | ❌ No | ✅ Yes (markdown/gist) | ❌ No | ❌ No |
| **Non-Interactive Mode** | ✅ Yes (`--print`, `-p`) | N/A | ✅ Yes (`-p`, `--silent`) | ✅ Yes (one-shot by design) | N/A |
| **Tool Permissions** | ✅ Yes (`--allowedTools`, `--disallowedTools`) | ⚠️ Inherits | ✅ Yes (`--allow-tool`, `--deny-tool`) | N/A | N/A |
| **Custom System Prompt** | ✅ Yes (`--system-prompt`) | ⚠️ Unverified | ⚠️ Unverified | N/A | N/A |
| **Best For** | Complex development, hooks, local iteration | Specialized sub-tasks | GitHub-native work, model flexibility, cloud delegation | Simple one-shot reasoning | User shortcuts |

## Common Patterns

### Pattern 1: Feature Development with Testing
```
User: "Add user authentication"
  ↓
Main Claude:
  1. Reads CLAUDE.md for project patterns
  2. Uses EnterPlanMode → Plan agent designs approach
  3. User approves plan
  4. Main Claude implements code (Edit tool)
  5. Auto-triggers test-writer agent
  6. test-writer writes tests, runs them
  7. Main Claude commits if tests pass
```

### Pattern 2: PR Review Workflow
```
User: "Create a pull request"
  ↓
Main Claude:
  1. Checks git status
  2. Delegates to gpt-reviewer.sh for UX review
  3. Reviewer identifies edge cases
  4. Main Claude fixes issues
  5. Creates PR with gh CLI
```

### Pattern 3: Codebase Exploration
```
User: "Where are client errors handled?"
  ↓
Main Claude:
  1. Uses Task tool with Explore agent
  2. Explore agent searches codebase
  3. Returns findings to Main Claude
  4. Main Claude synthesizes answer for user
```

## When NOT to Use Background Agents

**Don't delegate to these wrapper scripts if:**
- Task needs file access (use Main Claude or built-in agents)
- Task needs conversation context
- Task is complex reasoning (not "quick")
- You need tool execution (git, npm, docker)

**These wrapper scripts are prompt-only:**
- They receive text prompt
- They return text response
- No Read, Edit, Bash, or other tools
- Best for pure reasoning tasks on provided text

**Note:** This is a design choice for this project's wrapper scripts. Copilot CLI itself supports file access and tools—these wrappers intentionally don't pass those flags for simplicity and safety.

## Customizing the Stack

### Change a Background Agent's Model
Edit the wrapper script:
```bash
# In ~/.claude/agents/gpt-reviewer.sh
# Change this line:
copilot --model gpt-5.2 --prompt "$prompt"

# To use a different model:
copilot --model claude-opus-4.5 --prompt "$prompt"
```

### Add a New Background Agent
1. Create script in `~/.claude/agents/my-agent.sh`
2. Make executable: `chmod +x ~/.claude/agents/my-agent.sh`
3. Create delegation skill in `.claude/skills/delegate-my-agent/`
4. Document in `CLAUDE.md` when Main Claude should use it

### Add a New Skill
1. Create directory: `.claude/skills/my-skill/`
2. Add `SKILL.md` with description and prompt
3. Main Claude can now invoke with `/my-skill`

## Debugging the Stack

### See what helpers are available
```bash
ls -la ~/.claude/agents/
```

### Test a background agent directly
```bash
~/.claude/agents/quick-helper.sh "List all .md files in docs/"
```

### Check copilot models
```bash
copilot --help | grep -A 20 "model"
```

### View skills
```bash
# Claude Code skills
ls -la .claude/skills/

# Copilot CLI skills (interactive mode)
copilot
/skills list
/skills info <skill-name>
```

### Verify hooks
```bash
ls -la .claude/hooks/
```

### Test copilot CLI directly
```bash
# Non-interactive mode (one-shot)
copilot -p "Your prompt here" --model gpt-5-mini --silent

# Interactive mode
copilot --model gpt-5.2

# Resume most recent session
copilot --continue

# Resume with session picker
copilot --resume

# Check context usage
copilot
/context

# View session stats
copilot
/usage
```

### Useful Copilot CLI Flags

```bash
# File access permissions
--add-dir <directory>          # Allow access to specific directory
--allow-all-paths              # Allow access to any path (use carefully!)

# Tool permissions
--allow-all-tools              # Auto-approve all tools (required for non-interactive)
--allow-tool [tools...]        # Whitelist specific tools
--deny-tool [tools...]         # Blacklist specific tools

# URL permissions
--allow-url [urls...]          # Allow specific URLs/domains
--allow-all-urls               # Allow all URLs
--deny-url [urls...]           # Block specific URLs (takes precedence)

# MCP servers
--additional-mcp-config <json> # Add MCP server config for session
--disable-builtin-mcps         # Disable github-mcp-server
--disable-mcp-server <name>    # Disable specific server

# Output control
--silent                       # Output only agent response (no stats)
--no-color                     # Disable color output
--stream on|off                # Control streaming mode

# Session management
--continue                     # Resume most recent session
--resume [sessionId]           # Resume specific session
```

### Example: Automated Copilot Usage in Scripts

```bash
# One-shot query with auto-approval (for scripting)
copilot -p "Analyze this log file" \
  --model gpt-5-mini \
  --allow-all-tools \
  --add-dir /var/logs \
  --silent

# Interactive session with pre-configured permissions
copilot \
  --model gpt-5.2 \
  --add-dir ~/projects \
  --allow-tool 'shell(git:*)' \
  --allow-tool 'write' \
  --allow-url github.com
```

## GitHub Copilot CLI: Full Capabilities

### What Makes Copilot CLI Powerful

GitHub Copilot CLI is **not just a chatbot** - it's a full coding agent with:

1. **Full file system access** (with permission controls)
   - Read, write, edit any file you authorize
   - Create new files and directories
   - Execute shell commands and scripts

2. **Built-in GitHub integration** (via MCP server)
   - Query issues, PRs, commits directly from CLI
   - Create and manage pull requests
   - Access repository metadata and history
   - Works with any authenticated GitHub account

3. **Custom agents** you can define
   - Create specialized agents for specific tasks
   - Store in `~/.copilot/agents/` (user-level) or `.github/agents/` (repo-level)
   - Define custom prompts, tools, and MCP servers
   - Invoke with `/agent` or reference directly in prompts

4. **Extensible via MCP servers**
   - GitHub MCP server built-in by default
   - Add custom MCP servers for databases, APIs, cloud services
   - Manage with `/mcp` commands

5. **Skills system** (Node.js modules)
   - Unlike Claude Code's markdown-based skills
   - Full programmatic control with JavaScript
   - Can have complex logic, dependencies, state

6. **Multiple model support**
   - GPT-5.2, GPT-5-mini, GPT-5.1-Codex
   - Claude Sonnet 4.5, Claude Opus 4.5, Claude Haiku 4.5
   - Gemini 3 Pro
   - Switch mid-session with `/model`

7. **Session persistence and resumption**
   - All conversations saved automatically
   - Resume any previous session with `--resume`
   - Quick resume last session with `--continue`
   - Share sessions as markdown or GitHub gists

8. **Cloud agent integration via /delegate**
   - Hand off work to GitHub Copilot coding agent (cloud)
   - Agent makes changes on GitHub and creates PR
   - Preserves your local context

### When to Use Copilot CLI Standalone (not via Claude Code)

**Use standalone Copilot CLI when:**

- **You want GitHub-native operations**: Query PRs, issues, commits without leaving terminal
- **You need model flexibility**: Switch between GPT, Claude, Gemini mid-conversation
- **You want persistent sessions**: Resume conversations days later with full context
- **You need cloud agent delegation**: Hand off work to GitHub's cloud agent for PR creation
- **You want custom agents**: Define specialized agents for your workflows
- **You need MCP extensibility**: Connect to databases, APIs, custom tools
- **You want to share sessions**: Export conversations as markdown or gists

**Use Claude Code (what you're in now) when:**

- **You want markdown-based skills**: Simple prompt-based extensions (`.claude/skills/`)
- **You want hook-based automation**: Trigger scripts on session start or tool execution
- **You need the Task tool**: Spawn subagents with scoped contexts (explore, task, general-purpose)
- **You prefer Claude's UX**: Different interaction model than Copilot CLI

### Copilot CLI @ File Mention System

Just like Claude Code, Copilot CLI supports `@` file mentions:

```bash
# In copilot interactive mode:
Explain @src/auth/login.js
Fix the bug in @config/database.json
Refactor @tests/*.spec.js to use new assertion library
```

**Smart features:**
- Tab completion for file paths
- Fuzzy matching (shows matching paths as you type)
- Glob pattern support for multiple files
- Contents automatically included as context

### GitHub MCP Server (Built-in)

Copilot CLI ships with GitHub MCP server enabled by default. You can:

```bash
# In copilot interactive mode:

# Query GitHub resources
"Show me all open PRs in this repo"
"List issues labeled 'bug' created in the last week"
"Show the diff for commit abc123"

# Take actions
"Merge PR #42"
"Add comment to issue #15: Fixed in latest commit"
"Create issue: API timeout in production"

# No need to leave the CLI or switch to browser
```

**Available GitHub operations:**
- Read: repos, issues, PRs, commits, branches, files
- Write: create issues/PRs, add comments, merge PRs
- Search: code, issues, PRs, users, repos
- Actions: view workflow runs, download artifacts

### Custom Instructions in Copilot CLI

Copilot CLI automatically reads custom instructions from multiple sources (in priority order):

1. **Repository-wide**: `.github/copilot-instructions.md` (standard location)
2. **Path-specific**: `.github/instructions/*.instructions.md` (with `applyTo` YAML frontmatter for glob targeting)
3. **User-level**: `~/.copilot/copilot-instructions.md` (personal defaults)
4. **Environment variable**: Set via `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` for additional directories

**Cross-tool compatibility:** While `CLAUDE.md` is a Claude Code convention, copilot CLI may read it if configured, but `.github/copilot-instructions.md` is the standard for Copilot-specific guidance.

**Example path-specific instruction:**
```markdown
---
applyTo: ["src/components/**/*.js"]
---

- Use React functional components
- Avoid inline styles; use CSS modules
```

## Advanced Copilot Features

### The /delegate Command

The `/delegate` command in copilot CLI hands off work to **GitHub Copilot coding agent** (cloud agent) with AI-generated pull requests:

**How it works (verified as of January 2026):**
1. You provide a prompt describing the changes needed in copilot CLI
2. If you have unstaged changes, copilot CLI commits them to a new branch
3. Copilot CLI pushes the new branch to GitHub
4. **GitHub Copilot coding agent** (cloud) opens a draft PR on the branch
5. The cloud agent makes changes asynchronously in the background on GitHub
6. You receive a link to the PR and agent session to monitor progress
7. When done, the agent requests your review
8. You review, request changes, or merge the PR

**Key distinction:**
- Changes are made **by the cloud agent on GitHub**, not locally
- Your local CLI session is preserved; work continues remotely
- The cloud agent has full context from your CLI session
- You remain in control of merging

**Examples:**

```bash
# Start copilot interactive mode
copilot

# Delegate a bug fix
/delegate "Fix failing unit tests: update jest config and mock fetch where needed"

# Delegate a feature addition
/delegate "Add GET /health endpoint returning 200 and app version; update README and add a test"

# Delegate refactoring
/delegate "Refactor authentication middleware to use async/await instead of callbacks"
```

**When to use /delegate vs Main Claude:**
- **Use /delegate** when you want the cloud agent to finish work via PR
- **Use Main Claude** when you want changes made locally in your working directory
- **Use /delegate** to preserve your local CLI context while work happens remotely
- **Use Main Claude** for exploratory work or multi-step local development
- **Use /delegate** when you want to "hand off and come back later"

### Copilot Session Management

Copilot maintains conversation history across sessions:

```bash
# Resume most recent conversation
copilot --continue

# View and select from previous sessions
copilot --resume

# Share session as markdown or gist
copilot
/share file my-session.md
/share gist  # Creates GitHub gist
```

## Practical Decision Matrix

### When to Use Standalone Copilot CLI (Not Via Claude Code)

**Start with standalone Copilot CLI when:**

- **Primary task is GitHub operations**: Querying PRs, reviewing issues, checking CI status, merging PRs
- **You need model flexibility**: Switch between GPT-5.2, Claude Sonnet, Gemini mid-conversation for cost/speed/quality tradeoffs
- **Multi-day work sessions**: Resume conversations days later with full context preserved
- **PR-driven workflows**: Use `/delegate` to hand off implementation to cloud agent that creates PR
- **Custom agent workflows**: You have specialized agents defined for security reviews, testing, etc.
- **GitHub-native development**: Want to stay in terminal without browser context switching

### When to Use Claude Code (What You're In Now)

**Start with Claude Code when:**

- **Primary task is local code implementation**: Writing code, refactoring, fixing bugs locally
- **Hook-based automation**: Need SessionStart hooks, tool execution triggers, etc.
- **Project-specific skills**: Want markdown-based skills in `.claude/skills/` with simple prompt expansions
- **Task tool workflows**: Need to spawn explore/task/general-purpose subagents with scoped contexts
- **Custom instructions**: Prefer `CLAUDE.md` format and Claude-specific instruction conventions

### They're Complementary, Not Competitive

Use whichever fits your immediate task better:
- Working on a feature locally? **Claude Code**
- Need to review 5 PRs and check CI? **Copilot CLI**
- Building something that will become a PR? **Copilot CLI** with `/delegate`
- Exploring codebase and making local changes? **Claude Code**

You can switch between them as your workflow demands.

### Context Window Management

Copilot provides tools to manage token usage:

```bash
# Check current context usage
/context

# Summarize conversation to reduce tokens
/compact

# Start fresh (clears history)
/clear
```

## Real-World Copilot CLI Workflows

### Workflow 1: GitHub-Native Development

```bash
# Start copilot in repo
cd my-project
copilot

# Check what needs attention
> "Show me all open PRs with failing CI checks"

# Review specific PR
> "Show me the diff for PR #123 and explain the changes"

# Add review comment
> "Add comment to PR #123: The authentication logic looks good but we should add rate limiting"

# Check related issues
> "Are there any open issues related to authentication?"

# When ready, merge
> "Merge PR #123 with squash commit"
```

**No browser context switching needed!**

### Workflow 2: Multi-Model Problem Solving

```bash
copilot

# Start with fast model for exploration
/model gpt-5-mini
> "Find all files that use the old authentication pattern"

# Switch to more capable model for complex refactoring
/model claude-sonnet-4.5
> "Refactor @src/auth/*.js to use the new OAuth2 flow. Make sure to preserve backward compatibility."

# Switch to GPT for specific task it's good at
/model gpt-5.2
> "Review the changes from a security perspective"

# Resume tomorrow with full context
# (exit with Ctrl+d, next day:)
copilot --continue
> "Continue with adding tests for the OAuth2 implementation"
```

### Workflow 3: Cloud Agent Handoff

```bash
copilot

# Do some exploratory work locally
> "Analyze @tests/ directory and identify flaky tests"
> "Show me which tests fail intermittently based on recent CI logs"

# Hand off the fix to cloud agent
/delegate "Fix all flaky tests identified in our conversation: add proper waits, mock time-dependent code, and ensure cleanup. Run tests 10 times to verify stability."

# Cloud agent:
# - Commits your local changes
# - Creates branch
# - Opens draft PR on GitHub
# - Makes fixes on GitHub
# - Runs tests
# - Requests your review

# You get link to PR and can review when ready
```

### Workflow 4: Custom Agent for Specialized Work

Create a custom agent for code review:

```bash
# Define agent profile
mkdir -p ~/.copilot/agents
cat > ~/.copilot/agents/security-reviewer.json << 'EOF'
{
  "name": "security-reviewer",
  "description": "Security-focused code reviewer",
  "systemPrompt": "You are a security expert. Review code for: SQL injection, XSS, CSRF, authentication issues, secret leaks, unsafe dependencies. Be thorough and cite OWASP guidelines.",
  "tools": ["read", "grep", "shell"],
  "model": "gpt-5.2"
}
EOF

# Use the agent
copilot
/agent
# (select security-reviewer from list)

> "Review all authentication code in @src/auth/ for security issues"

# Or invoke directly:
> "Use the security-reviewer agent to audit @src/api/*.js"
```

### Workflow 5: MCP-Powered Database Work

```bash
# Add database MCP server
copilot
/mcp add postgres-local

# Configure it (interactive form opens)
# Command: psql -h localhost -U myuser -d mydb
# (save with Ctrl+S)

# Now you can query database
> "Show me the schema for the users table"
> "Find all users created in the last 24 hours"
> "Generate migration SQL to add a 'verified_email' column"

# Write and test migration
> "Create @migrations/add-verified-email.sql with proper up/down migrations"
> "Test the migration against local database"
```

### Workflow 6: Session Sharing and Collaboration

```bash
copilot

# Do some investigative work
> "Analyze @src/billing/ and explain how the subscription renewal process works"
> "What happens if a payment fails?"
> "Show me where retry logic is implemented"

# Share session with teammate
/share gist

# Copilot creates GitHub gist with full conversation
# Share URL with teammate who can:
# - See your entire conversation
# - Understand the context
# - Continue from where you left off
```

## Further Reading

- `.claude/HOOK_SETUP.md` - Configuring hooks for auto-initialization
- `CLAUDE.md` - Project instructions and helper delegation rules
- `.claude/skills/*/SKILL.md` - Individual skill documentation
- `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/` - Official plugin source code

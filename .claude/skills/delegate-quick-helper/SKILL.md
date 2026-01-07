---
name: delegate-quick-helper
description: Delegate simple, fast tasks to GPT-5-mini Quick-Helper agent. Use when (1) Simple file operations needed (finding files, listing directories, basic grep), (2) Quick validations required (file existence, JSON validation, simple tests), (3) Fast transformations (string manipulation, format conversions), (4) Repetitive tasks (batch operations, loops), (5) Speed matters and task is straightforward. DO NOT use for complex code implementation, user perspective reviews, test writing, or deep analysis - Main Claude handles those.
allowed-tools: Bash(~/.claude/agents/quick-helper.sh:*), Read, Glob
---

# Delegate to Quick-Helper Agent (GPT-5-mini)

Quick-Helper is your **junior assistant** for boring, simple tasks that don't need deep reasoning. This frees Main Claude to focus on complex problem-solving.

**Rule of thumb**: If the task takes <30 seconds and requires minimal context, delegate to Quick-Helper.

## How to Delegate

```bash
~/.claude/agents/quick-helper.sh "<clear, concise task description>"
```

Quick-Helper returns results directly to stdout.

## Core Use Cases

### File Finding
```bash
~/.claude/agents/quick-helper.sh \
  "Find all TypeScript files in the src directory and list them"
```

### Simple Validation
```bash
~/.claude/agents/quick-helper.sh \
  "Check if src/components/new-feature.js exists"
```

### Quick Search
```bash
~/.claude/agents/quick-helper.sh \
  "Search for all occurrences of 'getStewardColor' function in the codebase"
```

### Format Conversion
```bash
~/.claude/agents/quick-helper.sh \
  "Convert this comma-separated list to JSON array: foo, bar, baz"
```

### Batch Operations
```bash
~/.claude/agents/quick-helper.sh \
  "List all .spec.js files in tests/ directory"
```

## Integration Pattern

**Typical task flow**:
```
User asks complex question
    ↓
Main Claude breaks down into subtasks
    ↓
├─ Complex subtask: Main Claude handles
└─ Simple subtask: Delegate to Quick-Helper
    ↓
Quick-Helper returns fast result
    ↓
Main Claude integrates result and continues
```

### Example: "Implement a new color utility function"

1. **Delegate to Quick-Helper**: "List all functions exported from src/utils/color-helpers.js"
2. **Main Claude**: Design new function based on existing patterns
3. **Main Claude**: Implement function
4. **Test-Writer**: Write tests
5. **Reviewer**: Review UX

## When NOT to Delegate

Don't delegate if:
- **Task needs project context** - Quick-Helper doesn't have CLAUDE.md knowledge
- **Task is already simple** - If you can do it in one tool call, just do it
- **Result needs interpretation** - You'll analyze anyway, do it yourself
- **Security-sensitive** - File permissions, credential checks, etc.

### Anti-Pattern
```bash
# BAD: Task is already simple for Main Claude
~/.claude/agents/quick-helper.sh "Read the contents of file.js"

# GOOD: Use Read tool directly
```

## Performance Optimization

Quick-Helper is **fast** (gpt-5-mini), so use it liberally for:
- Pre-checks before expensive operations
- Validations during multi-step processes
- Quick lookups that inform next steps

Multiple focused queries are better than one complex query:
```bash
# Better approach - multiple focused queries
FILES=$(~/.claude/agents/quick-helper.sh "Find all .test.js files")
VITEST_FILES=$(~/.claude/agents/quick-helper.sh "Which files import vitest: $FILES")
```

## Quick Reference

```bash
# Find files
~/.claude/agents/quick-helper.sh "Find all .js files in src/"

# Check existence
~/.claude/agents/quick-helper.sh "Does package.json have 'vitest' dependency?"

# Quick search
~/.claude/agents/quick-helper.sh "Search for 'TODO' comments in src/"

# Validate
~/.claude/agents/quick-helper.sh "Check if all .json files in scenarios/ are valid JSON"

# Count
~/.claude/agents/quick-helper.sh "How many test files are in the project?"
```

## Advanced Patterns

For detailed patterns including pre-flight checks, fast iteration support, batch information gathering, and troubleshooting, see [references/patterns.md](references/patterns.md).

---

**Remember**: If you hesitate because a task feels too simple or boring, that's your signal to delegate to Quick-Helper!

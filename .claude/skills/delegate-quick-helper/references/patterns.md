# Quick-Helper Advanced Patterns

This reference contains detailed patterns for using the Quick-Helper agent effectively.

## Pre-Flight Checks

Before implementing a feature, gather quick context:

```bash
# Check if similar functionality exists
~/.claude/agents/quick-helper.sh \
  "Search for functions related to 'dark mode' or 'theme' in the codebase"

# Verify target location exists
~/.claude/agents/quick-helper.sh \
  "Does src/components/settings/ directory exist?"
```

## Fast Iteration Support

During active development:

```bash
# Quickly validate changes
~/.claude/agents/quick-helper.sh \
  "Check if all imports in src/new-feature.js can be resolved"

# Quick syntax check
~/.claude/agents/quick-helper.sh \
  "Run basic syntax check on src/new-feature.js"
```

## Batch Information Gathering

```bash
# Get list of scenarios
SCENARIOS=$(~/.claude/agents/quick-helper.sh \
  "List all .scenario.json files in hddl-sim/src/sim/scenarios/")

# Get list of analysis reports
REPORTS=$(~/.claude/agents/quick-helper.sh \
  "List all _Analysis.md files in hddl-sim/analysis/")
```

## Troubleshooting

### Issue: Quick-Helper takes too long

**Cause**: Task might be too complex for quick-helper

**Solution**: Do it yourself or break into smaller tasks

```bash
# Instead of:
~/.claude/agents/quick-helper.sh "Analyze all test coverage and generate report"

# Do:
# Main Claude handles analysis using proper tools
```

### Issue: Quick-Helper gives incomplete answer

**Cause**: Question might be ambiguous or need context

**Solution**: Either clarify the query or handle it yourself

```bash
# Vague:
~/.claude/agents/quick-helper.sh "Find the bug"

# Better - you handle it:
# Use Grep, Read, and your reasoning to find the bug
```

## Integration Philosophy

```
┌─────────────────────────────────────┐
│ Complex reasoning, design decisions │  ← Main Claude (you)
├─────────────────────────────────────┤
│ User perspective, UX reviews        │  ← Reviewer (gpt-5.2)
├─────────────────────────────────────┤
│ Test writing, coverage analysis     │  ← Test-Writer (claude-4.5)
├─────────────────────────────────────┤
│ Simple, fast, repetitive tasks      │  ← Quick-Helper (gpt-5-mini)
└─────────────────────────────────────┘
```

Use Quick-Helper to handle the "grunt work" so you can focus on what matters: thoughtful implementation, architectural decisions, and complex problem-solving.

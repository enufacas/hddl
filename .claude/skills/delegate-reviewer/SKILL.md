---
name: delegate-reviewer
description: Delegate user perspective reviews to GPT-5.2 Reviewer agent. Use when (1) Feature implementation is complete and needs UX validation, (2) User asks to create a pull request (review before PR), (3) User explicitly requests review ("review this", "check this", "user perspective"), (4) UX concerns need evaluation (user experience, usability, edge cases), (5) Documentation clarity needs checking from user perspective. DO NOT use for writing tests (use test-writer), quick file searches (use quick-helper), code implementation (Main Claude), or performance analysis.
allowed-tools: Bash(~/.claude/agents/gpt-reviewer.sh:*), Read, Glob
---

# Delegate to Reviewer Agent (GPT-5.2)

The GPT-5.2 Reviewer provides **outside-in, user perspective feedback** on your implementations, focusing on UX, edge cases, and clarity.

## How to Delegate

```bash
~/.claude/agents/gpt-reviewer.sh \
  "<review prompt>" \
  path/to/file1.js \
  path/to/file2.js
```

The reviewer will analyze the files and return actionable feedback focused on user experience.

## Core Delegation Patterns

### After Feature Implementation

```bash
# You just finished implementing a feature
# Automatically trigger reviewer:

~/.claude/agents/gpt-reviewer.sh \
  "Review this feature implementation from a user perspective. Check UX, edge cases, and documentation." \
  path/to/changed/files.js
```

### Before PR Creation

When user asks to create a PR:

1. Get list of changed files: `git diff --name-only main`
2. Review them with GPT-5.2
3. Incorporate feedback
4. Create PR with review insights

```bash
~/.claude/agents/gpt-reviewer.sh \
  "Review these changes from a user perspective before PR creation." \
  $(git diff --name-only main)
```

### User Explicitly Requests Review

User says: "Review this code" or "Check the user experience"

```bash
~/.claude/agents/gpt-reviewer.sh \
  "Provide UX-focused review of this implementation." \
  relevant/files.js
```

## What Reviewer Focuses On

- **User Experience**: Is this intuitive for users?
- **Edge Cases**: What could go wrong from user perspective?
- **Documentation**: Are error messages/docs clear?
- **Accessibility**: Can all users interact with this?
- **API Design**: Is the interface easy to use?

## Interpreting Feedback

The GPT-5.2 Reviewer returns feedback to stdout. Your workflow:

1. **Read the feedback** (it will output to stdout)
2. **Identify actionable items** (fix edge cases, improve docs, etc.)
3. **Implement improvements** based on reviewer suggestions
4. **Report back to user** with summary of review findings

## Integration with Other Agents

**Order of operations after feature implementation**:

1. **Test-Writer** (Claude 4.5 subagent) → Writes/runs tests
2. **Reviewer** (GPT-5.2) → UX and user perspective review
3. **Main Claude** (you) → Incorporates both feedbacks
4. **Create commit/PR** → With confidence from both technical and UX validation

## Customizing Review Focus

Tailor the review prompt to focus on specific concerns:

```bash
# Focus on accessibility
~/.claude/agents/gpt-reviewer.sh \
  "Review this for accessibility issues (screen readers, keyboard nav, color contrast)." \
  component.js

# Focus on error handling
~/.claude/agents/gpt-reviewer.sh \
  "Review error handling from a user perspective. Are error messages clear and actionable?" \
  error-handler.js

# Focus on documentation
~/.claude/agents/gpt-reviewer.sh \
  "Review the documentation for this API. Is it clear for first-time users?" \
  README.md api/docs.md
```

## When Reviewer Feedback Conflicts

If GPT-5.2 suggests changes that conflict with project patterns:

1. **Prioritize HDDL conventions** (from CLAUDE.md)
2. **Consult user** if major UX concern vs project pattern
3. **Document decision** in code comments if you disagree with reviewer

**Remember**: Reviewer provides **user perspective**, but you (Main Claude) make final decisions based on project context.

## Quick Reference

```bash
# Basic review
~/.claude/agents/gpt-reviewer.sh "Review this" file.js

# Multiple files
~/.claude/agents/gpt-reviewer.sh "Review UX" file1.js file2.js file3.js

# Git changes
~/.claude/agents/gpt-reviewer.sh "Review changes" $(git diff --name-only main)

# Focused review
~/.claude/agents/gpt-reviewer.sh "Review accessibility" component.js

# Pre-PR review
~/.claude/agents/gpt-reviewer.sh "Review before PR" $(git diff --name-only main)
```

## Advanced Patterns

For detailed troubleshooting and advanced review patterns, see [references/troubleshooting.md](references/troubleshooting.md).

---

**Remember**: Use this skill proactively! After you implement a feature, automatically delegate to reviewer for UX validation.

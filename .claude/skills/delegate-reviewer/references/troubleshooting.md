# Reviewer Agent Troubleshooting

## Issue: Reviewer script not found

**Symptom**: `bash: ~/.claude/agents/gpt-reviewer.sh: No such file or directory`

**Fix**:
```bash
# Check if script exists
ls -la ~/.claude/agents/gpt-reviewer.sh

# Make sure it's executable
chmod +x ~/.claude/agents/gpt-reviewer.sh
```

## Issue: Copilot not found

**Symptom**: `bash: copilot: command not found`

**Fix**:
```bash
# Verify copilot is installed
copilot --version

# Check PATH
which copilot
```

If copilot is not installed, install it according to GitHub Copilot CLI documentation.

## Issue: Review is too generic

**Symptom**: Reviewer provides vague, unhelpful feedback

**Cause**: Prompt lacks specific context

**Solution**: Provide more specific context in the prompt:

```bash
~/.claude/agents/gpt-reviewer.sh \
  "Review this React component for HDDL project. Focus on: 1) Particle animation UX, 2) Detail level transitions, 3) Tooltip clarity." \
  component.js
```

## Issue: Review takes too long

**Symptom**: Reviewer script hangs or takes >30 seconds

**Cause**: Too many files or files are too large

**Solution**: Break into smaller chunks:

```bash
# Instead of reviewing 20 files at once
~/.claude/agents/gpt-reviewer.sh "Review all" *.js

# Review in batches
~/.claude/agents/gpt-reviewer.sh "Review core" core-*.js
~/.claude/agents/gpt-reviewer.sh "Review utils" utils-*.js
```

## Issue: Permission denied when reading files

**Symptom**: Script can't read files passed as arguments

**Cause**: File permissions or paths are incorrect

**Fix**:
```bash
# Check file exists and is readable
ls -la path/to/file.js

# Use absolute paths if relative paths fail
~/.claude/agents/gpt-reviewer.sh "Review" "$(pwd)/path/to/file.js"
```

## Advanced Review Patterns

### Multi-stage Review

For large features, review in stages:

```bash
# Stage 1: Review core logic
~/.claude/agents/gpt-reviewer.sh \
  "Review core business logic. Focus on edge cases and error handling." \
  src/core/*.js

# Stage 2: Review UI components
~/.claude/agents/gpt-reviewer.sh \
  "Review UI components. Focus on accessibility and user interaction." \
  src/components/*.js

# Stage 3: Review integration
~/.claude/agents/gpt-reviewer.sh \
  "Review how these components integrate. Check for UX consistency." \
  src/pages/*.js
```

### Domain-Specific Reviews

```bash
# Review for specific user persona
~/.claude/agents/gpt-reviewer.sh \
  "Review this from the perspective of a non-technical end user. Is it intuitive?" \
  feature.js

# Review for accessibility compliance
~/.claude/agents/gpt-reviewer.sh \
  "Review for WCAG 2.1 AA compliance. Check keyboard navigation, ARIA labels, color contrast." \
  component.js
```

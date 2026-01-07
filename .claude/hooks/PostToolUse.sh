#!/bin/bash
# PostToolUse Hook - Auto-format code after edits
#
# Implements Boris's Principle #9: Use a PostToolUse hook to format Claude's code
# "Claude usually generates well-formatted code out of the box, and the hook
# handles the last 10% to avoid formatting errors in CI later."

# Only run for Edit and Write tools
if [[ "$TOOL_NAME" != "Edit" ]] && [[ "$TOOL_NAME" != "Write" ]]; then
    exit 0
fi

# Only run for JavaScript files in the project
if [[ "$FILE_PATH" != *.js ]] && [[ "$FILE_PATH" != *.mjs" ]]; then
    exit 0
fi

# Skip if file is in node_modules or outside hddl-sim
if [[ "$FILE_PATH" == *"node_modules"* ]] || [[ "$FILE_PATH" != *"hddl-sim"* ]]; then
    exit 0
fi

# Run Prettier if available
if command -v npx &> /dev/null; then
    # Suppress output, ignore errors (don't fail the edit if formatting fails)
    npx prettier --write "$FILE_PATH" 2>/dev/null || true
fi

exit 0

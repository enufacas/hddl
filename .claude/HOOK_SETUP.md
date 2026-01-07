# Hook Setup Guide for Helper Agent System

This guide shows how to configure Claude Code hooks to automatically initialize and trigger your helper agents.

## Overview

Hooks allow automatic execution of scripts at specific points:
- **PrePromptSubmit**: Before user message is processed (session initialization)
- **PostToolUse**: After you use a tool (auto-testing, auto-review)

## Option A: Automatic Session Initialization (Recommended)

This makes helpers initialize on the first message of each session.

### Steps:

1. **Open Claude Code CLI** and run:
   ```
   /hooks
   ```

2. **Select** `PrePromptSubmit`

3. **Click** `+ Add new hook`

4. **Enter the command**:
   ```bash
   ~/.claude/agents/init-session.sh
   ```

5. **Save** and exit

Now every time you start a new Claude Code session, the helpers will auto-initialize on your first message!

## Option B: Automatic Test Triggering After Code Edits

This triggers the Test-Writer agent automatically after you edit or write code.

### Steps:

1. **Open hooks configuration**:
   ```
   /hooks
   ```

2. **Select** `PostToolUse`

3. **Click** `+ Add new matcher`

4. **Enter matcher pattern**:
   ```
   Edit|Write
   ```

5. **Click** `+ Add new hook`

6. **Enter the command** (create this script first):
   ```bash
   ~/.claude/hooks/trigger-test-writer.sh
   ```

### Create the trigger script:

```bash
# Create the file
cat > ~/.claude/hooks/trigger-test-writer.sh << 'EOF'
#!/bin/bash
# Auto-trigger Test-Writer after code edits

# Parse tool input to get file path
FILE_PATH=$(echo "$CLAUDE_TOOL_INPUT" | jq -r '.file_path // empty')

# Only trigger for actual code files, not markdown/docs
if [[ "$FILE_PATH" =~ \.(js|ts|jsx|tsx|mjs)$ ]]; then
    echo "🧪 Triggering Test-Writer for: $FILE_PATH"
    # The test-writer subagent will be called by Main Claude when appropriate
fi
EOF

chmod +x ~/.claude/hooks/trigger-test-writer.sh
```

## Option C: Manual Initialization (Simplest)

Don't configure hooks at all. Instead, just run this command at the start of each session:

```
/init-helpers
```

## Verifying Hook Setup

### Check if hooks are configured:

1. Run `/hooks` in Claude CLI
2. Look for:
   - `PrePromptSubmit` with `init-session.sh` (for auto-init)
   - `PostToolUse` with matcher `Edit|Write` and trigger script (for auto-testing)

### Test the setup:

1. Start a new Claude Code session
2. Send any message
3. Look for initialization message: "🚀 Initializing Claude Code Helper Agents..."

If you see that, hooks are working!

## Troubleshooting

### Hook script not executing

**Check permissions**:
```bash
chmod +x ~/.claude/agents/init-session.sh
chmod +x ~/.claude/hooks/trigger-test-writer.sh
```

**Check script path**:
```bash
ls -la ~/.claude/agents/init-session.sh
```

### Hook executes but nothing happens

**Check script output**:
```bash
# Run manually to see output
~/.claude/agents/init-session.sh
```

**Check logs** (if Claude Code provides hook execution logs)

### Hooks triggering too often

**For PrePromptSubmit**: The init-session.sh script has built-in session detection using `/tmp/claude-session-*` markers. It should only initialize once per session.

**For PostToolUse**: Add file type filtering in the trigger script to avoid triggering on non-code files.

## Hook Priority and Order

If you have multiple hooks configured:

1. Hooks execute in the order they appear in config
2. PrePromptSubmit runs before Main Claude processes your message
3. PostToolUse runs after tool completes successfully

## Recommended Configuration

For the HDDL project, we recommend:

### ✅ DO Configure:
- PrePromptSubmit → init-session.sh (auto-initialize helpers)

### 🤔 OPTIONAL:
- PostToolUse → Auto-test trigger (if you want automatic testing)

### ❌ DON'T Configure (yet):
- PostToolUse → Auto-reviewer (wait until you establish workflow preferences)

Start simple (just auto-init), then add more automation as you get comfortable with the helper system.

## Alternative: Environment Variable Trigger

If hooks don't work as expected, you can use an environment variable:

```bash
# Add to your shell profile (~/.bashrc or ~/.zshrc)
export CLAUDE_AUTO_INIT_HELPERS=true

# Then Main Claude can check this variable and auto-init
```

## Next Steps

1. Choose your preferred option (A, B, or C)
2. Configure hooks using `/hooks` command
3. Test with a new session
4. Adjust automation level based on your workflow

See `CLAUDE.md` for complete documentation on the helper agent system.

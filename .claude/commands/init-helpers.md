---
description: Initialize helper agent system for this session
---

Initialize the three-agent helper system:

```
Main Claude (claude-sonnet-4.5): You - complex reasoning and implementation
├─ Test-Writer (claude-4.5): Automatic testing after code edits
├─ Reviewer (gpt-5.2): User perspective reviews after features
└─ Quick-Helper (gpt-5-mini): Fast simple tasks
```

Run the session initialization script:

```bash
~/.claude/agents/init-session.sh
```

Report that helpers are ready and remind me to:
- Automatically delegate simple tasks to Quick-Helper
- Run Reviewer after implementing features
- Let Test-Writer handle test writing automatically

The helper agents are now active for this session.

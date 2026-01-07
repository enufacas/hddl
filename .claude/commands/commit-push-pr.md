# commit-push-pr

Complete workflow: commit changes, push to remote, and create pull request.

## Instructions

Follow this workflow to commit, push, and create a PR:

### Step 1: Check Status (Pre-computed)
```bash
git status && git diff --stat && git log --oneline -5
```
- See what files changed
- Review recent commits for message style
- Identify untracked files that should be committed

### Step 2: Draft Commit Message

Analyze changes and draft a commit message following this format:

```
<Type>: <Brief summary of changes>

<Optional: 2-3 sentence explanation of why this change was made>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:** feat, fix, refactor, test, docs, chore

**Guidelines:**
- Focus on **why** not **what** (git diff shows what)
- Keep summary under 72 characters
- Use imperative mood ("Add" not "Added")
- Match the style of recent commits

### Step 3: Stage and Commit
```bash
git add <files> && git commit -m "$(cat <<'EOF'
<commit message with co-author footer>
EOF
)"
```

**What to stage:**
- All files relevant to this logical change
- Don't commit unrelated changes
- Avoid committing secrets (.env, credentials.json, etc.)

### Step 4: Push to Remote
```bash
git push -u origin <branch-name>
```
- Use `-u` flag to set upstream tracking
- Creates remote branch if it doesn't exist

### Step 5: Create Pull Request
```bash
gh pr create --title "<PR title>" --body "$(cat <<'EOF'
## Summary
- <Key change 1>
- <Key change 2>
- <Key change 3>

## Test Plan
- [ ] Conformance tests pass
- [ ] Unit tests pass
- [ ] Verified in browser at localhost:5173
- [ ] Scenario analysis shows no issues

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**PR Guidelines:**
- Title should match commit message summary
- Summary uses bullet points for clarity
- Test plan shows what verification was done
- Include verification results from `/verify`

## Report Format

After completion, report:

```
✓ Committed: feat: Add boundary_reason field to scenario schema
✓ Pushed: origin/add-boundary-reason
✓ PR Created: #42 - https://github.com/user/repo/pull/42
```

## Error Handling

**If commit fails due to pre-commit hook:**
- Fix the issue identified by the hook
- Create a NEW commit (don't amend unless you created the HEAD commit)
- Re-run the workflow

**If push fails:**
- Check if remote branch exists
- Verify git credentials
- Check for conflicts with remote

**If PR creation fails:**
- Ensure `gh` CLI is authenticated
- Check that branch is pushed
- Verify repository has PR permissions

## Notes

- Boris uses this "dozens of times every day" (Principle #7)
- Automates the full commit→push→PR workflow
- Uses HEREDOC for clean multi-line messages
- Pre-computes git info to minimize model back-and-forth

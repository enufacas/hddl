# Pre-Generated AI Narratives Feature

## Overview

This feature enables instant loading of AI-generated narratives for all built-in scenarios. Instead of waiting 10-30 seconds for an LLM to generate a narrative on-demand, users see pre-generated narratives immediately when opening the AI panel.

## Architecture

### Components

1. **Generation Script**: `scripts/generate-narratives.mjs`
   - Batch generates narratives for all scenarios
   - Uses `api/narrative-generator.mjs` with full context
   - Saves to `src/sim/scenarios/<scenario>.narrative.json`

2. **Storage**: `.narrative.json` files
   - Stored alongside scenario files in repository
   - Contains: narrative markdown, citations array, metadata
   - Version controlled for easy review and rollback

3. **UI Integration**: `workspace.js` 
   - Checks for pre-generated narrative on mount
   - Falls back to LLM generation if not found
   - Shows "Regenerate" button when pre-generated narrative loaded

### Flow

```
User opens AI panel
  ↓
Check for <scenario>.narrative.json
  ↓
If found:
  ├─ Load instantly (0ms)
  ├─ Display with citations
  └─ Show "Regenerate" button
  
If not found:
  ├─ Show "Generate" button
  └─ User clicks → API call (10-30s)
```

## Benefits

### User Experience
- **Instant Load**: No waiting for LLM generation
- **Consistent Quality**: Curated narratives reviewed before commit
- **Offline Access**: Works without API connectivity
- **Cost Transparency**: Users see what LLM generation looks like before paying

### Developer Experience
- **Version Control**: Track narrative changes in git
- **Review Process**: Review/approve narratives before release
- **Cost Savings**: Generate once, serve infinitely
- **Batch Processing**: Generate all scenarios with one command

### Economic
- **No API Costs**: Pre-generated narratives serve for free
- **Optional Regeneration**: Users only pay when they want custom narratives
- **Predictable Costs**: One-time generation cost (~$0.20 for all 11 scenarios)

## Usage

### Generate All Narratives

```bash
# Dry run (preview what would be generated)
npm run generate:narratives:dry-run

# Generate for real (requires GOOGLE_CLOUD_PROJECT)
npm run generate:narratives

# Review output
ls src/sim/scenarios/*.narrative.json
```

### Generate Specific Scenario

```bash
node scripts/generate-narratives.mjs --scenario insurance-underwriting
```

### Regenerate Existing

```bash
# Force regeneration even if narrative exists
node scripts/generate-narratives.mjs --force
```

## Output Format

Each `.narrative.json` file contains:

```json
{
  "scenarioId": "test-minimal",
  "scenarioName": "test-minimal",
  "title": "Test Minimal — Fast Test Harness",
  "narrative": "# Test Minimal...\n\nInside the testing lab...",
  "citations": [
    {
      "eventId": "decision-test-1",
      "offset": 328,
      "context": "...aligned with the historical baseline...",
      "hour": 1,
      "type": "decision",
      "envelopeId": "env-test-policy",
      "actorRole": "policy"
    }
  ],
  "metadata": {
    "model": "gemini-3-flash-preview",
    "method": "llm-full-context",
    "cost": 0.002917,
    "tokensIn": 3044,
    "tokensOut": 465,
    "generatedAt": "2026-01-02T19:45:00.000Z",
    "generatedBy": "scripts/generate-narratives.mjs",
    "scenarioVersion": "1.3",
    "duration": 12990
  }
}
```

## UI Behavior

### Without Pre-Generated Narrative
1. User opens AI panel
2. Sees: "Generate AI Narrative" button
3. Clicks → 10-30s wait → narrative appears

### With Pre-Generated Narrative
1. User opens AI panel
2. Narrative appears instantly (< 100ms)
3. Sees: "Regenerate AI Narrative" button
4. Optionally clicks → can customize with user prompt

### User Prompt Integration
- Pre-generated narratives use standard prompt
- Users can add "User Prompt" text to customize regeneration
- Regeneration makes LLM call with custom addendum
- Result replaces pre-generated narrative for current session

## Cost Analysis

### Generation Costs (One-Time)
- **Per scenario**: $0.003-0.020 (varies by size)
- **All 11 scenarios**: ~$0.11-0.22 total
- **Typical scenario**: ~$0.012 (insurance-underwriting)

### Ongoing Costs
- **Serving pre-generated**: $0 (static file)
- **User regeneration**: $0.01-0.02 per request (optional)
- **Monthly savings**: Significant for popular scenarios

Example: If 100 users view insurance-underwriting/month:
- **Without pre-gen**: 100 × $0.012 = $1.20/month
- **With pre-gen**: $0.012 (one-time) + optional user regen
- **Savings**: ~$1.19/month per scenario

## When to Regenerate

Regenerate narratives when:

1. **Scenario Changes**
   - New events added
   - Envelopes modified
   - Actor relationships updated

2. **Quality Improvements**
   - Better narrative prompts
   - Improved citation parsing
   - New model versions

3. **Content Updates**
   - Style/tone changes
   - HDDL terminology refinements
   - Improved storytelling

## Development Workflow

### Initial Generation
```bash
# 1. Generate all narratives
npm run generate:narratives

# 2. Review in UI
npm run dev
# Open http://localhost:5173
# Navigate through scenarios, check AI panel

# 3. Commit to repo
git add src/sim/scenarios/*.narrative.json
git commit -m "Pre-generate AI narratives for all scenarios"
git push
```

### Updating Single Scenario
```bash
# 1. Modify scenario JSON
vim src/sim/scenarios/insurance-underwriting.scenario.json

# 2. Regenerate narrative
node scripts/generate-narratives.mjs --scenario insurance-underwriting --force

# 3. Review in UI
npm run dev

# 4. Commit both files
git add src/sim/scenarios/insurance-underwriting.*
git commit -m "Update insurance scenario and regenerate narrative"
```

## Technical Details

### Loading Mechanism
```javascript
// In workspace.js
const loadPreGeneratedNarrative = async (scenarioKey, containerEl) => {
  const narrativeUrl = `./src/sim/scenarios/${scenarioKey}.narrative.json`
  const response = await fetch(narrativeUrl)
  
  if (!response.ok) {
    throw new Error(`Not found: ${response.status}`)
  }
  
  const data = await response.json()
  // Render narrative with citations...
}
```

### Generation Process
```javascript
// In generate-narratives.mjs
const analysis = analyzeScenario(scenario)
const result = await generateLLMNarrative(analysis, scenario, { 
  fullContext: true 
})

const output = {
  scenarioId: scenario.id,
  scenarioName: scenarioName,
  title: analysis.metadata.name,
  narrative: result.markdown,
  citations: result.citations,
  metadata: { ...result.metadata, generatedAt: new Date().toISOString() }
}

await writeFile(narrativePath, JSON.stringify(output, null, 2), 'utf-8')
```

### Fallback Behavior
- If `.narrative.json` missing → show "Generate" button
- If fetch fails → show "Generate" button
- If parse error → log warning, show "Generate" button
- Generated scenarios (not built-in) → always use LLM generation

## Future Enhancements

### Potential Improvements
1. **Narrative Versioning**: Track narrative schema version separately
2. **Diff View**: Show what changed when regenerating
3. **Quality Metrics**: Track citation density, readability scores
4. **Localization**: Generate narratives in multiple languages
5. **A/B Testing**: Compare different narrative styles

### Automation Ideas
1. **CI Pipeline**: Auto-regenerate on scenario changes
2. **Git Hooks**: Pre-commit check for narrative freshness
3. **Scheduled Updates**: Weekly batch regeneration
4. **Quality Checks**: Automated narrative quality validation

## FAQ

**Q: Why not generate narratives on-demand?**
A: Pre-generation provides instant UX and significant cost savings for popular scenarios.

**Q: What if scenario changes but narrative is stale?**
A: Regenerate with `--force` flag. Consider adding CI check for this.

**Q: Can users still get custom narratives?**
A: Yes! Click "Regenerate" and add custom prompt text.

**Q: How large are narrative files?**
A: Typically 3-10KB per scenario (compressed with gzip in production).

**Q: Do we commit narrative files to git?**
A: Yes! This enables review, version control, and offline access.

**Q: What about generated scenarios?**
A: Generated scenarios (not built-in) always use on-demand LLM generation.

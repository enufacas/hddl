# Scripts Documentation

## Narrative Pre-Generation

### Overview
The `generate-narratives.mjs` script pre-generates AI narratives for all scenarios and stores them in the repository. This enables instant narrative display in the UI while still allowing users to regenerate with custom prompts.

### Benefits
- **Instant Load**: Users see narratives immediately when opening the AI panel (no LLM call delay)
- **Cost Savings**: Only pay for generation once, serve cached narratives to all users
- **Version Control**: Narratives are tracked in git, making it easy to review changes
- **Offline Access**: Narratives work without API connectivity
- **User Choice**: Users can still click "Regenerate" to create custom narratives

### Usage

**Dry run (no LLM calls):**
```bash
npm run generate:narratives:dry-run
```

**Generate all narratives:**
```bash
# Make sure GOOGLE_CLOUD_PROJECT is set
npm run generate:narratives
```

**Generate specific scenario:**
```bash
node scripts/generate-narratives.mjs --scenario insurance-underwriting
```

**Regenerate existing narratives:**
```bash
node scripts/generate-narratives.mjs --force
```

### Output Format

Narratives are saved as `<scenario-name>.narrative.json`:

```json
{
  "scenarioId": "scenario-id",
  "scenarioName": "insurance-underwriting",
  "title": "Insurance Underwriting — Risk Assessment & Claims",
  "narrative": "# Insurance Underwriting...",
  "citations": [
    {
      "eventId": "boundary_interaction:5_3:ENV-INS-001:4",
      "offset": 448,
      "context": "...elevated flood risks...",
      "hour": 5.3,
      "type": "boundary_interaction"
    }
  ],
  "metadata": {
    "model": "gemini-3-flash-preview",
    "method": "llm-full-context",
    "cost": 0.011081,
    "tokensIn": 20710,
    "tokensOut": 242,
    "generatedAt": "2026-01-02T19:30:00.000Z",
    "generatedBy": "scripts/generate-narratives.mjs",
    "scenarioVersion": "1.3",
    "duration": 13403
  }
}
```

### Cost Estimates

Based on current Gemini pricing:
- **Per narrative**: ~$0.01-0.02 (depends on scenario size)
- **All 11 scenarios**: ~$0.11-0.22 total
- **Token usage**: ~15-25k tokens per scenario

### Workflow

1. **Generate narratives** (one-time or when scenarios change):
   ```bash
   npm run generate:narratives
   ```

2. **Review generated narratives**:
   - Check `src/sim/scenarios/*.narrative.json`
   - Verify narrative quality and citations
   - Test in UI by loading scenarios

3. **Commit to repository**:
   ```bash
   git add src/sim/scenarios/*.narrative.json
   git commit -m "Pre-generate AI narratives for all scenarios"
   ```

4. **Users benefit automatically**:
   - Open AI panel → narrative loads instantly
   - Click "Regenerate" to customize with user prompt

### When to Regenerate

Regenerate narratives when:
- Scenario JSON files change (new events, envelopes, actors)
- Narrative quality improves (better prompts, newer models)
- Citations are incorrect or missing
- You want to update narrative style/tone

### Integration with UI

The `workspace.js` component automatically:
1. Checks for pre-generated narrative when mounting AI panel
2. Loads `<scenario-name>.narrative.json` if available
3. Displays narrative with citations immediately
4. Shows "Regenerate" button instead of "Generate"
5. Falls back to LLM generation if no pre-generated narrative exists

### Troubleshooting

**Error: GOOGLE_CLOUD_PROJECT not set**
```bash
# Create .env file in hddl-sim/
echo "GOOGLE_CLOUD_PROJECT=your-gcp-project-id" > .env
```

**Error: Narrative already exists**
```bash
# Use --force to regenerate
node scripts/generate-narratives.mjs --force
```

**Error: Scenario not found**
```bash
# Check available scenarios
ls src/sim/scenarios/*.scenario.json

# Ensure filename matches (without .scenario.json extension)
node scripts/generate-narratives.mjs --scenario insurance-underwriting
```

### Advanced Options

**Generate single scenario with custom timeout:**
```javascript
// Modify generate-narratives.mjs if needed
const result = await generateLLMNarrative(analysis, scenario, { 
  fullContext: true,
  timeout: 60000 // 60s instead of default 120s
});
```

**Test pre-generated narratives:**
```bash
# Start dev server
npm run dev

# Open http://localhost:5173
# Navigate to any scenario
# Click "AI Narrative" panel
# Should load instantly with "Regenerate" button
```

# Narrative Generation Implementation Notes

For the current end-to-end workflow (with ASCII diagrams and the recommended local container flow), see:
- `hddl-sim/docs/Narrative_Generation_Workflow.md`

## Overview

AI-generated narratives now include HDDL conceptual framing, teaching readers the framework while telling the scenario story.

## Generation Modes

### Template Generation (default)
- **Method**: Deterministic, structured output
- **Use case**: Consistent formatting, detailed analysis
- **Output**: ~200 lines with sections for actors, events, cycles
- **Cost**: Free (no API calls)

### LLM Generation (Gemini via Vertex AI)
- **Method**: Natural language generation with HDDL context injection
- **Use case**: Readable narratives for documentation, presentations
- **Output**: Flowing narrative using HDDL terminology
- **Cost**: Depends on model + scenario size (see `metadata.cost` in results)
- **Token usage**: Depends on scenario size (see `metadata.tokensIn` / `metadata.tokensOut`)

### Hybrid Generation
- **Method**: Template structure + LLM-enriched conclusion
- **Use case**: Balance between structure and readability
- **Not yet implemented** (placeholder exists)

## HDDL Context Injection

The LLM prompt includes ~600 tokens of HDDL conceptual framing:

### Concepts Explained
- **Decision Envelope**: Versioned, steward-owned boundaries with assumptions & constraints
- **Steward**: Domain-aligned engineer with bounded decision authority (not gatekeeper)
- **Boundary Interaction**: Execution reaching envelope boundaries (escalated/overridden)
- **Revision**: Authoritative envelope change creating lineage
- **Feedback Loop**: Boundary → Steward decision → Revision cycle
- **Decision Memory**: AI-assisted recall (embeddings) that supports but doesn't decide

### Terminology Guidance
Prompts instruct the LLM to:
- Use HDDL vocabulary naturally in context
- Explain concepts through specific examples from the scenario
- Frame human-AI collaboration through explicit decision authority lens
- Avoid generic "AI governance" language in favor of precise HDDL terms

## Quality Comparison

### Before (Generic AI Governance)
> "This scenario demonstrates AI governance within insurance underwriting and claims processing, focusing on risk assessment, fraud detection, and regulatory compliance. The narrative showcases how automated agents and human stewards collaborate to optimize processes..."

**Issues**: Generic, could describe any AI system, no framework-specific terminology

### After (HDDL-Framed)
> "This scenario illustrates AI governance in insurance underwriting and claims processing, demonstrating how autonomous agents can operate within defined **decision envelopes** while preserving human authority... At hour 5.3, the ThresholdEscalator agent encountered a **boundary interaction** when a homeowner's policy exceeded the high-risk threshold... This triggered a **feedback loop**: at hour 6.2, the Underwriting Steward, Rebecca Foster, **revised the envelope** to codify the flood mitigation requirement as a **constraint**..."

**Benefits**: 
- Uses precise HDDL terms naturally
- Explains concepts through concrete examples
- References specific hours, actors, decisions from scenario data
- Educational value - reader learns HDDL while reading the story

## Implementation

**File**: `hddl-sim/api/narrative-generator.mjs`

**Pre-generation script**: `hddl-sim/scripts/generate-narratives.mjs`

**Local API server**: `hddl-sim/api/server.mjs` (endpoint: `POST /generate`)

### Command-Line Interface

Pre-generate and store `*.narrative.json` artifacts:

```bash
# Dry run (no LLM calls)
node scripts/generate-narratives.mjs --dry-run

# Regenerate a single scenario (via local API container)
node scripts/generate-narratives.mjs --scenario default --force --use-api
```

### Key Functions
- `buildNarrativePrompt(analysis, scenario, fullContext)`: Constructs prompt with HDDL context
- `generateLLMNarrative(analysis, scenario, options)`: Calls Vertex AI with cost tracking
- `generateTemplateNarrative(analysis)`: Structured deterministic output

## Cost Analysis

| Scenario | Input Tokens | Output Tokens | Total Cost |
|----------|--------------|---------------|------------|
| insurance-underwriting | 17,841 | ~600 | $0.0015 |
| test-minimal | 1,792 | ~430 | $0.0003 |

**Free tier budget**: $246 credit = ~164,000 insurance-scale narratives

## Next Steps

1. ✅ Add HDDL conceptual framing to prompts
2. ✅ Implement file save functionality
3. ⏭️ Generate narratives for all 11 scenarios
4. ⏭️ Implement validation layer (detect hallucinations)
5. ⏭️ UI integration (display in workspace.js detail panel)
6. ⏭️ Paragraph-to-event mapping (synchronized highlight on hover)
7. ⏭️ Caching layer (avoid regenerating identical scenarios)
8. ⏭️ Frontmatter metadata (model version, timestamp, validation results)

## Files Generated

- `analysis/narratives/insurance-underwriting-hddl.md` (3,416 chars)
- `analysis/narratives/test-minimal-hddl.md` (2,188 chars)

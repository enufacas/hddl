# Plan: AI-Generated Scenario Narratives

**Status:** Proposed  
**Created:** 2025-12-30  
**Purpose:** Nerd out, show off, thought exercise for the future

## Overview

Add narrative generation capability to HDDL scenarios using hybrid template+LLM approach. Templates provide structure and deterministic fallback; Gemini Vertex AI generates natural prose for impressive demos. Narratives display on right side of UI (replacing current detail view) with synchronized playback. Validates scenario coherence while making HDDL concepts tangible through storytelling.

## The Vision

Transform scenario data into human-readable stories that:
- Make HDDL concepts click for viewers ("Oh! This is how we'd actually govern AI systems")
- Demonstrate data quality (scenarios are coherent enough for AI to narrate)
- Prove the thesis: humans and AI working together, each doing what they do best
- Enable "science fiction prototyping" - help people imagine the future of AI governance

## Implementation Steps

### 1. Create narrative-generator.mjs in analysis folder

Build the core generation engine:
- Parse scenario JSON to extract feedback cycles, actors, timeline from [insurance-underwriting.scenario.json](hddl-sim/src/sim/scenarios/insurance-underwriting.scenario.json)
- Implement simple template-based structure generator (deterministic, no API needed)
- Add Gemini Vertex AI integration with graceful fallback to templates
- Start with single narrative style, optimized for human understanding
- Focus on clarity over complexity in initial implementation

### 2. Implement hybrid generation strategy

Combine templates + LLM for best results:
- **Templates** extract semantic structure (who/what/when/why)
- **Prompt engineering** builds constrained prompts preventing hallucination (only use provided data)
- **Gemini Vertex AI** enriches with natural prose and contextual understanding
- **Validation** checks LLM output against source events for factual accuracy
- **Fallback** uses template-only generation if API fails

### 3. Add CLI interface and storage

Command-line tool for testing and batch generation:
```bash
node analysis/narrative-generator.mjs <scenario> [--method llm|template|hybrid] [--output file.md]
```

Storage strategy:
- Store generated narratives in `analysis/narratives/` folder
- Include metadata (model, timestamp, validation results) in markdown frontmatter
- Cache keyed by scenario content hash to detect changes
- Commit to git (narratives are interesting artifacts worth preserving)

### 4. Set up Gemini Vertex AI integration

Google Cloud setup:
- Add `@google-cloud/vertexai` dependency to [package.json](hddl-sim/package.json)
- Require `GOOGLE_CLOUD_PROJECT` environment variable
- Add setup documentation with API enablement steps
- Use Gemini Flash model (fast ~2-5s, cheap ~$0.0002/scenario, suitable for this task)
- Test reliability and quality of generated narratives extensively

### 5. Integrate into UI with synchronized playback

Replace current detail panel with narrative view:
- Display markdown narrative on right side of [workspace.js](hddl-sim/src/components/workspace.js)
- Parse narrative to identify event references (embed event IDs in comments or metadata)
- Highlight current narrative paragraph as simulation plays
- Allow clicking narrative text to jump simulation to that moment
- Implement mode option for sync behavior:
  - **Auto-follow mode**: Narrative scrolls automatically with playback
  - **Manual mode**: User controls narrative position, highlights show current event

### 6. Add validation feedback loop

Narrative generation as quality signal:
- If LLM struggles to generate coherent narrative → flag scenario quality issues in [scenario-analysis.mjs](hddl-sim/analysis/scenario-analysis.mjs)
- Track invented details (hallucinations) as signal of missing explicit information
- Surface temporal/causal gaps that confuse narrative generation
- Report validation results alongside other scenario health metrics

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Scenario JSON (insurance-underwriting.scenario.json)        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ narrative-generator.mjs                                      │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ Template Engine  │         │ Gemini Vertex AI │         │
│  │  - Extract       │◄────────┤  - Natural prose │         │
│  │    structure     │  hybrid │  - Context       │         │
│  │  - Fallback      │         │  - Validation    │         │
│  └──────────────────┘         └──────────────────┘         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ analysis/narratives/insurance-underwriting.md               │
│  - Frontmatter (metadata)                                    │
│  - Event references (for sync)                               │
│  - Human-readable prose                                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ UI: workspace.js                                             │
│  - Replace detail panel                                      │
│  - Parse markdown                                            │
│  - Sync with simulation                                      │
│  - Click to jump                                             │
└─────────────────────────────────────────────────────────────┘
```

## Open Questions (Experiment & Discover)

### 1. Narrative Structure
**Question:** How should we organize the narrative?

**Options to test:**
- **Chronological**: Simple timeline, hour by hour
- **Feedback cycles**: Grouped by boundary → decision → revision arcs
- **Actor-focused**: Follow one steward's journey
- **Thematic**: Organized by governance concepts

**Approach:** Generate all variants, see which reads best for insurance scenario

### 2. Paragraph-to-Event Mapping
**Question:** How granular should event references be?

**Options to test:**
- One event per paragraph (simple, precise)
- Event ranges per section (more natural prose)
- Implicit references (no explicit tracking)
- Hybrid (key events marked, others flow naturally)

**Approach:** Test sync UX with different granularities

### 3. Generation Timing
**Question:** When should narratives be generated?

**Depends on:** AI API reliability assessment

**Options:**
- **Pre-generate**: Run during scenario load/build, always available
- **On-demand**: Generate when user requests, show loading state
- **Hybrid**: Cache pre-generated, regenerate if scenario changes

**Approach:** Test Gemini API stability over 1-2 weeks before deciding

### 4. Sync Modes
**Question:** How should narrative and simulation stay in sync?

**Options to test:**
- Auto-scroll narrative with playback (cinematic)
- Highlight only, manual scroll (user control)
- Bidirectional (narrative click jumps sim, sim updates narrative)
- Selectable mode (let user choose)

**Approach:** Build all modes, default to auto-scroll, let user feedback guide priority

## Success Metrics

### Technical Success
- [ ] Generates coherent narratives for all 11 scenarios
- [ ] Template fallback works when API unavailable
- [ ] Validation catches >80% of hallucinations
- [ ] Generation completes in <10 seconds
- [ ] UI sync feels natural, no lag

### "Show Off" Success
- [ ] People say "wow, that's cool" when seeing demo
- [ ] Narratives are shareable (people send them to colleagues)
- [ ] Makes HDDL concepts click ("now I get it!")
- [ ] Demonstrates recursive meta-concept (AI helping explain AI governance)

### Practical Success
- [ ] Catches scenario quality issues through narrative validation
- [ ] Improves scenario authoring (authors think about narrative coherence)
- [ ] Useful for documentation/training
- [ ] Helps communicate HDDL to stakeholders

## Dependencies

### Required
- `@google-cloud/vertexai` npm package
- Google Cloud project with Vertex AI API enabled
- `GOOGLE_CLOUD_PROJECT` environment variable
- Google Cloud credentials configured

### Optional
- Caching layer (for faster regeneration)
- Markdown renderer for UI
- Syntax highlighting for code blocks in narratives

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM hallucinations | Medium | Constrained prompts, validation layer, template fallback |
| API unreliability | Low | Graceful fallback to templates, caching |
| Poor narrative quality | Medium | Extensive prompt engineering, human review, iteration |
| Sync complexity | Medium | Start simple (highlight only), iterate based on testing |
| API costs | Low | Gemini Flash is very cheap (~$0.0002/scenario) |

## Future Enhancements

After core implementation works:

1. **Multiple narrative styles**
   - Executive summary (3 paragraphs)
   - Steward journal (first-person)
   - Case study (academic)
   - Future history (retrospective from 2030)

2. **Interactive features**
   - Filter narrative by actor
   - Show/hide different event types
   - Diff narratives across envelope versions

3. **Export options**
   - PDF generation
   - Shareable web links
   - Embedded simulation viewer

4. **AI collaboration**
   - Suggest scenario improvements based on narrative gaps
   - Generate scenarios from natural language descriptions
   - Explain governance concepts referenced in narrative

## References

- [insurance-underwriting.scenario.json](hddl-sim/src/sim/scenarios/insurance-underwriting.scenario.json) - Primary test scenario
- [scenario-analysis.mjs](hddl-sim/analysis/scenario-analysis.mjs) - Existing validation tool
- [workspace.js](hddl-sim/src/components/workspace.js) - UI integration point

## Next Steps

1. **Proof of concept** (1-2 days)
   - Create basic narrative-generator.mjs
   - Test template generation only
   - Generate narrative for insurance scenario
   - Manual review of quality

2. **Gemini integration** (1 day)
   - Add Vertex AI dependency
   - Build prompt engineering
   - Test on insurance scenario
   - Evaluate quality vs templates

3. **Validation layer** (1 day)
   - Build hallucination detection
   - Test with intentionally bad prompts
   - Refine constraints

4. **UI prototype** (2-3 days)
   - Replace detail panel
   - Basic markdown rendering
   - Simple highlight sync
   - Test UX

5. **Iteration** (ongoing)
   - Gather feedback
   - Refine based on open questions
   - Expand to all scenarios
   - Polish for demo

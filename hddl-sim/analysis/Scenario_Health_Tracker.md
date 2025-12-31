# HDDL Scenario Health Tracker

Last Updated: 2025-12-31

## Overview

This tracker monitors the health and compliance of all HDDL scenarios. Run `node analysis/scenario-analysis.mjs <scenario-name>` to analyze individual scenarios and update this tracker.

## Health Status Legend

- ✅ **Compliant** - Meets all required standards
- ⚠️ **Needs Work** - Missing recommended patterns or has warnings
- ❌ **Non-Compliant** - Violates required standards (missing embeddings, time paradoxes, etc.)
- ⏳ **Not Analyzed** - Needs initial analysis

## Scenario Health Summary

| Scenario | Status | Rev w/ Emb | Bound w/ Emb | Time Paradox | Complete Cycles | Warnings | Last Analyzed |
|----------|--------|------------|--------------|--------------|-----------------|----------|---------------|
| insurance-underwriting | ✅ | 7/7 ✅ | 6/6 ✅ | 0 ✅ | 6/6 ✅ | 12W | 2025-12-30 |
| financial-lending | ✅ | 1/1 ✅ | 4/4 ✅ | 0 ✅ | 4/4 ✅ | 5W 2S | 2025-12-31 |
| medical-diagnosis | ✅ | 3/3 ✅ | 2/2 ✅ | 0 ✅ | 2/2 ✅ | 7W 1S | 2025-12-31 |
| autonomous-vehicles | ✅ | 3/3 ✅ | 2/2 ✅ | 0 ✅ | 2/2 ✅ | 6W 3S | 2025-12-31 |
| database-performance | ⚠️ | 2/2 ✅ | 2/2 ✅ | 0 ✅ | 0/2 ⚠️ | 5W 2S | 2025-12-31 |
| saas-dashboarding | ⚠️ | 2/2 ✅ | 3/3 ✅ | 0 ✅ | 0/3 ⚠️ | 5W 4S | 2025-12-31 |
| baseball-analytics | ⚠️ | 2/2 ✅ | 4/4 ✅ | 0 ✅ | 0/4 ⚠️ | 5W 5S | 2025-12-31 |
| airforce-avionics-maintenance | ⚠️ | 2/2 ✅ | 5/5 ✅ | 0 ✅ | 0/5 ⚠️ | 7W 7S | 2025-12-31 |
| vertical-hydroponics-farm | ⚠️ | 2/2 ✅ | 5/5 ✅ | 0 ✅ | 0/5 ⚠️ | 6W 7S | 2025-12-31 |
| test-minimal | ✅ | 1/1 ✅ | 1/1 ✅ | 0 ✅ | 1/1 ✅ | 2W 2S 1I | 2025-12-31 |
| default | ✅ | 4/4 ✅ | 2/2 ✅ | 0 ✅ | 2/2 ✅ | 4W | 2025-12-31 |

**Column Key:**
- **Rev w/ Emb** = Revisions with Embeddings (REQUIRED)
- **Bound w/ Emb** = Boundaries with Embeddings (REQUIRED)
- **Time Paradox** = Chronological violations (REQUIRED: must be 0)
- **Complete Cycles** = Boundaries with complete feedback cycles (Boundary → Decision → Revision)
- **Warnings** = W=Warning, S=Suggestion, I=Info

**Progress Summary:**
- ✅ 6/11 scenarios with complete feedback cycles
- ⚠️ 5/11 scenarios need revisions to complete cycles
- 🎯 All scenarios are compliant with REQUIRED closed-loop standards

## Required Compliance Metrics

These are **MUST HAVE** for all scenarios (per [Canonical_Event_Patterns.md](../../docs/spec/Canonical_Event_Patterns.md)):

### 1. Revisions with Embeddings (REQUIRED)
Every `revision` event MUST have a corresponding `embedding` event with `embeddingType: "revision"` and `sourceEventId` pointing to the revision.

**Why:** Policy changes must be retrievable for agents to understand governance evolution.

### 2. Boundaries with Embeddings (REQUIRED)
Every `boundary_interaction` event MUST have a corresponding `embedding` event with `embeddingType: "boundary_interaction"` and `sourceEventId` pointing to the boundary.

**Why:** Escalation patterns teach agents their authority boundaries.

### 3. No Time Paradoxes (REQUIRED)
`retrieval` events can only reference embeddings that exist BEFORE the retrieval (chronologically consistent).

**Why:** Agents can't retrieve knowledge that doesn't exist yet.

## Recommended Patterns

These are **SHOULD HAVE** for realistic scenarios:

### 4. Boundaries Preceded by Retrieval
Boundary interactions should be preceded by a retrieval event ~0.5 hours before, showing the agent "thinking with memory" before escalating.

### 5. Steward Decisions with Embeddings
Decision events by stewards should have embeddings to show human judgment patterns for agent learning.

### 6. Historical Baseline
Scenarios should include embeddings at `hour < 0` representing pre-existing knowledge agents start with.

## Fidelity Validation (Advanced)

Beyond structural compliance, the analyzer checks **scenario realism** across 4 dimensions:

### Semantic Coherence & Learning
Validates the quality of the semantic vector space and retrieval patterns:
- **Semantic vector validity** - All embeddings have 2D vectors in [0,1] range
- **Semantic diversity** - Embeddings distributed across policy/operational and routine/exceptional quadrants
- **Query-embedding alignment** - Retrieval queries contain words from retrieved embedding contexts (≥20% overlap)
- **Relevance score realism** - Scores show natural variation (not all ≥95%)
- **Historical baseline usage** - Pre-existing knowledge (hour < 0) is retrieved by agents

### Feedback Loop Effectiveness  
Measures how well the learning cycle actually closes:
- **Revision-boundary alignment** - Revisions semantically address their triggering boundaries (≥15% word overlap)
- **Learning evidence** - Revision embeddings are reused in future retrievals (shows agents learning from policy changes)
- **Boundary recurrence patterns** - Similar boundaries should decrease over time as policies improve

### Temporal Realism
Validates realistic time delays in the scenario:
- **Embedding delays** - Created 0.2-2h after source events (realistic processing time)
- **Retrieval-to-action timing** - 0.05-0.7h gap between retrieval and subsequent boundary/decision
- **Decision latency patterns** - Escalated decisions should show deliberation time vs routine decisions

### Actor Behavior Patterns
Ensures agents and stewards act realistically:
- **Agent specialization** - Agents stay within their designated envelope scopes
- **Decision variety** - Agents don't always allow or always deny (shows nuanced judgment)
- **Retrieval usage** - Stewards consult memory before complex decisions (realistic human behavior)

## Particle Flow Validation

Visual correctness checks to ensure proper rendering:

- **Missing boundary_kind** - Boundaries must specify `escalated`, `deferred`, or `overridden`
- **Missing agent lookups** - Events need `actorName` or `agentId` to source particles correctly
- **Missing envelope targets** - Events need `envelopeId` to route particles
- **Unresolved boundaries** - Boundaries should have resolution events (decision/revision) for proper orbit duration

## Detailed Analysis Reports

For comprehensive analysis of specific scenarios, see:
- [Insurance_Scenario_Deep_Dive.md](./Insurance_Scenario_Deep_Dive.md)

## How to Update This Tracker

1. Run analysis on a scenario:
   ```bash
   node analysis/scenario-analysis.mjs <scenario-name>
   ```

2. Capture the summary metrics from the output

3. Update the corresponding row in the summary table:
   - **Status**: ✅ Compliant / ⚠️ Needs Work / ❌ Non-Compliant
   - **Revisions w/ Embeddings**: "X/Y" format (X must equal Y for compliance)
   - **Boundaries w/ Embeddings**: "X/Y" format (X must equal Y for compliance)
   - **Time Paradoxes**: Number found (must be 0 for compliance)
   - **Particle Flow Issues**: Count of errors/warnings
   - **Total Issues**: Sum of errors + warnings + suggestions + info
   - **Last Analyzed**: Date (YYYY-MM-DD)

4. Update overall status based on:
   - ❌ **Non-Compliant** if any required metric fails
   - ⚠️ **Needs Work** if required metrics pass but has warnings/recommendations
   - ✅ **Compliant** if all required metrics pass and minimal warnings

## Analysis Workflow

### Quick Health Check (All Scenarios)
```bash
# Run analysis on all scenarios and capture results
for scenario in insurance-underwriting financial-lending medical-diagnosis autonomous-vehicles database-performance saas-dashboarding baseball-analytics airforce-avionics-maintenance vertical-hydroponics-farm test-minimal default; do
  echo "=== $scenario ==="
  node analysis/scenario-analysis.mjs $scenario | grep -A 20 "SUMMARY METRICS"
done
```

### Deep Dive on Problem Scenarios
When a scenario shows issues, run full analysis and review:
```bash
node analysis/scenario-analysis.mjs <scenario-name> > analysis-output.txt
```

Then review sections:
- Feedback Loop Analysis
- Complete Feedback Cycles
- Particle Flow Validation
- Potential Issues & Improvements

### Fix and Re-validate
1. Edit scenario JSON based on analysis findings
2. Re-run analysis to confirm fixes
3. Update this tracker with new results
4. Run conformance tests: `npm run conformance`

## Scenario-Specific Notes

### insurance-underwriting (2025-12-30)
**Status:** ⚠️ High fidelity with minor semantic polish needed

**Structural Compliance:** ✅ Perfect (0 errors)
- 7/7 revisions with embeddings
- 6/6 boundaries with embeddings  
- 0 time paradoxes
- 73 total events across 120 hours

**Fidelity Metrics:**
- **Semantic Coherence:** 12 warnings for query-context word overlap
  - Retrieval queries could better match embedding semantic contexts
  - Not critical - represents fine-tuning opportunities
- **Feedback Effectiveness:** 4/6 revisions semantically address boundaries (67%)
- **Temporal Realism:** 8/11 retrieval-to-action gaps realistic (73%)
- **Actor Behavior:** ✅ All stewards use retrieval before complex decisions

**Improvements Applied:**
- Added 3 steward retrievals (Senior Underwriter, Alicia Rodriguez, SIU Lead)
- Adjusted 3 retrieval timings for realistic gaps (0.2h before boundaries)
- Strengthened revision-boundary semantic alignment at hour 30.5
- Fixed time paradox at hour 5.5 (removed future embedding reference)

**Remaining Work:**
- 12 semantic overlap warnings - optional polish for better query-context matching
- Example: Update queries to include more keywords from embedding contexts

**Verdict:** Ready for use as reference implementation. Warnings are polish opportunities, not blockers.

## Related Documentation

- [scenario-analysis.mjs](./scenario-analysis.mjs) - Analysis tool source
- [README.md](./README.md) - Analysis tools overview
- [Canonical_Event_Patterns.md](../../docs/spec/Canonical_Event_Patterns.md) - Required patterns specification
- [Scenario_Replay_Wire_Format.md](../../docs/spec/Scenario_Replay_Wire_Format.md) - Closed loop requirements
- [PARTICLE_FLOW_RULES.md](../docs/PARTICLE_FLOW_RULES.md) - Particle visualization requirements

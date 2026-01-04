# Scenario Analysis Run (Remaining Scenarios)

Date: 2026-01-04

Scenarios included: all files in src/sim/scenarios/*.scenario.json excluding default and financial-lending.

## Summary

| Scenario | Errors | Warnings |
|---|---:|---:|
| insurance-underwriting | 3 | 25 |
| baseball-analytics | 3 | 22 |
| database-performance | 3 | 20 |
| autonomous-vehicles | 2 | 19 |
| airforce-avionics-maintenance | 1 | 32 |
| saas-dashboarding | 1 | 22 |
| vertical-hydroponics-farm | 0 | 34 |
| medical-diagnosis | 0 | 20 |
| test-minimal | 0 | 3 |

---

## airforce-avionics-maintenance

```text

═══════════════════════════════════════════════════════════
HDDL SCENARIO ANALYSIS: AIRFORCE-AVIONICS-MAINTENANCE
═══════════════════════════════════════════════════════════

📊 SCENARIO STRUCTURE
────────────────────────────────────────────────────────────
Title: Air Force Avionics Maintenance Backshop — Mission Readiness
Duration: 336 hours
Total Events: 66
Envelopes: 11 (unique: 5)
Steward Roles: 5
Total Agents: 18

📈 EVENT TYPE DISTRIBUTION
────────────────────────────────────────────────────────────
  embedding                  26 (39.4%)
  decision                   10 (15.2%)
  revision                    8 (12.1%)
  signal                      8 (12.1%)
  boundary_interaction        5 (7.6%)
  envelope_promoted           4 (6.1%)
  retrieval                   3 (4.5%)
  dsg_session                 2 (3.0%)

⏰ TEMPORAL ANALYSIS
────────────────────────────────────────────────────────────
First Event: Hour 0 (envelope_promoted)
Last Event: Hour 336 (signal)
Historical Baseline: 0 events (hour < 0)
Main Window: 66 events (0 to 336)

Event Density by 12-hour Window:
     0-12  ███ 7
    12-24  ████ 8
    24-36  ██ 4
    48-60  ███ 7
    60-72  █ 2
    72-84  ██ 5
    84-96  █ 2
    96-108 █ 2
   108-120 ████ 9
   120-132  1
   144-156 ██ 4
   168-180  1
   192-204 █ 2
   216-228 ███ 6
   240-252 █ 2
   288-300 █ 3
   336-348  1

🔄 FEEDBACK LOOP ANALYSIS
────────────────────────────────────────────────────────────
Boundary Interactions: 5
Revisions: 8
Embeddings: 26
Retrievals: 3

Embeddings by Type:
  decision                  10
  revision                  9
  boundary_interaction      5
  session_artifact          2

Boundary Interaction → Embedding Coverage:
  ✅ 5/5 boundaries have embeddings

Revision → Embedding Coverage:
  ✅ 8/8 revisions have embeddings

🎯 COMPLETE FEEDBACK CYCLES (Boundary → Decision → Revision)
────────────────────────────────────────────────────────────
Complete Cycles: 5/5

Cycle 1: Technician workload exceeded
  ⏰ Timeline:
     Hour 18.10: Retrieval by ShiftOptimizer
     Hour 18.30: Boundary (escalated) by ShiftOptimizer
     Hour 19.00: Boundary Embedding (EMB-AF-003)
     Hour 19.10: Decision (undefined) by Capt Thompson
     Hour 22.00: Revision (capability_expansion)
     Hour 22.50: Revision Embedding (EMB-AF-020)
  📊 Cycle Duration: 3.70 hours
  🎯 Resolved: Reduce friction in cross-shop support during high-tempo operations while maintaining quality.

Cycle 2: ESD event detected
  ⏰ Timeline:
     Hour 48.60: Boundary (undefined) by ESDMonitor
     Hour 49.00: Boundary Embedding (EMB-AF-006)
     Hour 49.20: Decision (undefined) by QAInspector
     Hour 52.00: Revision (safety_policy)
     Hour 52.50: Revision Embedding (EMB-AF-024)
  📊 Cycle Duration: 3.40 hours
  🎯 Resolved: Prevent recurrence of ESD events due to expired equipment. Aligns with AFI 21-123 best practices.

Cycle 3: Shelf-life parts expiring
  ⏰ Timeline:
     Hour 68.50: Boundary (escalated) by ShelfLifeMonitor
     Hour 69.00: Boundary Embedding (EMB-AF-009)
     Hour 72.00: Revision (constraint_update)
     Hour 72.50: Revision Embedding (EMB-AF-021)
  📊 Cycle Duration: 3.50 hours
  🎯 Resolved: 30-day window insufficient for coordinating training aircraft maintenance schedules.

Cycle 4: Certification expirations flagged
  ⏰ Timeline:
     Hour 108.50: Retrieval by CertificationScheduler
     Hour 108.70: Boundary (escalated) by CertificationScheduler
     Hour 109.00: Boundary Embedding (EMB-AF-012)
     Hour 110.50: Decision (undefined) by SSgt Kim
     Hour 114.00: Revision (process_refinement)
     Hour 114.50: Revision Embedding (EMB-AF-022)
  📊 Cycle Duration: 5.30 hours
  🎯 Resolved: Eliminate 2-week TDY requirement for refresher training during high-ops tempo periods.

Cycle 5: TCTO deadline approaching
  ⏰ Timeline:
     Hour 216.60: Retrieval by TOComplianceChecker
     Hour 216.80: Boundary (escalated) by TOComplianceChecker
     Hour 217.00: Boundary Embedding (EMB-AF-017)
     Hour 220.00: Revision (resource_allocation)
     Hour 220.50: Revision Embedding (EMB-AF-023)
  📊 Cycle Duration: 3.20 hours
  🎯 Resolved: Current distributed approach insufficient for deadline compliance. Dedicated crew ensures focus and efficiency.

👥 ACTOR ANALYSIS
────────────────────────────────────────────────────────────
Most Active Actors:
  SSgt Kim                        7 events: envelope_promoted(1), decision(1), embedding(3), revision(2)
  MSgt Patel                      7 events: revision(2), embedding(4), dsg_session(1)
  MSgt Garcia                     5 events: envelope_promoted(1), dsg_session(1), embedding(2), revision(1)
  Capt Thompson                   5 events: envelope_promoted(1), decision(1), embedding(2), revision(1)
  Lt Williams                     4 events: revision(2), embedding(2)
  ShiftOptimizer                  3 events: retrieval(1), boundary_interaction(1), embedding(1)
  PriorityAdjuster                3 events: decision(1), embedding(1), signal(1)
  CertificationScheduler          3 events: retrieval(1), boundary_interaction(1), embedding(1)
  TOComplianceChecker             3 events: retrieval(1), boundary_interaction(1), embedding(1)
  AvionicsDiagnostic              2 events: decision(1), embedding(1)

📦 ENVELOPE TIMELINE & VERSIONING VALIDATION
────────────────────────────────────────────────────────────
ENV-AF-001: Aircraft Avionics Readiness
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v2: Hour 0-168 (168.00h duration)
  v3: Hour 192-336 (144.00h duration)
    ℹ️  GAP: 24 hours between v2 and v3
  Revisions: 1
    - Hour 148: v? (FLIR diagnostic parameters updated)

ENV-AF-002: Parts Supply Chain & Logistics
  ℹ️  MULTI-WINDOW ENVELOPE: 3 activation windows
  v1: Hour 0-120 (120.00h duration)
  v2: Hour 168-264 (96.00h duration)
  v3: Hour 288-336 (48.00h duration)
    ℹ️  GAP: 48 hours between v1 and v2
    ℹ️  GAP: 24 hours between v2 and v3
  Revisions: 2
    - Hour 72: v? (Shelf-life alert thresholds updated)
    - Hour 72: v? (Shelf-life alert thresholds updated)

ENV-AF-003: Safety & Technical Compliance
  v3: Hour 0-336 (336.00h duration)
  Revisions: 2
    - Hour 52: v? (ESD equipment policy updated)
    - Hour 220: v? (TCTO surge completion plan activated)

ENV-AF-004: Maintenance Scheduling & Workflow
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v2: Hour 12-168 (156.00h duration)
  v3: Hour 192-324 (132.00h duration)
    ℹ️  GAP: 24 hours between v2 and v3
  Revisions: 1
    - Hour 22: v? (Cross-shop support protocol formalized)

ENV-AF-005: Technical Training & Readiness
  ℹ️  MULTI-WINDOW ENVELOPE: 3 activation windows
  v1: Hour 24-96 (72.00h duration)
  v2: Hour 168-240 (72.00h duration)
  v3: Hour 288-312 (24.00h duration)
    ℹ️  GAP: 72 hours between v1 and v2
    ℹ️  GAP: 48 hours between v2 and v3
  Revisions: 2
    - Hour 114: v? (Certification renewal streamlined)
      ℹ️  Revision occurs outside any active window
    - Hour 114: v? (Certification renewal streamlined)
      ℹ️  Revision occurs outside any active window

🌊 PARTICLE FLOW PATTERNS
────────────────────────────────────────────────────────────
Expected Particle Behaviors:

SIGNAL (8 events)
  Source: External → Envelope
  Behavior: Curves down, fades immediately

DECISION (ALLOWED) (10 events)
  Source: Agent → Envelope
  Behavior: Curves to envelope, orbits (18 ticks)

DECISION (DENIED) (0 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, PULSES (3x), continues to steward

BOUNDARY_INTERACTION (5 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, pulses (0.5s), continues to steward, ORBITS steward
    - Hour 18.3: ShiftOptimizer → escalated (orbit: 92 ticks)
    - Hour 48.6: ESDMonitor → undefined (orbit: 85 ticks)
    - Hour 68.5: ShelfLifeMonitor → escalated (orbit: 88 ticks)
    - Hour 108.7: CertificationScheduler → escalated (orbit: 132 ticks)
    - Hour 216.8: TOComplianceChecker → escalated (orbit: 80 ticks)

REVISION (8 events)
  Source: Steward → Envelope
  Behavior: Curves from steward (lower arc), fades at envelope

RETRIEVAL (3 events)
  Source: Embedding Store → Agent
  Behavior: Dotted curve from embedding store, fades at agent
    - Hour 18.1: ShiftOptimizer retrieves 1 embeddings (top: 90%)
    - Hour 108.5: CertificationScheduler retrieves 1 embeddings (top: 89%)
    - Hour 216.6: TOComplianceChecker retrieves 2 embeddings (top: 91%)


🔍 PARTICLE FLOW VALIDATION (Visual Correctness)
────────────────────────────────────────────────────────────
Found 1 particle flow issues

ERROR (1):
  ❌ Boundary at hour 48.6 missing required boundary_kind field (escalated/deferred/overridden)


🧠 SEMANTIC COHERENCE & LEARNING
────────────────────────────────────────────────────────────
Embeddings with semantic vectors: 26/26
Semantic diversity: 54% (vectors spread across quadrants)

Retrieval-Query Alignment:
  Retrievals with queries: 3/3

Relevance Score Analysis:
  Average relevance: 89%
  Perfect scores (≥95%): 0%

⚠️  Found 4 semantic issues


🔄 FEEDBACK LOOP EFFECTIVENESS
────────────────────────────────────────────────────────────
Revision-Boundary Alignment: 5/7 revisions semantically address their boundaries
Learning Evidence: 1/9 revision embeddings retrieved in future decisions
Recurring Boundary Patterns: 1 boundary types occur multiple times

⚠️  Found 2 effectiveness issues


⏱️  TEMPORAL REALISM
────────────────────────────────────────────────────────────
Embedding Delays: 25/26 have realistic timing (0.2-2h after source)
Retrieval-to-Action Timing: 3/3 have realistic gap (0.05-0.7h)

Decision Latency Patterns:
  Escalated decisions: 3
  Routine decisions: 7
  Note: Escalated decisions should show deliberation time

⚠️  Found 1 temporal realism issues


👤 ACTOR BEHAVIOR PATTERNS
────────────────────────────────────────────────────────────
Agent Specialization: 0 events where agents operated outside their designated envelopes

Decision Patterns:

Retrieval Usage:
  2 agents make complex decisions without using retrieval

⚠️  Found 2 behavior pattern issues


⚠️  POTENTIAL ISSUES & IMPROVEMENTS
────────────────────────────────────────────────────────────

ERROR (1):
  ❌ ENV-AF-005 has 11 events during inactive gap (hour 96-168)

WARNING (32):
  ⚠️ Retrieval at hour 18.1: High relevance (90%) but low query-context overlap for EMB-AF-001
  ⚠️ Retrieval at hour 108.5: High relevance (89%) but low query-context overlap for EMB-AF-008
  ⚠️ Retrieval at hour 216.6: High relevance (91%) but low query-context overlap for EMB-AF-010
  ⚠️ Retrieval at hour 216.6: High relevance (86%) but low query-context overlap for EMB-AF-012
  ⚠️ Revision at hour 22 doesn't clearly address boundary at 18.3 (low semantic overlap)
  ... and 27 more

SUGGESTION (4):
  ℹ️ Capt Thompson makes complex decisions but never retrieves context - consider adding retrieval for realism
  ℹ️ QAInspector makes complex decisions but never retrieves context - consider adding retrieval for realism
  ℹ️ Boundary at hour 48.6 by ESDMonitor lacks preceding retrieval (shows agent "thinking")
  ℹ️ Boundary at hour 68.5 by ShelfLifeMonitor lacks preceding retrieval (shows agent "thinking")

INFO (11):
  ℹ️ ENV-AF-001 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-AF-001 inactive for 24h between windows (hour 168-192)
  ℹ️ ENV-AF-002 has 3 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-AF-002 inactive for 48h between windows (hour 120-168)
  ℹ️ ENV-AF-002 inactive for 24h between windows (hour 264-288)
  ... and 6 more


📋 SUMMARY METRICS
────────────────────────────────────────────────────────────

Closed Loop Compliance:
  ✅ Revisions with embeddings      8/8 [REQUIRED]
  ✅ Boundaries with embeddings     5/5 [REQUIRED]
  ✅ Time paradoxes                 0 [REQUIRED]
  ⚠️ Boundaries with retrieval      3/5 [RECOMMENDED]

Particle Flow Validation:
  ❌ Missing boundary_kind          1
  ✅ Missing agent lookups          0
  ✅ Missing envelope targets       0
  ✅ Unresolved boundaries          0

Semantic Coherence:
  ✅ Semantic vector validity       0
  ✅ Semantic diversity             Validated
  ✅ Historical baseline usage      None

Feedback Effectiveness:
  ⚠️ Revision-boundary alignment    5/7
  ✅ Learning evidence              1/9 reused

Temporal Realism:
  ⚠️ Embedding timing               25/26 realistic
  ✅ Retrieval-to-action gaps       3/3 realistic

Actor Behavior:
  ✅ Agent scope violations         0
  ✅ Decision variety               Validated

Scenario Health:
   Total events                   66
   Event types                    8
   Complete feedback cycles       5/5
   Historical baseline events     0

Identified Issues:
  ❌ Errors                         1
  ⚠️ Warnings                       32
   Suggestions                    4
   Info                           11


═══════════════════════════════════════════════════════════
ANALYSIS COMPLETE
═══════════════════════════════════════════════════════════
```

---

## autonomous-vehicles

```text

═══════════════════════════════════════════════════════════
HDDL SCENARIO ANALYSIS: AUTONOMOUS-VEHICLES
═══════════════════════════════════════════════════════════

📊 SCENARIO STRUCTURE
────────────────────────────────────────────────────────────
Title: Autonomous Vehicle Operations — Fleet Safety & Ethics
Duration: 96 hours
Total Events: 36
Envelopes: 7 (unique: 4)
Steward Roles: 4
Total Agents: 12

📈 EVENT TYPE DISTRIBUTION
────────────────────────────────────────────────────────────
  embedding                  12 (33.3%)
  signal                      8 (22.2%)
  envelope_promoted           4 (11.1%)
  decision                    3 (8.3%)
  retrieval                   3 (8.3%)
  revision                    3 (8.3%)
  boundary_interaction        2 (5.6%)
  dsg_session                 1 (2.8%)

⏰ TEMPORAL ANALYSIS
────────────────────────────────────────────────────────────
First Event: Hour 0 (envelope_promoted)
Last Event: Hour 72 (signal)
Historical Baseline: 0 events (hour < 0)
Main Window: 36 events (0 to 96)

Event Density by 12-hour Window:
     0-12  ████ 9
    12-24  █████ 10
    24-36  ███ 6
    36-48  ███ 7
    48-60  █ 3
    72-84   1

🔄 FEEDBACK LOOP ANALYSIS
────────────────────────────────────────────────────────────
Boundary Interactions: 2
Revisions: 3
Embeddings: 12
Retrievals: 3

Embeddings by Type:
  decision                  3
  revision                  3
  signal                    2
  boundary_interaction      2
  historical                1
  session_artifact          1

Boundary Interaction → Embedding Coverage:
  ✅ 2/2 boundaries have embeddings

Revision → Embedding Coverage:
  ✅ 3/3 revisions have embeddings

🎯 COMPLETE FEEDBACK CYCLES (Boundary → Decision → Revision)
────────────────────────────────────────────────────────────
Complete Cycles: 2/2

Cycle 1: Edge case detected
  ⏰ Timeline:
     Hour 15.60: Retrieval by EdgeCaseDetector
     Hour 15.80: Boundary (escalated) by EdgeCaseDetector
     Hour 17.00: Boundary Embedding (EMB-AV-002)
     Hour 15.90: Decision (undefined) by Remote Operator #47
     Hour 20.00: Revision (boundary_adjustment)
     Hour 20.50: Revision Embedding (EMB-AV-REV-001)
  📊 Cycle Duration: 4.20 hours
  🎯 Resolved: Reduce remote operator escalations for common construction zone patterns.

Cycle 2: Safety-critical fault: vehicle grounded
  ⏰ Timeline:
     Hour 41.90: Retrieval by DiagnosticsMonitor
     Hour 42.10: Boundary (escalated) by DiagnosticsMonitor
     Hour 44.00: Boundary Embedding (EMB-AV-005)
     Hour 46.00: Revision (constraint_tightening)
     Hour 46.50: Revision Embedding (EMB-AV-REV-002)
  📊 Cycle Duration: 3.90 hours
  🎯 Resolved: Proactive safety: detect brake degradation earlier to avoid mid-trip grounding.

👥 ACTOR ANALYSIS
────────────────────────────────────────────────────────────
Most Active Actors:
  Marcus Rodriguez                5 events: envelope_promoted(1), revision(1), embedding(2), dsg_session(1)
  DiagnosticsMonitor              5 events: signal(1), embedding(2), retrieval(1), boundary_interaction(1)
  Julia Kim                       3 events: envelope_promoted(1), revision(1), embedding(1)
  CollisionPredictor              3 events: decision(1), embedding(1), signal(1)
  EdgeCaseDetector                3 events: retrieval(1), boundary_interaction(1), embedding(1)
  Chen Liu                        3 events: envelope_promoted(1), revision(1), embedding(1)
  RouteOptimizer                  2 events: signal(1), embedding(1)
  Remote Operator #47             2 events: decision(1), embedding(1)
  AccessibilityAdapter            2 events: decision(1), embedding(1)
  System                          1 events: embedding(1)

📦 ENVELOPE TIMELINE & VERSIONING VALIDATION
────────────────────────────────────────────────────────────
ENV-AV-001: Collision Avoidance Decisions
  v3: Hour 0-96 (96.00h duration)
  Revisions: 1
    - Hour 20: v? (Construction zone handling updated)

ENV-AV-002: Route Optimization
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v2: Hour 0-36 (36.00h duration)
  v3: Hour 60-96 (36.00h duration)
    ℹ️  GAP: 24 hours between v2 and v3
  Revisions: 1
    - Hour 34: v? (Community zone boundaries updated)

ENV-AV-003: Passenger Comfort & Accessibility
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v1: Hour 12-48 (36.00h duration)
  v2: Hour 60-84 (24.00h duration)
    ℹ️  GAP: 12 hours between v1 and v2
  ⚠️  Multiple windows but NO revision events

ENV-AV-004: Fleet Maintenance Scheduling
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v1: Hour 24-48 (24.00h duration)
  v2: Hour 72-96 (24.00h duration)
    ℹ️  GAP: 24 hours between v1 and v2
  Revisions: 1
    - Hour 46: v? (Brake fault thresholds refined)

🌊 PARTICLE FLOW PATTERNS
────────────────────────────────────────────────────────────
Expected Particle Behaviors:

SIGNAL (8 events)
  Source: External → Envelope
  Behavior: Curves down, fades immediately

DECISION (ALLOWED) (3 events)
  Source: Agent → Envelope
  Behavior: Curves to envelope, orbits (18 ticks)

DECISION (DENIED) (0 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, PULSES (3x), continues to steward

BOUNDARY_INTERACTION (2 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, pulses (0.5s), continues to steward, ORBITS steward
    - Hour 15.8: EdgeCaseDetector → escalated (orbit: 105 ticks)
    - Hour 42.1: DiagnosticsMonitor → escalated (orbit: 97 ticks)

REVISION (3 events)
  Source: Steward → Envelope
  Behavior: Curves from steward (lower arc), fades at envelope

RETRIEVAL (3 events)
  Source: Embedding Store → Agent
  Behavior: Dotted curve from embedding store, fades at agent
    - Hour 15.6: EdgeCaseDetector retrieves 0 embeddings (top: 0%)
    - Hour 21: DecisionMemory retrieves 1 embeddings (top: 90%)
    - Hour 41.9: DiagnosticsMonitor retrieves 0 embeddings (top: 0%)


🔍 PARTICLE FLOW VALIDATION (Visual Correctness)
────────────────────────────────────────────────────────────
Found 2 particle flow issues

INFO (2):
  ℹ️ Retrieval at hour 15.6 has no retrievedEmbeddings array - won't show what was retrieved
  ℹ️ Retrieval at hour 41.9 has no retrievedEmbeddings array - won't show what was retrieved


🧠 SEMANTIC COHERENCE & LEARNING
────────────────────────────────────────────────────────────
Embeddings with semantic vectors: 12/12
Semantic diversity: 42% (vectors spread across quadrants)

Retrieval-Query Alignment:
  Retrievals with queries: 1/3

Relevance Score Analysis:
  Average relevance: 90%
  Perfect scores (≥95%): 0%

✅ Semantic coherence validated


🔄 FEEDBACK LOOP EFFECTIVENESS
────────────────────────────────────────────────────────────
Revision-Boundary Alignment: 2/2 revisions semantically address their boundaries
Learning Evidence: 1/3 revision embeddings retrieved in future decisions
Recurring Boundary Patterns: 0 boundary types occur multiple times

✅ Feedback loops appear effective


⏱️  TEMPORAL REALISM
────────────────────────────────────────────────────────────
Embedding Delays: 10/10 have realistic timing (0.2-2h after source)
Retrieval-to-Action Timing: 2/2 have realistic gap (0.05-0.7h)

Decision Latency Patterns:
  Escalated decisions: 1
  Routine decisions: 2
  Note: Escalated decisions should show deliberation time

✅ Temporal patterns appear realistic


👤 ACTOR BEHAVIOR PATTERNS
────────────────────────────────────────────────────────────
Agent Specialization: 0 events where agents operated outside their designated envelopes

Decision Patterns:

Retrieval Usage:
  1 agents make complex decisions without using retrieval

⚠️  Found 1 behavior pattern issues


⚠️  POTENTIAL ISSUES & IMPROVEMENTS
────────────────────────────────────────────────────────────

ERROR (2):
  ❌ ENV-AV-002 has 1 events during inactive gap (hour 36-60)
  ❌ ENV-AV-003 has 1 events during inactive gap (hour 48-60)

WARNING (19):
  ⚠️ ENV-AV-001 revision at hour 20 is missing envelope_version (harder to verify version progression)
  ⚠️ ENV-AV-002 transitions v2→v3 (hour 36-60) without a revision event in that interval (envelope has revision_id="ENV-AV-002-v3")
  ⚠️ ENV-AV-002 revision at hour 34 is missing envelope_version (harder to verify version progression)
  ⚠️ ENV-AV-003 transitions v1→v2 (hour 48-60) without a revision event in that interval (envelope has revision_id="ENV-AV-003-v2")
  ⚠️ ENV-AV-003 has multiple activation windows but no revision events in this scenario
  ... and 14 more

SUGGESTION (1):
  ℹ️ Remote Operator #47 makes complex decisions but never retrieves context - consider adding retrieval for realism

INFO (6):
  ℹ️ ENV-AV-002 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-AV-003 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-AV-004 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-AV-004 inactive for 24h between windows (hour 48-72)
  ℹ️ Retrieval at hour 21 by DecisionMemory not followed by decision or boundary within 1 hour
  ... and 1 more


📋 SUMMARY METRICS
────────────────────────────────────────────────────────────

Closed Loop Compliance:
  ✅ Revisions with embeddings      3/3 [REQUIRED]
  ✅ Boundaries with embeddings     2/2 [REQUIRED]
  ✅ Time paradoxes                 0 [REQUIRED]
  ⚠️ Boundaries with retrieval      2/2 [RECOMMENDED]

Particle Flow Validation:
  ✅ Missing boundary_kind          0
  ✅ Missing agent lookups          0
  ✅ Missing envelope targets       0
  ✅ Unresolved boundaries          0

Semantic Coherence:
  ✅ Semantic vector validity       0
  ✅ Semantic diversity             Validated
  ✅ Historical baseline usage      None

Feedback Effectiveness:
  ✅ Revision-boundary alignment    2/2
  ✅ Learning evidence              1/3 reused

Temporal Realism:
  ✅ Embedding timing               10/10 realistic
  ✅ Retrieval-to-action gaps       2/2 realistic

Actor Behavior:
  ✅ Agent scope violations         0
  ✅ Decision variety               Validated

Scenario Health:
   Total events                   36
   Event types                    8
   Complete feedback cycles       2/2
   Historical baseline events     0

Identified Issues:
  ❌ Errors                         2
  ⚠️ Warnings                       19
   Suggestions                    1
   Info                           6


═══════════════════════════════════════════════════════════
ANALYSIS COMPLETE
═══════════════════════════════════════════════════════════
```

---

## baseball-analytics

```text

═══════════════════════════════════════════════════════════
HDDL SCENARIO ANALYSIS: BASEBALL-ANALYTICS
═══════════════════════════════════════════════════════════

📊 SCENARIO STRUCTURE
────────────────────────────────────────────────────────────
Title: Baseball Analytics — Performance & Strategy Optimization
Duration: 168 hours
Total Events: 54
Envelopes: 7 (unique: 4)
Steward Roles: 4
Total Agents: 12

📈 EVENT TYPE DISTRIBUTION
────────────────────────────────────────────────────────────
  embedding                  19 (35.2%)
  decision                    8 (14.8%)
  signal                      8 (14.8%)
  revision                    6 (11.1%)
  retrieval                   5 (9.3%)
  boundary_interaction        4 (7.4%)
  envelope_promoted           3 (5.6%)
  dsg_session                 1 (1.9%)

⏰ TEMPORAL ANALYSIS
────────────────────────────────────────────────────────────
First Event: Hour 0 (envelope_promoted)
Last Event: Hour 168 (signal)
Historical Baseline: 0 events (hour < 0)
Main Window: 54 events (0 to 168)

Event Density by 12-hour Window:
     0-12  ███ 6
    12-24  █████ 10
    24-36  █ 2
    36-48  ███ 6
    48-60  ████ 9
    60-72   1
    72-84  ██ 4
    84-96   1
    96-108  1
   108-120 █ 2
   120-132 ██ 5
   132-144 █ 3
   144-156 █ 2
   156-168  1
   168-180  1

🔄 FEEDBACK LOOP ANALYSIS
────────────────────────────────────────────────────────────
Boundary Interactions: 4
Revisions: 6
Embeddings: 19
Retrievals: 5

Embeddings by Type:
  decision                  8
  revision                  6
  boundary_interaction      4
  session_artifact          1

Boundary Interaction → Embedding Coverage:
  ✅ 4/4 boundaries have embeddings

Revision → Embedding Coverage:
  ✅ 6/6 revisions have embeddings

🎯 COMPLETE FEEDBACK CYCLES (Boundary → Decision → Revision)
────────────────────────────────────────────────────────────
Complete Cycles: 4/4

Cycle 1: Pitcher workload threshold exceeded
  ⏰ Timeline:
     Hour 18.50: Retrieval by BiomechanicsMonitor
     Hour 18.70: Boundary (escalated) by BiomechanicsMonitor
     Hour 19.00: Boundary Embedding (EMB-BB-003)
     Hour 19.10: Decision (undefined) by Dr. Emily Rodriguez
     Hour 22.00: Revision (constraint_update)
     Hour 22.50: Revision Embedding (EMB-BB-016)
  📊 Cycle Duration: 3.30 hours
  🎯 Resolved: Proactive injury prevention by catching mechanical degradation earlier in workload cycle.

Cycle 2: Bullpen overuse detected
  ⏰ Timeline:
     Hour 36.30: Retrieval by BullpenManager
     Hour 36.50: Boundary (escalated) by BullpenManager
     Hour 37.00: Boundary Embedding (EMB-BB-006)
     Hour 40.00: Revision (constraint_update)
     Hour 40.50: Revision Embedding (EMB-BB-017)
  📊 Cycle Duration: 3.50 hours
  🎯 Resolved: Appearance frequency alone insufficient — cumulative pitch count better predictor of fatigue.

Cycle 3: Salary cap threshold flagged
  ⏰ Timeline:
     Hour 52.00: Retrieval by ContractOptimizer
     Hour 52.20: Boundary (escalated) by ContractOptimizer
     Hour 52.50: Boundary Embedding (EMB-BB-008)
     Hour 54.10: Decision (undefined) by GM David Park
     Hour 56.00: Revision (process_refinement)
     Hour 56.50: Revision Embedding (EMB-BB-018)
  📊 Cycle Duration: 3.80 hours
  🎯 Resolved: Prevent late-stage trade failures by establishing offset negotiation framework upfront.

Cycle 4: Performance decline flagged
  ⏰ Timeline:
     Hour 120.10: Retrieval by DefenseEvaluator
     Hour 120.30: Boundary (escalated) by DefenseEvaluator
     Hour 121.00: Boundary Embedding (EMB-BB-013)
     Hour 124.00: Revision (capability_expansion)
     Hour 124.50: Revision Embedding (EMB-BB-019)
  📊 Cycle Duration: 3.70 hours
  🎯 Resolved: Quantify defensive decline thresholds to optimize win probability in high-leverage situations.

👥 ACTOR ANALYSIS
────────────────────────────────────────────────────────────
Most Active Actors:
  Sarah Chen                      7 events: envelope_promoted(1), dsg_session(1), embedding(3), revision(2)
  Marcus Johnson                  7 events: envelope_promoted(1), revision(2), embedding(3), decision(1)
  Dr. Emily Rodriguez             5 events: envelope_promoted(1), decision(1), embedding(2), revision(1)
  BiomechanicsMonitor             4 events: retrieval(1), boundary_interaction(1), embedding(1), signal(1)
  GM David Park                   4 events: decision(1), embedding(2), revision(1)
  BattingAnalyzer                 3 events: decision(1), embedding(1), signal(1)
  BullpenManager                  3 events: retrieval(1), boundary_interaction(1), embedding(1)
  ContractOptimizer               3 events: retrieval(1), boundary_interaction(1), embedding(1)
  DefenseEvaluator                3 events: retrieval(1), boundary_interaction(1), embedding(1)
  LineupOptimizer                 2 events: decision(1), embedding(1)

📦 ENVELOPE TIMELINE & VERSIONING VALIDATION
────────────────────────────────────────────────────────────
ENV-BB-001: Player Performance Analysis
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v1: Hour 0-84 (84.00h duration)
  v2: Hour 144-168 (24.00h duration)
    ℹ️  GAP: 60 hours between v1 and v2
  Revisions: 2
    - Hour 76: v? (Performance model updated)
    - Hour 124: v? (Late-inning defense protocol added)
      ℹ️  Revision occurs outside any active window

ENV-BB-002: In-Game Strategy & Lineup Optimization
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v2: Hour 0-120 (120.00h duration)
  v3: Hour 144-168 (24.00h duration)
    ℹ️  GAP: 24 hours between v2 and v3
  Revisions: 2
    - Hour 40: v? (Closer usage policy refined)
    - Hour 144: v? (Bullpen usage policy updated)

ENV-BB-003: Injury Risk & Load Management
  v1: Hour 12-156 (144.00h duration)
  Revisions: 1
    - Hour 22: v? (Pitcher workload thresholds updated)

ENV-BB-004: Roster Construction & Trade Analysis
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v3: Hour 0-60 (60.00h duration)
  v4: Hour 140-168 (28.00h duration)
    ℹ️  GAP: 80 hours between v3 and v4
  Revisions: 1
    - Hour 56: v? (Salary offset approval process added)

🌊 PARTICLE FLOW PATTERNS
────────────────────────────────────────────────────────────
Expected Particle Behaviors:

SIGNAL (8 events)
  Source: External → Envelope
  Behavior: Curves down, fades immediately

DECISION (ALLOWED) (8 events)
  Source: Agent → Envelope
  Behavior: Curves to envelope, orbits (18 ticks)

DECISION (DENIED) (0 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, PULSES (3x), continues to steward

BOUNDARY_INTERACTION (4 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, pulses (0.5s), continues to steward, ORBITS steward
    - Hour 18.7: BiomechanicsMonitor → escalated (orbit: 83 ticks)
    - Hour 36.5: BullpenManager → escalated (orbit: 88 ticks)
    - Hour 52.2: ContractOptimizer → escalated (orbit: 95 ticks)
    - Hour 120.3: DefenseEvaluator → escalated (orbit: 93 ticks)

REVISION (6 events)
  Source: Steward → Envelope
  Behavior: Curves from steward (lower arc), fades at envelope

RETRIEVAL (5 events)
  Source: Embedding Store → Agent
  Behavior: Dotted curve from embedding store, fades at agent
    - Hour 18.5: BiomechanicsMonitor retrieves 1 embeddings (top: 94%)
    - Hour 23: DecisionMemory retrieves 1 embeddings (top: 89%)
    - Hour 36.3: BullpenManager retrieves 2 embeddings (top: 89%)
    - Hour 52: ContractOptimizer retrieves 1 embeddings (top: 91%)
    - Hour 120.1: DefenseEvaluator retrieves 2 embeddings (top: 87%)


🔍 PARTICLE FLOW VALIDATION (Visual Correctness)
────────────────────────────────────────────────────────────
✅ All particle flows have required fields for visualization


🧠 SEMANTIC COHERENCE & LEARNING
────────────────────────────────────────────────────────────
Embeddings with semantic vectors: 19/19
Semantic diversity: 63% (vectors spread across quadrants)

Retrieval-Query Alignment:
  Retrievals with queries: 5/5

Relevance Score Analysis:
  Average relevance: 88%
  Perfect scores (≥95%): 0%

⚠️  Found 3 semantic issues


🔄 FEEDBACK LOOP EFFECTIVENESS
────────────────────────────────────────────────────────────
Revision-Boundary Alignment: 2/4 revisions semantically address their boundaries
Learning Evidence: 2/6 revision embeddings retrieved in future decisions
Recurring Boundary Patterns: 0 boundary types occur multiple times

⚠️  Found 2 effectiveness issues


⏱️  TEMPORAL REALISM
────────────────────────────────────────────────────────────
Embedding Delays: 19/19 have realistic timing (0.2-2h after source)
Retrieval-to-Action Timing: 4/4 have realistic gap (0.05-0.7h)

Decision Latency Patterns:
  Escalated decisions: 2
  Routine decisions: 6
  Note: Escalated decisions should show deliberation time

✅ Temporal patterns appear realistic


👤 ACTOR BEHAVIOR PATTERNS
────────────────────────────────────────────────────────────
Agent Specialization: 0 events where agents operated outside their designated envelopes

Decision Patterns:

Retrieval Usage:
  1 agents make complex decisions without using retrieval

⚠️  Found 1 behavior pattern issues


⚠️  POTENTIAL ISSUES & IMPROVEMENTS
────────────────────────────────────────────────────────────

ERROR (3):
  ❌ ENV-BB-001 has 7 events during inactive gap (hour 84-144)
  ❌ ENV-BB-002 has 2 events during inactive gap (hour 120-144)
  ❌ ENV-BB-004 has 1 events during inactive gap (hour 60-140)

WARNING (22):
  ⚠️ Retrieval at hour 18.5: High relevance (94%) but low query-context overlap for EMB-BB-002
  ⚠️ Retrieval at hour 120.1: High relevance (87%) but low query-context overlap for EMB-BB-002
  ⚠️ Retrieval at hour 120.1: High relevance (81%) but low query-context overlap for EMB-BB-011
  ⚠️ Revision at hour 40 doesn't clearly address boundary at 36.5 (low semantic overlap)
  ⚠️ Revision at hour 56 doesn't clearly address boundary at 52.2 (low semantic overlap)
  ... and 17 more

SUGGESTION (1):
  ℹ️ Dr. Emily Rodriguez makes complex decisions but never retrieves context - consider adding retrieval for realism

INFO (5):
  ℹ️ ENV-BB-001 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-BB-001 revision at hour 124 occurs between windows (hour 84-144)
  ℹ️ ENV-BB-002 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-BB-004 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ Retrieval at hour 23 by DecisionMemory not followed by decision or boundary within 1 hour


📋 SUMMARY METRICS
────────────────────────────────────────────────────────────

Closed Loop Compliance:
  ✅ Revisions with embeddings      6/6 [REQUIRED]
  ✅ Boundaries with embeddings     4/4 [REQUIRED]
  ✅ Time paradoxes                 0 [REQUIRED]
  ⚠️ Boundaries with retrieval      4/4 [RECOMMENDED]

Particle Flow Validation:
  ✅ Missing boundary_kind          0
  ✅ Missing agent lookups          0
  ✅ Missing envelope targets       0
  ✅ Unresolved boundaries          0

Semantic Coherence:
  ✅ Semantic vector validity       0
  ✅ Semantic diversity             Validated
  ✅ Historical baseline usage      None

Feedback Effectiveness:
  ⚠️ Revision-boundary alignment    2/4
  ✅ Learning evidence              2/6 reused

Temporal Realism:
  ✅ Embedding timing               19/19 realistic
  ✅ Retrieval-to-action gaps       4/4 realistic

Actor Behavior:
  ✅ Agent scope violations         0
  ✅ Decision variety               Validated

Scenario Health:
   Total events                   54
   Event types                    8
   Complete feedback cycles       4/4
   Historical baseline events     0

Identified Issues:
  ❌ Errors                         3
  ⚠️ Warnings                       22
   Suggestions                    1
   Info                           5


═══════════════════════════════════════════════════════════
ANALYSIS COMPLETE
═══════════════════════════════════════════════════════════
```

---

## database-performance

```text

═══════════════════════════════════════════════════════════
HDDL SCENARIO ANALYSIS: DATABASE-PERFORMANCE
═══════════════════════════════════════════════════════════

📊 SCENARIO STRUCTURE
────────────────────────────────────────────────────────────
Title: Database Performance Monitoring — Observability & SLAs
Duration: 72 hours
Total Events: 40
Envelopes: 7 (unique: 4)
Steward Roles: 4
Total Agents: 12

📈 EVENT TYPE DISTRIBUTION
────────────────────────────────────────────────────────────
  embedding                  13 (32.5%)
  signal                      8 (20.0%)
  decision                    5 (12.5%)
  envelope_promoted           4 (10.0%)
  revision                    4 (10.0%)
  retrieval                   3 (7.5%)
  boundary_interaction        2 (5.0%)
  dsg_session                 1 (2.5%)

⏰ TEMPORAL ANALYSIS
────────────────────────────────────────────────────────────
First Event: Hour 0 (envelope_promoted)
Last Event: Hour 72 (signal)
Historical Baseline: 0 events (hour < 0)
Main Window: 40 events (0 to 72)

Event Density by 12-hour Window:
     0-12  ███████ 14
    12-24  ██ 5
    24-36  ██ 5
    36-48  ███ 7
    48-60  ██ 5
    60-72  █ 3
    72-84   1

🔄 FEEDBACK LOOP ANALYSIS
────────────────────────────────────────────────────────────
Boundary Interactions: 2
Revisions: 4
Embeddings: 13
Retrievals: 3

Embeddings by Type:
  revision                  4
  decision                  2
  signal                    2
  boundary_interaction      2
  session_artifact          2
  historical                1

Boundary Interaction → Embedding Coverage:
  ✅ 2/2 boundaries have embeddings

Revision → Embedding Coverage:
  ✅ 4/4 revisions have embeddings

🎯 COMPLETE FEEDBACK CYCLES (Boundary → Decision → Revision)
────────────────────────────────────────────────────────────
Complete Cycles: 2/2

Cycle 1: PII table flagged for review
  ⏰ Timeline:
     Hour 6.60: Retrieval by QueryOptimizer
     Hour 6.80: Boundary (escalated) by QueryOptimizer
     Hour 8.00: Boundary Embedding (EMB-006)
     Hour 10.00: Revision (constraint_addition)
     Hour 10.50: Revision Embedding (EMB-DB-REV-001)
  📊 Cycle Duration: 3.20 hours
  🎯 Resolved: Ensure security compliance for all PII-related query optimizations.

Cycle 2: Capacity buffer constraint approached
  ⏰ Timeline:
     Hour 36.50: Retrieval by CostOptimizer
     Hour 36.70: Boundary (escalated) by CostOptimizer
     Hour 37.20: Boundary Embedding (EMB-DB-013)
     Hour 40.00: Revision (constraint_relaxation)
     Hour 40.50: Revision Embedding (EMB-DB-REV-002)
  📊 Cycle Duration: 3.30 hours
  🎯 Resolved: Balance cost optimization with safety margins in test environments.

👥 ACTOR ANALYSIS
────────────────────────────────────────────────────────────
Most Active Actors:
  Maya Chen                       6 events: envelope_promoted(1), revision(1), embedding(3), dsg_session(1)
  QueryOptimizer                  6 events: decision(1), embedding(2), retrieval(1), boundary_interaction(1), signal(1)
  Priya Patel                     5 events: envelope_promoted(1), revision(2), embedding(2)
  Carlos Rodriguez                3 events: envelope_promoted(1), revision(1), embedding(1)
  AlertRouter                     3 events: decision(1), signal(1), embedding(1)
  CostOptimizer                   3 events: retrieval(1), boundary_interaction(1), embedding(1)
  AnomalyDetector                 2 events: signal(1), embedding(1)
  ReportGenerator                 2 events: decision(1), embedding(1)
  System                          1 events: embedding(1)
  DecisionMemory                  1 events: retrieval(1)

📦 ENVELOPE TIMELINE & VERSIONING VALIDATION
────────────────────────────────────────────────────────────
ENV-DB-001: Query Optimization Recommendations
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v2: Hour 0-36 (36.00h duration)
  v3: Hour 42-72 (30.00h duration)
    ℹ️  GAP: 6 hours between v2 and v3
  Revisions: 1
    - Hour 10: v? (PII optimization procedures updated)

ENV-DB-002: Anomaly Detection & Alerting
  v3: Hour 0-72 (72.00h duration)
  Revisions: 1
    - Hour 20: v? (Alert threshold adjusted)

ENV-DB-003: Capacity Planning & Forecasting
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v1: Hour 12-36 (24.00h duration)
  v2: Hour 48-60 (12.00h duration)
    ℹ️  GAP: 12 hours between v1 and v2
  Revisions: 2
    - Hour 40: v? (Capacity buffer constraints refined)
      ℹ️  Revision occurs outside any active window
    - Hour 60: v? (Forecast model updated)

ENV-DB-004: Customer SLA Compliance Reporting
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v1: Hour 24-48 (24.00h duration)
  v2: Hour 66-72 (6.00h duration)
    ℹ️  GAP: 18 hours between v1 and v2
  ⚠️  Multiple windows but NO revision events

🌊 PARTICLE FLOW PATTERNS
────────────────────────────────────────────────────────────
Expected Particle Behaviors:

SIGNAL (8 events)
  Source: External → Envelope
  Behavior: Curves down, fades immediately

DECISION (ALLOWED) (5 events)
  Source: Agent → Envelope
  Behavior: Curves to envelope, orbits (18 ticks)

DECISION (DENIED) (0 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, PULSES (3x), continues to steward

BOUNDARY_INTERACTION (2 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, pulses (0.5s), continues to steward, ORBITS steward
    - Hour 6.8: QueryOptimizer → escalated (orbit: 80 ticks)
    - Hour 36.7: CostOptimizer → escalated (orbit: 82 ticks)

REVISION (4 events)
  Source: Steward → Envelope
  Behavior: Curves from steward (lower arc), fades at envelope

RETRIEVAL (3 events)
  Source: Embedding Store → Agent
  Behavior: Dotted curve from embedding store, fades at agent
    - Hour 6.6: QueryOptimizer retrieves 1 embeddings (top: 87%)
    - Hour 11: DecisionMemory retrieves 1 embeddings (top: 90%)
    - Hour 36.5: CostOptimizer retrieves 1 embeddings (top: 82%)


🔍 PARTICLE FLOW VALIDATION (Visual Correctness)
────────────────────────────────────────────────────────────
✅ All particle flows have required fields for visualization


🧠 SEMANTIC COHERENCE & LEARNING
────────────────────────────────────────────────────────────
Embeddings with semantic vectors: 13/13
Semantic diversity: 54% (vectors spread across quadrants)

Retrieval-Query Alignment:
  Retrievals with queries: 3/3

Relevance Score Analysis:
  Average relevance: 86%
  Perfect scores (≥95%): 0%

⚠️  Found 2 semantic issues


🔄 FEEDBACK LOOP EFFECTIVENESS
────────────────────────────────────────────────────────────
Revision-Boundary Alignment: 1/2 revisions semantically address their boundaries
Learning Evidence: 1/4 revision embeddings retrieved in future decisions
Recurring Boundary Patterns: 0 boundary types occur multiple times

⚠️  Found 1 effectiveness issues


⏱️  TEMPORAL REALISM
────────────────────────────────────────────────────────────
Embedding Delays: 11/12 have realistic timing (0.2-2h after source)
Retrieval-to-Action Timing: 2/2 have realistic gap (0.05-0.7h)

⚠️  Found 1 temporal realism issues


👤 ACTOR BEHAVIOR PATTERNS
────────────────────────────────────────────────────────────
Agent Specialization: 0 events where agents operated outside their designated envelopes

Decision Patterns:

✅ Actor behavior patterns are realistic


⚠️  POTENTIAL ISSUES & IMPROVEMENTS
────────────────────────────────────────────────────────────

ERROR (3):
  ❌ ENV-DB-001 has 1 events during inactive gap (hour 36-42)
  ❌ ENV-DB-003 has 4 events during inactive gap (hour 36-48)
  ❌ ENV-DB-004 has 2 events during inactive gap (hour 48-66)

WARNING (20):
  ⚠️ Retrieval at hour 6.6: High relevance (87%) but low query-context overlap for EMB-DB-HIST-001
  ⚠️ Retrieval at hour 36.5: High relevance (82%) but low query-context overlap for EMB-DB-HIST-001
  ⚠️ Revision at hour 40 doesn't clearly address boundary at 36.7 (low semantic overlap)
  ⚠️ ENV-DB-001 transitions v2→v3 (hour 36-42) without a revision event in that interval (envelope has revision_id="ENV-DB-001-v3")
  ⚠️ ENV-DB-001 revision at hour 10 is missing envelope_version (harder to verify version progression)
  ... and 15 more

INFO (7):
  ℹ️ Embedding at hour 38 created 6.0h after source - unusually long delay
  ℹ️ ENV-DB-001 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-DB-003 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-DB-003 revision at hour 40 occurs between windows (hour 36-48)
  ℹ️ ENV-DB-004 has 2 activation windows (same envelopeId appears multiple times)
  ... and 2 more


📋 SUMMARY METRICS
────────────────────────────────────────────────────────────

Closed Loop Compliance:
  ✅ Revisions with embeddings      4/4 [REQUIRED]
  ✅ Boundaries with embeddings     2/2 [REQUIRED]
  ✅ Time paradoxes                 0 [REQUIRED]
  ⚠️ Boundaries with retrieval      2/2 [RECOMMENDED]

Particle Flow Validation:
  ✅ Missing boundary_kind          0
  ✅ Missing agent lookups          0
  ✅ Missing envelope targets       0
  ✅ Unresolved boundaries          0

Semantic Coherence:
  ✅ Semantic vector validity       0
  ✅ Semantic diversity             Validated
  ✅ Historical baseline usage      None

Feedback Effectiveness:
  ⚠️ Revision-boundary alignment    1/2
  ✅ Learning evidence              1/4 reused

Temporal Realism:
  ⚠️ Embedding timing               11/12 realistic
  ✅ Retrieval-to-action gaps       2/2 realistic

Actor Behavior:
  ✅ Agent scope violations         0
  ✅ Decision variety               Validated

Scenario Health:
   Total events                   40
   Event types                    8
   Complete feedback cycles       2/2
   Historical baseline events     0

Identified Issues:
  ❌ Errors                         3
  ⚠️ Warnings                       20
   Suggestions                    0
   Info                           7


═══════════════════════════════════════════════════════════
ANALYSIS COMPLETE
═══════════════════════════════════════════════════════════
```

---

## insurance-underwriting

```text

═══════════════════════════════════════════════════════════
HDDL SCENARIO ANALYSIS: INSURANCE-UNDERWRITING
═══════════════════════════════════════════════════════════

📊 SCENARIO STRUCTURE
────────────────────────────────────────────────────────────
Title: Insurance Underwriting — Risk Assessment & Claims
Duration: 120 hours
Total Events: 85
Envelopes: 9 (unique: 4)
Steward Roles: 4
Total Agents: 18

📈 EVENT TYPE DISTRIBUTION
────────────────────────────────────────────────────────────
  embedding                  29 (34.1%)
  signal                     15 (17.6%)
  retrieval                  12 (14.1%)
  decision                   11 (12.9%)
  revision                    7 (8.2%)
  boundary_interaction        6 (7.1%)
  envelope_promoted           4 (4.7%)
  dsg_session                 1 (1.2%)

⏰ TEMPORAL ANALYSIS
────────────────────────────────────────────────────────────
First Event: Hour -48 (embedding)
Last Event: Hour 120 (signal)
Historical Baseline: 4 events (hour < 0)
Main Window: 81 events (0 to 120)

Event Density by 12-hour Window:
   -48--36 ██ 4
     0-12  ████████████ 24
    12-24  █████ 11
    24-36  ████ 9
    36-48  ██ 5
    48-60  ████ 9
    60-72  ████ 9
    72-84  ████ 9
    84-96   1
    96-108 █ 2
   108-120  1
   120-132  1

🔄 FEEDBACK LOOP ANALYSIS
────────────────────────────────────────────────────────────
Boundary Interactions: 6
Revisions: 7
Embeddings: 29
Retrievals: 12

Embeddings by Type:
  decision                  14
  boundary_interaction      7
  revision                  7
  session_artifact          1

Boundary Interaction → Embedding Coverage:
  ✅ 6/6 boundaries have embeddings

Revision → Embedding Coverage:
  ✅ 7/7 revisions have embeddings

🎯 COMPLETE FEEDBACK CYCLES (Boundary → Decision → Revision)
────────────────────────────────────────────────────────────
Complete Cycles: 6/6

Cycle 1: High-risk application escalated
  ⏰ Timeline:
     Hour 5.25: Retrieval by ThresholdEscalator
     Hour 5.30: Boundary (escalated) by ThresholdEscalator
     Hour 5.50: Boundary Embedding (EMB-INS-005)
     Hour 5.70: Decision (allowed) by Senior Underwriter #12
     Hour 6.20: Revision (constraint_addition)
     Hour 6.70: Revision Embedding (EMB-INS-005)
  📊 Cycle Duration: 0.90 hours
  🎯 Resolved: Codify manual underwriter decision pattern for flood risk properties to improve consistency.

Cycle 2: Fraud indicators detected
  ⏰ Timeline:
     Hour 12.35: Retrieval by FraudDetector
     Hour 12.40: Boundary (escalated) by FraudDetector
     Hour 13.00: Boundary Embedding (EMB-INS-002)
     Hour 18.20: Decision (allowed) by Claims Adjuster #47
     Hour 19.10: Revision (assumption_refinement)
     Hour 19.60: Revision Embedding (EMB-INS-006)
  📊 Cycle Duration: 6.70 hours
  🎯 Resolved: Reduce false positives in fraud detection by improving vehicle tracking logic.

Cycle 3: Premium increase exceeds threshold
  ⏰ Timeline:
     Hour 28.20: Retrieval by QuoteGenerator
     Hour 28.70: Boundary (escalated) by QuoteGenerator
     Hour 29.00: Boundary Embedding (EMB-INS-009)
     Hour 29.10: Decision (allowed) by Alicia Rodriguez
     Hour 30.50: Revision (constraint_relaxation)
     Hour 31.00: Revision Embedding (EMB-INS-007)
  📊 Cycle Duration: 1.80 hours
  🎯 Resolved: Address premium increase threshold boundary by enabling competitive retention strategies while maintaining customer transparency.

Cycle 4: Explainability gap identified
  ⏰ Timeline:
     Hour 48.10: Retrieval by ExplainabilityEngine
     Hour 48.30: Boundary (escalated) by ExplainabilityEngine
     Hour 49.00: Boundary Embedding (EMB-INS-012)
     Hour 52.80: Decision (allowed) by Diana Patel
     Hour 54.20: Revision (constraint_addition)
     Hour 54.70: Revision Embedding (EMB-INS-008)
  📊 Cycle Duration: 5.90 hours
  🎯 Resolved: Prevent explainability gaps by enforcing structured documentation at decision time.

Cycle 5: Confirmed fraud case escalated
  ⏰ Timeline:
     Hour 62.30: Retrieval by FraudDetector
     Hour 62.50: Boundary (escalated) by FraudDetector
     Hour 63.00: Boundary Embedding (EMB-INS-009)
     Hour 65.30: Decision (denied) by SIU Lead Investigator
     Hour 66.80: Revision (assumption_expansion)
     Hour 67.30: Revision Embedding (EMB-INS-010)
  📊 Cycle Duration: 4.30 hours
  🎯 Resolved: Strengthen fraud detection capabilities based on organized fraud ring patterns.

Cycle 6: Excessive renewal increase flagged
  ⏰ Timeline:
     Hour 78.20: Retrieval by QuoteGenerator
     Hour 78.40: Boundary (escalated) by QuoteGenerator
     Hour 78.90: Boundary Embedding (EMB-INS-011)
     Hour 79.20: Decision (denied) by Alicia Rodriguez
     Hour 80.50: Revision (constraint_addition)
     Hour 81.00: Revision Embedding (EMB-INS-012)
  📊 Cycle Duration: 2.10 hours
  🎯 Resolved: Provide clear guidance for handling extreme risk profile changes while maintaining regulatory compliance.

👥 ACTOR ANALYSIS
────────────────────────────────────────────────────────────
Most Active Actors:
  RiskScorer                     12 events: embedding(4), signal(5), retrieval(1), decision(2)
  Alicia Rodriguez               10 events: envelope_promoted(1), retrieval(1), decision(2), embedding(4), revision(2)
  FraudDetector                   8 events: embedding(3), retrieval(2), boundary_interaction(2), signal(1)
  Rebecca Foster                  7 events: envelope_promoted(1), revision(2), embedding(3), dsg_session(1)
  ClaimTriager                    6 events: retrieval(1), decision(1), embedding(1), signal(3)
  QuoteGenerator                  6 events: retrieval(2), boundary_interaction(2), embedding(2)
  Marcus Chen                     5 events: envelope_promoted(1), revision(2), embedding(2)
  Diana Patel                     5 events: envelope_promoted(1), decision(1), embedding(2), revision(1)
  ThresholdEscalator              4 events: embedding(2), retrieval(1), boundary_interaction(1)
  CompetitivenessMonitor          4 events: embedding(1), signal(3)

📦 ENVELOPE TIMELINE & VERSIONING VALIDATION
────────────────────────────────────────────────────────────
ENV-INS-001: Policy Risk Assessment
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v4: Hour 0-48 (48.00h duration)
  v5: Hour 60-120 (60.00h duration)
    ℹ️  GAP: 12 hours between v4 and v5
  Revisions: 2
    - Hour 6.2: v? (Flood mitigation requirement codified)
    - Hour 40: v? (Risk threshold adjusted)

ENV-INS-002: Claims Triage & Fraud Detection
  ℹ️  MULTI-WINDOW ENVELOPE: 3 activation windows
  v3: Hour 0-36 (36.00h duration)
  v4: Hour 60-96 (36.00h duration)
  v5: Hour 108-120 (12.00h duration)
    ℹ️  GAP: 24 hours between v3 and v4
    ℹ️  GAP: 12 hours between v4 and v5
  Revisions: 2
    - Hour 19.1: v? (Fraud detection refinement)
    - Hour 66.8: v? (Network fraud detection enhanced)

ENV-INS-003: Premium Pricing & Quote Generation
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v2: Hour 12-48 (36.00h duration)
  v3: Hour 72-108 (36.00h duration)
    ℹ️  GAP: 24 hours between v2 and v3
  Revisions: 2
    - Hour 30.5: v? (Premium threshold policy update)
    - Hour 80.5: v? (Non-renewal criteria clarified)

ENV-INS-004: Regulatory Compliance & Reporting
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v1: Hour 0-48 (48.00h duration)
  v2: Hour 60-120 (60.00h duration)
    ℹ️  GAP: 12 hours between v1 and v2
  Revisions: 1
    - Hour 54.2: v? (Enhanced explainability requirements)
      ℹ️  Revision occurs outside any active window

🌊 PARTICLE FLOW PATTERNS
────────────────────────────────────────────────────────────
Expected Particle Behaviors:

SIGNAL (15 events)
  Source: External → Envelope
  Behavior: Curves down, fades immediately

DECISION (ALLOWED) (8 events)
  Source: Agent → Envelope
  Behavior: Curves to envelope, orbits (18 ticks)

DECISION (DENIED) (3 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, PULSES (3x), continues to steward
    - Hour 10.3: RiskScorer → High-risk policy denied
    - Hour 65.3: SIU Lead Investigator → Claims denied - fraud confirmed
    - Hour 79.2: Alicia Rodriguez → Renewal exception denied

BOUNDARY_INTERACTION (6 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, pulses (0.5s), continues to steward, ORBITS steward
    - Hour 5.3: ThresholdEscalator → escalated (orbit: 23 ticks)
    - Hour 12.4: FraudDetector → escalated (orbit: 168 ticks)
    - Hour 28.7: QuoteGenerator → escalated (orbit: 45 ticks)
    - Hour 48.3: ExplainabilityEngine → escalated (orbit: 148 ticks)
    - Hour 62.5: FraudDetector → escalated (orbit: 107 ticks)
    - Hour 78.4: QuoteGenerator → escalated (orbit: 52 ticks)

REVISION (7 events)
  Source: Steward → Envelope
  Behavior: Curves from steward (lower arc), fades at envelope

RETRIEVAL (12 events)
  Source: Embedding Store → Agent
  Behavior: Dotted curve from embedding store, fades at agent
    - Hour 2.75: RiskScorer retrieves 1 embeddings (top: 94%)
    - Hour 5.25: ThresholdEscalator retrieves 1 embeddings (top: 89%)
    - Hour 5.5: Senior Underwriter #12 retrieves 1 embeddings (top: 91%)
    - Hour 7.2: DecisionMemory retrieves 1 embeddings (top: 92%)
    - Hour 8.05: ClaimTriager retrieves 1 embeddings (top: 87%)
    - Hour 12.35: FraudDetector retrieves 1 embeddings (top: 91%)
    - Hour 28.2: QuoteGenerator retrieves 2 embeddings (top: 89%)
    - Hour 28.9: Alicia Rodriguez retrieves 2 embeddings (top: 88%)
    - Hour 48.1: ExplainabilityEngine retrieves 2 embeddings (top: 92%)
    - Hour 62.3: FraudDetector retrieves 2 embeddings (top: 94%)
    - Hour 65.1: SIU Lead Investigator retrieves 2 embeddings (top: 93%)
    - Hour 78.2: QuoteGenerator retrieves 2 embeddings (top: 91%)


🔍 PARTICLE FLOW VALIDATION (Visual Correctness)
────────────────────────────────────────────────────────────
✅ All particle flows have required fields for visualization


🧠 SEMANTIC COHERENCE & LEARNING
────────────────────────────────────────────────────────────
Embeddings with semantic vectors: 29/29
Semantic diversity: 62% (vectors spread across quadrants)

Retrieval-Query Alignment:
  Retrievals with queries: 12/12

Relevance Score Analysis:
  Average relevance: 88%
  Perfect scores (≥95%): 0%

Historical Baseline: 4 embeddings before hour 0
  Referenced in retrievals: 10/12 (83%)

⚠️  Found 7 semantic issues


🔄 FEEDBACK LOOP EFFECTIVENESS
────────────────────────────────────────────────────────────
Revision-Boundary Alignment: 4/6 revisions semantically address their boundaries
Learning Evidence: 3/7 revision embeddings retrieved in future decisions
Recurring Boundary Patterns: 1 boundary types occur multiple times

⚠️  Found 2 effectiveness issues


⏱️  TEMPORAL REALISM
────────────────────────────────────────────────────────────
Embedding Delays: 25/25 have realistic timing (0.2-2h after source)
Retrieval-to-Action Timing: 8/11 have realistic gap (0.05-0.7h)

Decision Latency Patterns:
  Escalated decisions: 4
  Routine decisions: 7
  Note: Escalated decisions should show deliberation time

⚠️  Found 3 temporal realism issues


👤 ACTOR BEHAVIOR PATTERNS
────────────────────────────────────────────────────────────
Agent Specialization: 0 events where agents operated outside their designated envelopes

Decision Patterns:

✅ Actor behavior patterns are realistic


⚠️  POTENTIAL ISSUES & IMPROVEMENTS
────────────────────────────────────────────────────────────

ERROR (3):
  ❌ ENV-INS-002 has 2 events during inactive gap (hour 36-60)
  ❌ ENV-INS-003 has 1 events during inactive gap (hour 48-72)
  ❌ ENV-INS-004 has 8 events during inactive gap (hour 48-60)

WARNING (25):
  ⚠️ Retrieval at hour 5.5: High relevance (91%) but low query-context overlap for EMB-INS-HIST-001
  ⚠️ Retrieval at hour 28.9: High relevance (81%) but low query-context overlap for EMB-INS-001
  ⚠️ Retrieval at hour 48.1: High relevance (92%) but low query-context overlap for EMB-INS-HIST-002
  ⚠️ Retrieval at hour 48.1: High relevance (85%) but low query-context overlap for EMB-INS-008
  ⚠️ Retrieval at hour 62.3: High relevance (83%) but low query-context overlap for EMB-INS-006
  ... and 20 more

INFO (8):
  ℹ️ ENV-INS-001 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-INS-001 inactive for 12h between windows (hour 48-60)
  ℹ️ ENV-INS-002 has 3 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-INS-002 inactive for 12h between windows (hour 96-108)
  ℹ️ ENV-INS-003 has 2 activation windows (same envelopeId appears multiple times)
  ... and 3 more


📋 SUMMARY METRICS
────────────────────────────────────────────────────────────

Closed Loop Compliance:
  ✅ Revisions with embeddings      7/7 [REQUIRED]
  ✅ Boundaries with embeddings     6/6 [REQUIRED]
  ✅ Time paradoxes                 0 [REQUIRED]
  ⚠️ Boundaries with retrieval      6/6 [RECOMMENDED]

Particle Flow Validation:
  ✅ Missing boundary_kind          0
  ✅ Missing agent lookups          0
  ✅ Missing envelope targets       0
  ✅ Unresolved boundaries          0

Semantic Coherence:
  ✅ Semantic vector validity       0
  ✅ Semantic diversity             Validated
  ✅ Historical baseline usage      Present

Feedback Effectiveness:
  ⚠️ Revision-boundary alignment    4/6
  ✅ Learning evidence              3/7 reused

Temporal Realism:
  ✅ Embedding timing               25/25 realistic
  ⚠️ Retrieval-to-action gaps       8/11 realistic

Actor Behavior:
  ✅ Agent scope violations         0
  ✅ Decision variety               Validated

Scenario Health:
   Total events                   85
   Event types                    8
   Complete feedback cycles       6/6
   Historical baseline events     4

Identified Issues:
  ❌ Errors                         3
  ⚠️ Warnings                       25
   Suggestions                    0
   Info                           8


═══════════════════════════════════════════════════════════
ANALYSIS COMPLETE
═══════════════════════════════════════════════════════════
```

---

## medical-diagnosis

```text

═══════════════════════════════════════════════════════════
HDDL SCENARIO ANALYSIS: MEDICAL-DIAGNOSIS
═══════════════════════════════════════════════════════════

📊 SCENARIO STRUCTURE
────────────────────────────────────────────────────────────
Title: Medical Diagnosis Support — Healthcare Stewardship
Duration: 72 hours
Total Events: 32
Envelopes: 6 (unique: 3)
Steward Roles: 3
Total Agents: 9

📈 EVENT TYPE DISTRIBUTION
────────────────────────────────────────────────────────────
  embedding                  10 (31.3%)
  signal                      8 (25.0%)
  envelope_promoted           3 (9.4%)
  retrieval                   3 (9.4%)
  revision                    3 (9.4%)
  decision                    2 (6.3%)
  boundary_interaction        2 (6.3%)
  dsg_session                 1 (3.1%)

⏰ TEMPORAL ANALYSIS
────────────────────────────────────────────────────────────
First Event: Hour 0 (envelope_promoted)
Last Event: Hour 65.8 (signal)
Historical Baseline: 0 events (hour < 0)
Main Window: 32 events (0 to 72)

Event Density by 12-hour Window:
     0-12  █████ 11
    12-24  █████ 11
    24-36  ████ 8
    48-60   1
    60-72   1

🔄 FEEDBACK LOOP ANALYSIS
────────────────────────────────────────────────────────────
Boundary Interactions: 2
Revisions: 3
Embeddings: 10
Retrievals: 3

Embeddings by Type:
  revision                  3
  decision                  2
  boundary_interaction      2
  signal                    2
  session_artifact          1

Boundary Interaction → Embedding Coverage:
  ✅ 2/2 boundaries have embeddings

Revision → Embedding Coverage:
  ✅ 3/3 revisions have embeddings

🎯 COMPLETE FEEDBACK CYCLES (Boundary → Decision → Revision)
────────────────────────────────────────────────────────────
Complete Cycles: 2/2

Cycle 1: Drug interaction detected
  ⏰ Timeline:
     Hour 8.00: Retrieval by InteractionChecker
     Hour 8.20: Boundary (escalated) by InteractionChecker
     Hour 9.00: Boundary Embedding (EMB-MED-002)
     Hour 8.30: Decision (undefined) by Pharmacist Mike Torres
     Hour 26.00: Revision (boundary_adjustment)
     Hour 26.50: Revision Embedding (EMB-MED-REV-001)
  📊 Cycle Duration: 17.80 hours
  🎯 Resolved: Reduce false positive escalations while maintaining safety for anticoagulant interactions.

Cycle 2: High-severity interaction blocked
  ⏰ Timeline:
     Hour 21.90: Retrieval by AllergyGuard
     Hour 22.10: Boundary (escalated) by AllergyGuard
     Hour 24.00: Boundary Embedding (EMB-MED-002f)
     Hour 27.00: Revision (constraint_addition)
     Hour 27.50: Revision Embedding (EMB-MED-REV-002)
  📊 Cycle Duration: 4.90 hours
  🎯 Resolved: Address cross-reactivity gaps identified during allergy block review.

👥 ACTOR ANALYSIS
────────────────────────────────────────────────────────────
Most Active Actors:
  Pharmacist Mike Torres          7 events: envelope_promoted(1), decision(1), embedding(3), revision(2)
  Dr. Sarah Chen                  5 events: envelope_promoted(1), revision(1), dsg_session(1), embedding(2)
  InteractionChecker              3 events: retrieval(1), boundary_interaction(1), embedding(1)
  AllergyGuard                    3 events: retrieval(1), boundary_interaction(1), embedding(1)
  VitalTrendMonitor               2 events: signal(1), embedding(1)
  TriageAdvisor                   2 events: signal(1), embedding(1)
  LabIntegration                  1 events: signal(1)
  DiagnosticAssist                1 events: decision(1)
  DiagnosticAssistant             1 events: embedding(1)
  FormularySystem                 1 events: signal(1)

📦 ENVELOPE TIMELINE & VERSIONING VALIDATION
────────────────────────────────────────────────────────────
ENV-MED-001: Diagnostic Recommendations
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v1: Hour 0-20 (20.00h duration)
  v2: Hour 28-36 (8.00h duration)
    ℹ️  GAP: 8 hours between v1 and v2
  Revisions: 1
    - Hour 16.5: v? (Confidence threshold adjusted)

ENV-MED-002: Medication Interaction Alerts
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v1: Hour 6-30 (24.00h duration)
  v2: Hour 42-48 (6.00h duration)
    ℹ️  GAP: 12 hours between v1 and v2
  Revisions: 2
    - Hour 26: v? (Drug interaction handling updated)
    - Hour 27: v? (Allergy alert precision improved)

ENV-MED-003: Patient Triage Priority
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v2: Hour 12-36 (24.00h duration)
  v3: Hour 48-72 (24.00h duration)
    ℹ️  GAP: 12 hours between v2 and v3
  ⚠️  Multiple windows but NO revision events

🌊 PARTICLE FLOW PATTERNS
────────────────────────────────────────────────────────────
Expected Particle Behaviors:

SIGNAL (8 events)
  Source: External → Envelope
  Behavior: Curves down, fades immediately

DECISION (ALLOWED) (2 events)
  Source: Agent → Envelope
  Behavior: Curves to envelope, orbits (18 ticks)

DECISION (DENIED) (0 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, PULSES (3x), continues to steward

BOUNDARY_INTERACTION (2 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, pulses (0.5s), continues to steward, ORBITS steward
    - Hour 8.2: InteractionChecker → escalated (orbit: 445 ticks)
    - Hour 22.1: AllergyGuard → escalated (orbit: 122 ticks)

REVISION (3 events)
  Source: Steward → Envelope
  Behavior: Curves from steward (lower arc), fades at envelope

RETRIEVAL (3 events)
  Source: Embedding Store → Agent
  Behavior: Dotted curve from embedding store, fades at agent
    - Hour 8: InteractionChecker retrieves 0 embeddings (top: 0%)
    - Hour 18.5: DecisionMemory retrieves 1 embeddings (top: 88%)
    - Hour 21.9: AllergyGuard retrieves 0 embeddings (top: 0%)


🔍 PARTICLE FLOW VALIDATION (Visual Correctness)
────────────────────────────────────────────────────────────
Found 2 particle flow issues

INFO (2):
  ℹ️ Retrieval at hour 8 has no retrievedEmbeddings array - won't show what was retrieved
  ℹ️ Retrieval at hour 21.9 has no retrievedEmbeddings array - won't show what was retrieved


🧠 SEMANTIC COHERENCE & LEARNING
────────────────────────────────────────────────────────────
Embeddings with semantic vectors: 10/10
Semantic diversity: 40% (vectors spread across quadrants)

Retrieval-Query Alignment:
  Retrievals with queries: 1/3

Relevance Score Analysis:
  Average relevance: 88%
  Perfect scores (≥95%): 0%

✅ Semantic coherence validated


🔄 FEEDBACK LOOP EFFECTIVENESS
────────────────────────────────────────────────────────────
Revision-Boundary Alignment: 0/2 revisions semantically address their boundaries
Learning Evidence: 1/3 revision embeddings retrieved in future decisions
Recurring Boundary Patterns: 1 boundary types occur multiple times

⚠️  Found 2 effectiveness issues


⏱️  TEMPORAL REALISM
────────────────────────────────────────────────────────────
Embedding Delays: 9/9 have realistic timing (0.2-2h after source)
Retrieval-to-Action Timing: 2/2 have realistic gap (0.05-0.7h)

Decision Latency Patterns:
  Escalated decisions: 1
  Routine decisions: 1
  Note: Escalated decisions should show deliberation time

✅ Temporal patterns appear realistic


👤 ACTOR BEHAVIOR PATTERNS
────────────────────────────────────────────────────────────
Agent Specialization: 0 events where agents operated outside their designated envelopes

Decision Patterns:

Retrieval Usage:
  1 agents make complex decisions without using retrieval

⚠️  Found 1 behavior pattern issues


⚠️  POTENTIAL ISSUES & IMPROVEMENTS
────────────────────────────────────────────────────────────

WARNING (20):
  ⚠️ Revision at hour 26 doesn't clearly address boundary at 8.2 (low semantic overlap)
  ⚠️ Revision at hour 27 doesn't clearly address boundary at 22.1 (low semantic overlap)
  ⚠️ ENV-MED-001 transitions v1→v2 (hour 20-28) without a revision event in that interval (envelope has revision_id="ENV-MED-001-v2")
  ⚠️ ENV-MED-001 revision at hour 16.5 is missing envelope_version (harder to verify version progression)
  ⚠️ ENV-MED-002 transitions v1→v2 (hour 30-42) without a revision event in that interval (envelope has revision_id="ENV-MED-002-v2")
  ... and 15 more

SUGGESTION (1):
  ℹ️ Pharmacist Mike Torres makes complex decisions but never retrieves context - consider adding retrieval for realism

INFO (8):
  ℹ️ ENV-MED-001 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-MED-001 inactive for 8h between windows (hour 20-28)
  ℹ️ ENV-MED-002 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-MED-002 inactive for 12h between windows (hour 30-42)
  ℹ️ ENV-MED-003 has 2 activation windows (same envelopeId appears multiple times)
  ... and 3 more


📋 SUMMARY METRICS
────────────────────────────────────────────────────────────

Closed Loop Compliance:
  ✅ Revisions with embeddings      3/3 [REQUIRED]
  ✅ Boundaries with embeddings     2/2 [REQUIRED]
  ✅ Time paradoxes                 0 [REQUIRED]
  ⚠️ Boundaries with retrieval      2/2 [RECOMMENDED]

Particle Flow Validation:
  ✅ Missing boundary_kind          0
  ✅ Missing agent lookups          0
  ✅ Missing envelope targets       0
  ✅ Unresolved boundaries          0

Semantic Coherence:
  ✅ Semantic vector validity       0
  ✅ Semantic diversity             Validated
  ✅ Historical baseline usage      None

Feedback Effectiveness:
  ⚠️ Revision-boundary alignment    0/2
  ✅ Learning evidence              1/3 reused

Temporal Realism:
  ✅ Embedding timing               9/9 realistic
  ✅ Retrieval-to-action gaps       2/2 realistic

Actor Behavior:
  ✅ Agent scope violations         0
  ✅ Decision variety               Validated

Scenario Health:
   Total events                   32
   Event types                    8
   Complete feedback cycles       2/2
   Historical baseline events     0

Identified Issues:
  ✅ Errors                         0
  ⚠️ Warnings                       20
   Suggestions                    1
   Info                           8


═══════════════════════════════════════════════════════════
ANALYSIS COMPLETE
═══════════════════════════════════════════════════════════
```

---

## saas-dashboarding

```text

═══════════════════════════════════════════════════════════
HDDL SCENARIO ANALYSIS: SAAS-DASHBOARDING
═══════════════════════════════════════════════════════════

📊 SCENARIO STRUCTURE
────────────────────────────────────────────────────────────
Title: SaaS Dashboard Builder — Self-Service Analytics
Duration: 96 hours
Total Events: 46
Envelopes: 7 (unique: 4)
Steward Roles: 4
Total Agents: 12

📈 EVENT TYPE DISTRIBUTION
────────────────────────────────────────────────────────────
  embedding                  15 (32.6%)
  signal                      8 (17.4%)
  decision                    6 (13.0%)
  revision                    5 (10.9%)
  envelope_promoted           4 (8.7%)
  retrieval                   4 (8.7%)
  boundary_interaction        3 (6.5%)
  dsg_session                 1 (2.2%)

⏰ TEMPORAL ANALYSIS
────────────────────────────────────────────────────────────
First Event: Hour 0 (envelope_promoted)
Last Event: Hour 84 (decision)
Historical Baseline: 0 events (hour < 0)
Main Window: 46 events (0 to 96)

Event Density by 12-hour Window:
     0-12  ██████████ 20
    12-24  █████ 11
    24-36  ██ 5
    36-48  █ 2
    48-60   1
    60-72  █ 3
    72-84  █ 2
    84-96  █ 2

🔄 FEEDBACK LOOP ANALYSIS
────────────────────────────────────────────────────────────
Boundary Interactions: 3
Revisions: 5
Embeddings: 15
Retrievals: 4

Embeddings by Type:
  decision                  6
  revision                  5
  boundary_interaction      3
  session_artifact          1

Boundary Interaction → Embedding Coverage:
  ✅ 3/3 boundaries have embeddings

Revision → Embedding Coverage:
  ✅ 5/5 revisions have embeddings

🎯 COMPLETE FEEDBACK CYCLES (Boundary → Decision → Revision)
────────────────────────────────────────────────────────────
Complete Cycles: 3/3

Cycle 1: Large query scan flagged
  ⏰ Timeline:
     Hour 5.60: Retrieval by QueryPerformanceGuard
     Hour 5.80: Boundary (escalated) by QueryPerformanceGuard
     Hour 6.00: Boundary Embedding (EMB-DASH-006)
     Hour 6.10: Decision (undefined) by QueryPerformanceGuard
     Hour 8.00: Revision (boundary_adjustment)
     Hour 8.50: Revision Embedding (EMB-DASH-013)
  📊 Cycle Duration: 2.20 hours
  🎯 Resolved: Users frequently approve 2-3M row scans that complete within timeout. Threshold adjustment reduces friction for legitimate queries.

Cycle 2: Accessibility issue detected
  ⏰ Timeline:
     Hour 10.10: Retrieval by ColorPaletteGuard
     Hour 10.30: Boundary (escalated) by ColorPaletteGuard
     Hour 11.00: Boundary Embedding (EMB-DASH-008)
     Hour 12.00: Revision (constraint_update)
     Hour 12.50: Revision Embedding (EMB-DASH-014)
  📊 Cycle Duration: 1.70 hours
  🎯 Resolved: Proactive accessibility compliance by expanding palette library reduces future contrast violations.

Cycle 3: PII field redacted
  ⏰ Timeline:
     Hour 18.00: Retrieval by PIIRedactor
     Hour 18.20: Boundary (escalated) by PIIRedactor
     Hour 19.00: Boundary Embedding (EMB-DASH-002)
     Hour 20.00: Revision (capability_expansion)
     Hour 20.50: Revision Embedding (EMB-DASH-015)
  📊 Cycle Duration: 1.80 hours
  🎯 Resolved: Provide privacy-preserving alternatives when users need PII-adjacent analysis without exposing raw personal data.

👥 ACTOR ANALYSIS
────────────────────────────────────────────────────────────
Most Active Actors:
  Alex Kumar                      7 events: envelope_promoted(1), revision(2), embedding(3), dsg_session(1)
  QueryPerformanceGuard           6 events: retrieval(1), boundary_interaction(1), embedding(2), decision(1), signal(1)
  Emma Wilson                     5 events: envelope_promoted(1), revision(2), embedding(2)
  ChartAdvisor                    3 events: decision(1), embedding(1), signal(1)
  ColorPaletteGuard               3 events: retrieval(1), boundary_interaction(1), embedding(1)
  Jordan Hayes                    3 events: envelope_promoted(1), revision(1), embedding(1)
  PIIRedactor                     3 events: retrieval(1), boundary_interaction(1), embedding(1)
  TemplateRecommender             2 events: decision(1), embedding(1)
  NLQueryTranslator               2 events: decision(1), embedding(1)
  ExternalShareGuard              2 events: decision(1), embedding(1)

📦 ENVELOPE TIMELINE & VERSIONING VALIDATION
────────────────────────────────────────────────────────────
ENV-DASH-001: Chart & Widget Recommendations
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v2: Hour 0-48 (48.00h duration)
  v3: Hour 60-96 (36.00h duration)
    ℹ️  GAP: 12 hours between v2 and v3
  Revisions: 2
    - Hour 12: v? (Color palette library updated)
    - Hour 24: v? (Visualization limit adjusted)

ENV-DASH-002: Query Generation & Optimization
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v3: Hour 0-42 (42.00h duration)
  v4: Hour 54-96 (42.00h duration)
    ℹ️  GAP: 12 hours between v3 and v4
  Revisions: 2
    - Hour 8: v? (Query scan threshold updated)
    - Hour 20: v? (PII anonymization functions added)

ENV-DASH-003: Dashboard Sharing & Permissions
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v1: Hour 12-48 (36.00h duration)
  v2: Hour 60-84 (24.00h duration)
    ℹ️  GAP: 12 hours between v1 and v2
  Revisions: 1
    - Hour 60: v? (Link expiration policy updated)

ENV-DASH-004: Onboarding & Template Suggestions
  v1: Hour 0-48 (48.00h duration)

🌊 PARTICLE FLOW PATTERNS
────────────────────────────────────────────────────────────
Expected Particle Behaviors:

SIGNAL (8 events)
  Source: External → Envelope
  Behavior: Curves down, fades immediately

DECISION (ALLOWED) (6 events)
  Source: Agent → Envelope
  Behavior: Curves to envelope, orbits (18 ticks)

DECISION (DENIED) (0 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, PULSES (3x), continues to steward

BOUNDARY_INTERACTION (3 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, pulses (0.5s), continues to steward, ORBITS steward
    - Hour 5.8: QueryPerformanceGuard → escalated (orbit: 55 ticks)
    - Hour 10.3: ColorPaletteGuard → escalated (orbit: 42 ticks)
    - Hour 18.2: PIIRedactor → escalated (orbit: 45 ticks)

REVISION (5 events)
  Source: Steward → Envelope
  Behavior: Curves from steward (lower arc), fades at envelope

RETRIEVAL (4 events)
  Source: Embedding Store → Agent
  Behavior: Dotted curve from embedding store, fades at agent
    - Hour 5.6: QueryPerformanceGuard retrieves 1 embeddings (top: 88%)
    - Hour 9: DecisionMemory retrieves 1 embeddings (top: 90%)
    - Hour 10.1: ColorPaletteGuard retrieves 1 embeddings (top: 92%)
    - Hour 18: PIIRedactor retrieves 2 embeddings (top: 91%)


🔍 PARTICLE FLOW VALIDATION (Visual Correctness)
────────────────────────────────────────────────────────────
✅ All particle flows have required fields for visualization


🧠 SEMANTIC COHERENCE & LEARNING
────────────────────────────────────────────────────────────
Embeddings with semantic vectors: 15/15
Semantic diversity: 53% (vectors spread across quadrants)

Retrieval-Query Alignment:
  Retrievals with queries: 4/4

Relevance Score Analysis:
  Average relevance: 89%
  Perfect scores (≥95%): 0%

⚠️  Found 3 semantic issues


🔄 FEEDBACK LOOP EFFECTIVENESS
────────────────────────────────────────────────────────────
Revision-Boundary Alignment: 1/3 revisions semantically address their boundaries
Learning Evidence: 1/5 revision embeddings retrieved in future decisions
Recurring Boundary Patterns: 1 boundary types occur multiple times

⚠️  Found 2 effectiveness issues


⏱️  TEMPORAL REALISM
────────────────────────────────────────────────────────────
Embedding Delays: 14/14 have realistic timing (0.2-2h after source)
Retrieval-to-Action Timing: 3/3 have realistic gap (0.05-0.7h)

Decision Latency Patterns:
  Escalated decisions: 1
  Routine decisions: 5
  Note: Escalated decisions should show deliberation time

✅ Temporal patterns appear realistic


👤 ACTOR BEHAVIOR PATTERNS
────────────────────────────────────────────────────────────
Agent Specialization: 0 events where agents operated outside their designated envelopes

Decision Patterns:

✅ Actor behavior patterns are realistic


⚠️  POTENTIAL ISSUES & IMPROVEMENTS
────────────────────────────────────────────────────────────

ERROR (1):
  ❌ ENV-DASH-002 has 1 events during inactive gap (hour 42-54)

WARNING (22):
  ⚠️ Retrieval at hour 5.6: High relevance (88%) but low query-context overlap for EMB-DASH-005
  ⚠️ Retrieval at hour 10.1: High relevance (92%) but low query-context overlap for EMB-DASH-001
  ⚠️ Retrieval at hour 18: High relevance (85%) but low query-context overlap for EMB-DASH-006
  ⚠️ Revision at hour 8 doesn't clearly address boundary at 5.8 (low semantic overlap)
  ⚠️ Revision at hour 20 doesn't clearly address boundary at 18.2 (low semantic overlap)
  ... and 17 more

INFO (7):
  ℹ️ ENV-DASH-001 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-DASH-001 inactive for 12h between windows (hour 48-60)
  ℹ️ ENV-DASH-002 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-DASH-003 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-DASH-003 inactive for 12h between windows (hour 48-60)
  ... and 2 more


📋 SUMMARY METRICS
────────────────────────────────────────────────────────────

Closed Loop Compliance:
  ✅ Revisions with embeddings      5/5 [REQUIRED]
  ✅ Boundaries with embeddings     3/3 [REQUIRED]
  ✅ Time paradoxes                 0 [REQUIRED]
  ⚠️ Boundaries with retrieval      3/3 [RECOMMENDED]

Particle Flow Validation:
  ✅ Missing boundary_kind          0
  ✅ Missing agent lookups          0
  ✅ Missing envelope targets       0
  ✅ Unresolved boundaries          0

Semantic Coherence:
  ✅ Semantic vector validity       0
  ✅ Semantic diversity             Validated
  ✅ Historical baseline usage      None

Feedback Effectiveness:
  ⚠️ Revision-boundary alignment    1/3
  ✅ Learning evidence              1/5 reused

Temporal Realism:
  ✅ Embedding timing               14/14 realistic
  ✅ Retrieval-to-action gaps       3/3 realistic

Actor Behavior:
  ✅ Agent scope violations         0
  ✅ Decision variety               Validated

Scenario Health:
   Total events                   46
   Event types                    8
   Complete feedback cycles       3/3
   Historical baseline events     0

Identified Issues:
  ❌ Errors                         1
  ⚠️ Warnings                       22
   Suggestions                    0
   Info                           7


═══════════════════════════════════════════════════════════
ANALYSIS COMPLETE
═══════════════════════════════════════════════════════════
```

---

## test-minimal

```text

═══════════════════════════════════════════════════════════
HDDL SCENARIO ANALYSIS: TEST-MINIMAL
═══════════════════════════════════════════════════════════

📊 SCENARIO STRUCTURE
────────────────────────────────────────────────────────────
Title: Test Minimal — Fast Test Harness
Duration: 6 hours
Total Events: 10
Envelopes: 2 (unique: 2)
Steward Roles: 1
Total Agents: 2

📈 EVENT TYPE DISTRIBUTION
────────────────────────────────────────────────────────────
  embedding                   4 (40.0%)
  decision                    3 (30.0%)
  boundary_interaction        1 (10.0%)
  revision                    1 (10.0%)
  retrieval                   1 (10.0%)

⏰ TEMPORAL ANALYSIS
────────────────────────────────────────────────────────────
First Event: Hour 0 (embedding)
Last Event: Hour 5 (decision)
Historical Baseline: 0 events (hour < 0)
Main Window: 10 events (0 to 6)

Event Density by 12-hour Window:
     0-12  █████ 10

🔄 FEEDBACK LOOP ANALYSIS
────────────────────────────────────────────────────────────
Boundary Interactions: 1
Revisions: 1
Embeddings: 4
Retrievals: 1

Embeddings by Type:
  revision                  2
  boundary_interaction      1
  decision                  1

Boundary Interaction → Embedding Coverage:
  ✅ 1/1 boundaries have embeddings

Revision → Embedding Coverage:
  ✅ 1/1 revisions have embeddings

🎯 COMPLETE FEEDBACK CYCLES (Boundary → Decision → Revision)
────────────────────────────────────────────────────────────
Complete Cycles: 1/1

Cycle 1: undefined
  ⏰ Timeline:
     Hour 2.00: Boundary (escalated) by TestBot Alpha
     Hour 2.50: Boundary Embedding (EMB-001)
     Hour 3.00: Decision (allowed) by policy steward
     Hour 4.00: Revision (undefined)
     Hour 4.50: Revision Embedding (EMB-003)
  📊 Cycle Duration: 2.00 hours
  🎯 Resolved: N/A

👥 ACTOR ANALYSIS
────────────────────────────────────────────────────────────
Most Active Actors:
  TestBot Alpha                   2 events: decision(1), boundary_interaction(1)
  policy steward                  2 events: decision(1), revision(1)
  DecisionMemory                  1 events: retrieval(1)
  TestBot Beta                    1 events: decision(1)

📦 ENVELOPE TIMELINE & VERSIONING VALIDATION
────────────────────────────────────────────────────────────
env-test-policy: Test Policy
  vundefined: Hour 0-6 (6.00h duration)
  Revisions: 1
    - Hour 4: v? (undefined)

env-test-queue: Test Queue
  vundefined: Hour 0-6 (6.00h duration)

🌊 PARTICLE FLOW PATTERNS
────────────────────────────────────────────────────────────
Expected Particle Behaviors:

SIGNAL (0 events)
  Source: External → Envelope
  Behavior: Curves down, fades immediately

DECISION (ALLOWED) (2 events)
  Source: Agent → Envelope
  Behavior: Curves to envelope, orbits (18 ticks)

DECISION (DENIED) (1 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, PULSES (3x), continues to steward
    - Hour 5: TestBot Beta → undefined

BOUNDARY_INTERACTION (1 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, pulses (0.5s), continues to steward, ORBITS steward
    - Hour 2: TestBot Alpha → escalated (orbit: 50 ticks)

REVISION (1 events)
  Source: Steward → Envelope
  Behavior: Curves from steward (lower arc), fades at envelope

RETRIEVAL (1 events)
  Source: Embedding Store → Agent
  Behavior: Dotted curve from embedding store, fades at agent
    - Hour 4.8: DecisionMemory retrieves 1 embeddings (top: 95%)


🔍 PARTICLE FLOW VALIDATION (Visual Correctness)
────────────────────────────────────────────────────────────
✅ All particle flows have required fields for visualization


🧠 SEMANTIC COHERENCE & LEARNING
────────────────────────────────────────────────────────────

Retrieval-Query Alignment:
  Retrievals with queries: 1/1

Relevance Score Analysis:
  Average relevance: 95%
  Perfect scores (≥95%): 100%

⚠️  Found 1 semantic issues


🔄 FEEDBACK LOOP EFFECTIVENESS
────────────────────────────────────────────────────────────
Revision-Boundary Alignment: 0/1 revisions semantically address their boundaries
Learning Evidence: 1/2 revision embeddings retrieved in future decisions
Recurring Boundary Patterns: 0 boundary types occur multiple times

⚠️  Found 1 effectiveness issues


⏱️  TEMPORAL REALISM
────────────────────────────────────────────────────────────
Embedding Delays: 3/3 have realistic timing (0.2-2h after source)
Retrieval-to-Action Timing: 0/0 have realistic gap (0.05-0.7h)

Decision Latency Patterns:
  Escalated decisions: 2
  Routine decisions: 1
  Note: Escalated decisions should show deliberation time

✅ Temporal patterns appear realistic


👤 ACTOR BEHAVIOR PATTERNS
────────────────────────────────────────────────────────────
Agent Specialization: 0 events where agents operated outside their designated envelopes

Decision Patterns:

Retrieval Usage:
  1 agents make complex decisions without using retrieval

⚠️  Found 1 behavior pattern issues


⚠️  POTENTIAL ISSUES & IMPROVEMENTS
────────────────────────────────────────────────────────────

WARNING (3):
  ⚠️ Revision at hour 4 doesn't clearly address boundary at 2 (low semantic overlap)
  ⚠️ env-test-policy revision at hour 4 is missing envelope_version (harder to verify version progression)
  ⚠️ Agent "DecisionMemory" appears in events but not defined in any fleet

SUGGESTION (3):
  ℹ️ 100% of relevance scores are ≥95% - consider adding more variation for realism
  ℹ️ TestBot Beta makes complex decisions but never retrieves context - consider adding retrieval for realism
  ℹ️ Boundary at hour 2 by TestBot Alpha lacks preceding retrieval (shows agent "thinking")

INFO (2):
  ℹ️ Retrieval at hour 4.8 by DecisionMemory not followed by decision or boundary within 1 hour
  ℹ️ Only 33% of decisions have embeddings (1/3). Consider adding embeddings for key decisions to enable agent learning.


📋 SUMMARY METRICS
────────────────────────────────────────────────────────────

Closed Loop Compliance:
  ✅ Revisions with embeddings      1/1 [REQUIRED]
  ✅ Boundaries with embeddings     1/1 [REQUIRED]
  ✅ Time paradoxes                 0 [REQUIRED]
  ⚠️ Boundaries with retrieval      0/1 [RECOMMENDED]

Particle Flow Validation:
  ✅ Missing boundary_kind          0
  ✅ Missing agent lookups          0
  ✅ Missing envelope targets       0
  ✅ Unresolved boundaries          0

Semantic Coherence:
  ✅ Semantic vector validity       0
  ✅ Semantic diversity             N/A
  ✅ Historical baseline usage      None

Feedback Effectiveness:
  ⚠️ Revision-boundary alignment    0/1
  ✅ Learning evidence              1/2 reused

Temporal Realism:
  ✅ Embedding timing               3/3 realistic
  ✅ Retrieval-to-action gaps       N/A

Actor Behavior:
  ✅ Agent scope violations         0
  ✅ Decision variety               Validated

Scenario Health:
   Total events                   10
   Event types                    5
   Complete feedback cycles       1/1
   Historical baseline events     0

Identified Issues:
  ✅ Errors                         0
  ⚠️ Warnings                       3
   Suggestions                    3
   Info                           2


═══════════════════════════════════════════════════════════
ANALYSIS COMPLETE
═══════════════════════════════════════════════════════════
```

---

## vertical-hydroponics-farm

```text

═══════════════════════════════════════════════════════════
HDDL SCENARIO ANALYSIS: VERTICAL-HYDROPONICS-FARM
═══════════════════════════════════════════════════════════

📊 SCENARIO STRUCTURE
────────────────────────────────────────────────────────────
Title: Vertical Hydroponics Farm — Sustainable Urban Agriculture
Duration: 240 hours
Total Events: 61
Envelopes: 11 (unique: 6)
Steward Roles: 6
Total Agents: 18

📈 EVENT TYPE DISTRIBUTION
────────────────────────────────────────────────────────────
  embedding                  23 (37.7%)
  decision                   10 (16.4%)
  signal                      8 (13.1%)
  revision                    6 (9.8%)
  boundary_interaction        5 (8.2%)
  envelope_promoted           4 (6.6%)
  retrieval                   4 (6.6%)
  dsg_session                 1 (1.6%)

⏰ TEMPORAL ANALYSIS
────────────────────────────────────────────────────────────
First Event: Hour 0 (envelope_promoted)
Last Event: Hour 240 (signal)
Historical Baseline: 0 events (hour < 0)
Main Window: 61 events (0 to 240)

Event Density by 12-hour Window:
     0-12  ███ 6
    12-24  ████ 9
    24-36   1
    36-48  █ 2
    48-60  ████ 8
    72-84  █ 2
    96-108 ███ 6
   108-120 █ 3
   120-132 █ 2
   144-156 ███ 6
   168-180 ██ 4
   180-192  1
   192-204  1
   216-228 █ 3
   228-240 ███ 6
   240-252  1

🔄 FEEDBACK LOOP ANALYSIS
────────────────────────────────────────────────────────────
Boundary Interactions: 5
Revisions: 6
Embeddings: 23
Retrievals: 4

Embeddings by Type:
  decision                  10
  revision                  7
  boundary_interaction      5
  session_artifact          1

Boundary Interaction → Embedding Coverage:
  ✅ 5/5 boundaries have embeddings

Revision → Embedding Coverage:
  ✅ 6/6 revisions have embeddings

🎯 COMPLETE FEEDBACK CYCLES (Boundary → Decision → Revision)
────────────────────────────────────────────────────────────
Complete Cycles: 5/5

Cycle 1: Temperature variance exceeded
  ⏰ Timeline:
     Hour 18.50: Retrieval by ClimateController
     Hour 18.70: Boundary (escalated) by ClimateController
     Hour 19.00: Boundary Embedding (EMB-VH-003)
     Hour 19.30: Decision (undefined) by Marcus Johnson
     Hour 22.00: Revision (maintenance_protocol)
     Hour 22.50: Revision Embedding (EMB-VH-015)
  📊 Cycle Duration: 3.30 hours
  🎯 Resolved: Proactive detection of compressor degradation prevents crop stress and backup chiller reliance.

Cycle 2: pH drift detected
  ⏰ Timeline:
     Hour 48.80: Boundary (undefined) by pHController
     Hour 49.00: Boundary Embedding (EMB-VH-006)
     Hour 49.50: Decision (undefined) by Ana Martinez
     Hour 52.00: Revision (threshold_adjustment)
     Hour 52.50: Revision Embedding (EMB-VH-016)
  📊 Cycle Duration: 3.20 hours
  🎯 Resolved: Early biocontrol intervention prevents exponential pest growth and crop damage.

Cycle 3: Visual defects flagged
  ⏰ Timeline:
     Hour 102.20: Retrieval by QualityInspector
     Hour 102.40: Boundary (escalated) by QualityInspector
     Hour 103.00: Boundary Embedding (EMB-VH-010)
     Hour 108.00: Revision (nutrient_protocol)
     Hour 108.50: Revision Embedding (EMB-VH-017)
  📊 Cycle Duration: 5.60 hours
  🎯 Resolved: Field data shows calcium deficiency correlation with tip burn in lettuce crops.

Cycle 4: Carbon intensity exceeded
  ⏰ Timeline:
     Hour 144.00: Retrieval by CarbonTracker
     Hour 144.20: Boundary (escalated) by CarbonTracker
     Hour 145.00: Boundary Embedding (EMB-VH-013)
     Hour 148.00: Revision (infrastructure_investment)
     Hour 148.50: Revision Embedding (EMB-VH-018)
  📊 Cycle Duration: 3.80 hours
  🎯 Resolved: Battery expansion enables higher renewable penetration and achieves carbon footprint targets.

Cycle 5: Certification renewal due
  ⏰ Timeline:
     Hour 228.60: Boundary (escalated) by CertificationMonitor
     Hour 229.00: Boundary Embedding (EMB-VH-017)
     Hour 230.10: Decision (undefined) by David Park
     Hour 232.00: Revision (process_automation)
     Hour 232.50: Revision Embedding (EMB-VH-019)
  📊 Cycle Duration: 3.40 hours
  🎯 Resolved: Eliminate last-minute certification lapses by proactive scheduling and documentation preparation.

👥 ACTOR ANALYSIS
────────────────────────────────────────────────────────────
Most Active Actors:
  Marcus Johnson                  7 events: envelope_promoted(1), decision(1), embedding(3), revision(2)
  Ana Martinez                    7 events: decision(1), embedding(4), revision(2)
  David Park                      5 events: envelope_promoted(1), decision(1), embedding(2), revision(1)
  QualityInspector                5 events: retrieval(1), boundary_interaction(1), embedding(2), decision(1)
  Dr. Sarah Chen                  3 events: envelope_promoted(1), dsg_session(1), embedding(1)
  YieldPredictor                  3 events: decision(1), embedding(1), signal(1)
  ClimateController               3 events: retrieval(1), boundary_interaction(1), embedding(1)
  CarbonTracker                   3 events: retrieval(1), boundary_interaction(1), embedding(1)
  LightingOptimizer               2 events: decision(1), embedding(1)
  NutrientBalancer                2 events: decision(1), embedding(1)

📦 ENVELOPE TIMELINE & VERSIONING VALIDATION
────────────────────────────────────────────────────────────
ENV-VH-001: Crop Growth Optimization
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v2: Hour 0-96 (96.00h duration)
  v3: Hour 120-240 (120.00h duration)
    ℹ️  GAP: 24 hours between v2 and v3
  ⚠️  Multiple windows but NO revision events

ENV-VH-002: Environmental Control Systems
  v3: Hour 0-240 (240.00h duration)
  Revisions: 2
    - Hour 22: v? (HVAC preventive maintenance schedule updated)
    - Hour 172: v? (Microgreens lighting updated)

ENV-VH-003: Water & Nutrient Management
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v2: Hour 0-84 (84.00h duration)
  v3: Hour 96-240 (144.00h duration)
    ℹ️  GAP: 12 hours between v2 and v3
  Revisions: 2
    - Hour 52: v? (Biocontrol release protocol automated)
    - Hour 108: v? (Calcium supplementation added)

ENV-VH-004: Harvest & Quality Assurance
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v1: Hour 12-108 (96.00h duration)
  v2: Hour 144-228 (84.00h duration)
    ℹ️  GAP: 36 hours between v1 and v2
  ⚠️  Multiple windows but NO revision events

ENV-VH-005: Energy & Sustainability
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v1: Hour 0-96 (96.00h duration)
  v2: Hour 120-240 (120.00h duration)
    ℹ️  GAP: 24 hours between v1 and v2
  Revisions: 1
    - Hour 148: v? (Battery storage expansion approved)

ENV-VH-006: Food Safety & Compliance
  ℹ️  MULTI-WINDOW ENVELOPE: 2 activation windows
  v1: Hour 24-108 (84.00h duration)
  v2: Hour 132-240 (108.00h duration)
    ℹ️  GAP: 24 hours between v1 and v2
  Revisions: 1
    - Hour 232: v? (Certification renewal calendar automated)

🌊 PARTICLE FLOW PATTERNS
────────────────────────────────────────────────────────────
Expected Particle Behaviors:

SIGNAL (8 events)
  Source: External → Envelope
  Behavior: Curves down, fades immediately

DECISION (ALLOWED) (10 events)
  Source: Agent → Envelope
  Behavior: Curves to envelope, orbits (18 ticks)

DECISION (DENIED) (0 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, PULSES (3x), continues to steward

BOUNDARY_INTERACTION (5 events)
  Source: Agent → Envelope → Steward
  Behavior: Curves to envelope, pulses (0.5s), continues to steward, ORBITS steward
    - Hour 18.7: ClimateController → escalated (orbit: 83 ticks)
    - Hour 48.8: pHController → undefined (orbit: 80 ticks)
    - Hour 102.4: QualityInspector → escalated (orbit: 140 ticks)
    - Hour 144.2: CarbonTracker → escalated (orbit: 95 ticks)
    - Hour 228.6: CertificationMonitor → escalated (orbit: 85 ticks)

REVISION (6 events)
  Source: Steward → Envelope
  Behavior: Curves from steward (lower arc), fades at envelope

RETRIEVAL (4 events)
  Source: Embedding Store → Agent
  Behavior: Dotted curve from embedding store, fades at agent
    - Hour 18.5: ClimateController retrieves 1 embeddings (top: 93%)
    - Hour 48.6: PestMonitor retrieves 2 embeddings (top: 91%)
    - Hour 102.2: QualityInspector retrieves 1 embeddings (top: 89%)
    - Hour 144: CarbonTracker retrieves 1 embeddings (top: 90%)


🔍 PARTICLE FLOW VALIDATION (Visual Correctness)
────────────────────────────────────────────────────────────
Found 1 particle flow issues

ERROR (1):
  ❌ Boundary at hour 48.8 missing required boundary_kind field (escalated/deferred/overridden)


🧠 SEMANTIC COHERENCE & LEARNING
────────────────────────────────────────────────────────────
Embeddings with semantic vectors: 23/23
Semantic diversity: 65% (vectors spread across quadrants)

Retrieval-Query Alignment:
  Retrievals with queries: 4/4

Relevance Score Analysis:
  Average relevance: 90%
  Perfect scores (≥95%): 0%

⚠️  Found 5 semantic issues


🔄 FEEDBACK LOOP EFFECTIVENESS
────────────────────────────────────────────────────────────
Revision-Boundary Alignment: 3/5 revisions semantically address their boundaries
Learning Evidence: 0/7 revision embeddings retrieved in future decisions
Recurring Boundary Patterns: 0 boundary types occur multiple times

⚠️  Found 3 effectiveness issues


⏱️  TEMPORAL REALISM
────────────────────────────────────────────────────────────
Embedding Delays: 23/23 have realistic timing (0.2-2h after source)
Retrieval-to-Action Timing: 3/3 have realistic gap (0.05-0.7h)

Decision Latency Patterns:
  Escalated decisions: 3
  Routine decisions: 7
  Note: Escalated decisions should show deliberation time

✅ Temporal patterns appear realistic


👤 ACTOR BEHAVIOR PATTERNS
────────────────────────────────────────────────────────────
Agent Specialization: 0 events where agents operated outside their designated envelopes

Decision Patterns:

Retrieval Usage:
  2 agents make complex decisions without using retrieval

⚠️  Found 2 behavior pattern issues


⚠️  POTENTIAL ISSUES & IMPROVEMENTS
────────────────────────────────────────────────────────────

WARNING (34):
  ⚠️ Retrieval at hour 18.5: High relevance (93%) but low query-context overlap for EMB-VH-001
  ⚠️ Retrieval at hour 48.6: High relevance (91%) but low query-context overlap for EMB-VH-002
  ⚠️ Retrieval at hour 48.6: High relevance (87%) but low query-context overlap for EMB-VH-003
  ⚠️ Retrieval at hour 102.2: High relevance (89%) but low query-context overlap for EMB-VH-005
  ⚠️ Retrieval at hour 144: High relevance (90%) but low query-context overlap for EMB-VH-007
  ... and 29 more

SUGGESTION (4):
  ℹ️ Marcus Johnson makes complex decisions but never retrieves context - consider adding retrieval for realism
  ℹ️ Ana Martinez makes complex decisions but never retrieves context - consider adding retrieval for realism
  ℹ️ Boundary at hour 48.8 by pHController lacks preceding retrieval (shows agent "thinking")
  ℹ️ Boundary at hour 228.6 by CertificationMonitor lacks preceding retrieval (shows agent "thinking")

INFO (11):
  ℹ️ ENV-VH-001 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-VH-001 inactive for 24h between windows (hour 96-120)
  ℹ️ ENV-VH-003 has 2 activation windows (same envelopeId appears multiple times)
  ℹ️ ENV-VH-003 inactive for 12h between windows (hour 84-96)
  ℹ️ ENV-VH-004 has 2 activation windows (same envelopeId appears multiple times)
  ... and 6 more


📋 SUMMARY METRICS
────────────────────────────────────────────────────────────

Closed Loop Compliance:
  ✅ Revisions with embeddings      6/6 [REQUIRED]
  ✅ Boundaries with embeddings     5/5 [REQUIRED]
  ✅ Time paradoxes                 0 [REQUIRED]
  ⚠️ Boundaries with retrieval      3/5 [RECOMMENDED]

Particle Flow Validation:
  ❌ Missing boundary_kind          1
  ✅ Missing agent lookups          0
  ✅ Missing envelope targets       0
  ✅ Unresolved boundaries          0

Semantic Coherence:
  ✅ Semantic vector validity       0
  ✅ Semantic diversity             Validated
  ✅ Historical baseline usage      None

Feedback Effectiveness:
  ⚠️ Revision-boundary alignment    3/5
  ⚠️ Learning evidence              0/7 reused

Temporal Realism:
  ✅ Embedding timing               23/23 realistic
  ✅ Retrieval-to-action gaps       3/3 realistic

Actor Behavior:
  ✅ Agent scope violations         0
  ✅ Decision variety               Validated

Scenario Health:
   Total events                   61
   Event types                    8
   Complete feedback cycles       5/5
   Historical baseline events     0

Identified Issues:
  ✅ Errors                         0
  ⚠️ Warnings                       34
   Suggestions                    4
   Info                           11


═══════════════════════════════════════════════════════════
ANALYSIS COMPLETE
═══════════════════════════════════════════════════════════
```

---

## Notes
- This report captures raw analyzer console output per scenario.
- Re-run a single scenario with: node ./analysis/scenario-analysis.mjs <scenario-name>

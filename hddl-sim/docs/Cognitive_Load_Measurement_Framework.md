# Cognitive Load Measurement Framework for HDDL Visualization

**Purpose:** Validate that UX design demonstrates **system reality** (high agent activity) while proving **steward manageability** (patterns are discoverable, work is sustainable).

**Date:** December 29, 2025  
**Status:** Proposed Framework

---

# Cognitive Load Framework for HDDL Visualization

**Two contexts, two UX strategies:**
1. **Simulation Map** (current) - Show system reality to demonstrate HDDL
2. **Interactive View** (future) - Focused workspace for daily stewardship

---

## Context 1: Simulation Map (Current)

**Purpose:** Demonstrate that HDDL scales through realistic scenario replay

**UX Strategy:**
- Show full system activity (multiple agents, concurrent decisions, feedback loops)
- High information density proves "this is what production looks like"
- Provide tools to inspect/filter without hiding complexity
- Optimize for understanding, not daily operations

**Success Metrics:**
- Pattern recognition: Can viewers trace a boundary → decision → revision cycle?
- Comprehension: Do stakeholders understand how HDDL works?
- Belief: Do they believe governance can scale?

---

## Context 2: Interactive View (Future)

**Purpose:** Enable efficient daily stewardship work on live systems

**UX Strategy:**
- Filter to relevant context (my envelopes, recent escalations)
- Alert-based attention (show only what needs action)
- Optimize for rapid intervention (< 60 sec per escalation)
- Preserve context across sessions (saved views, timeline position)

**Success Metrics:**
- Workflow efficiency: Daily check-in < 5 minutes
- Response time: Escalation to decision < 60 seconds
- Sustainability: Stewards can maintain pace without burnout

---

## Design Principles

### Simulation Map
- **Show, don't hide** - Complexity demonstrates system capability
- **Make patterns visible** - Visual hierarchy highlights feedback loops
- **Enable inspection** - Hover/click for details without losing context
- **Support learning** - Tooltips, tours, documentation links

### Interactive View
- **Focus, don't overwhelm** - Show only actionable information
- **Prioritize alerts** - Critical > warning > info
- **Minimize friction** - Common tasks in < 3 clicks
- **Remember context** - Don't make stewards re-navigate each session

---

## Current Implementation (Simulation Map)

**Adaptive Detail Levels:**
- FULL (>1000px): All labels, embedding space, full particle labels
- STANDARD (600-1000px): Abbreviated labels, simplified embedding
- COMPACT (400-600px): Icons only, status indicators
- MINIMAL (<400px): Essential status, no particles

**Interaction Model:**
- Timeline scrubbing (explore temporal patterns)
- Steward filtering (focus on domain)
- Hover tooltips (inspect without clicking)
- Click events → detail views

---

## Measurement Approach

### What We'll Measure

**Simulation Map:**
- Element count by detail level (how much are we showing?)
- Pattern discoverability (can users find the escalation?)
- Comprehension accuracy (do they understand feedback loops?)

**Interactive View (future):**
- Alert volume (how many interruptions?)
- Workflow clicks (how many steps per task?)
- Session duration (how long is daily check-in?)

### How We'll Measure

1. **Automated metrics** - Build analysis tool to count elements, animations, densities
2. **Task testing** - Give users specific questions, measure accuracy + time
3. **Subjective feedback** - Simple surveys: "I understand this" (1-10 scale)

---

## Next Steps

**Phase 1: Validate Simulation Map** (current focus)
- Build measurement tool for element counting
- Test pattern recognition with scenarios
- Iterate based on feedback

**Phase 2: Design Interactive View** (future)
- Define steward workflows
- Sketch alert hierarchy
- Prototype focused dashboard

**Phase 3: Build Interactively** (future)
- Implement alert system
- Build quick-action workflows
- Test operational sustainability

---

## Key Insight

The simulation map is a **flight simulator** - it teaches how HDDL works by showing full complexity.

The interactive view will be an **autopilot alert system** - it enables daily work by showing only what needs human attention.

Different tools for different jobs.

---

## Measurable Cognitive Load Factors

### For Simulation Map (Current)

### 1. Information Density Metrics

**Visual Element Count (per viewport)**
```javascript
// Automated measurement
{
  particles: count of visible particles at current time,
  nodes: {
    agents: count,
    envelopes: count,
    stewards: count,
    embeddings: count visible in embedding space
  },
  labels: {
    particle_labels: count of rendered text labels,
    node_labels: count of node names shown,
    tooltips_available: count of hover-accessible details
  },
  animations: {
    orbiting_particles: count of particles in orbit state,
    transitioning_particles: count in travel state,
    simultaneous_movements: max concurrent animations
  }
}
```

**Thresholds (REVISED for demonstration purpose):**
- **< 7 items:** Too simple, doesn't demonstrate system scale
- **7-15 items:** Shows basic activity, not realistic
- **15-30 items:** REALISTIC system activity (target for FULL mode)
- **30-50 items:** HIGH activity, requires excellent visual hierarchy
- **> 50 items:** Peak load, must rely on chunking/grouping/filtering

**Key Insight:** We WANT 30-50 elements visible in FULL mode to demonstrate reality. The question is: "Can stewards still find patterns and intervene effectively?"

**Current Implementation Strategy:**
- **FULL mode:** Show full system complexity (30-50 elements) with robust hierarchy
  - Purpose: Demonstrate "This is what production looks like, AND it's manageable"
- **STANDARD mode:** Moderate filtering (20-30 elements) for focused work
  - Purpose: Daily stewardship, reducing visual noise for specific tasks
- **COMPACT mode:** Heavy filtering (10-15 elements) for quick checks
  - Purpose: Mobile view, status checks, lightweight monitoring
- **MINIMAL mode:** Essential status only (< 10 elements)
  - Purpose: Widget views, embedded contexts

**Measurement Tool:** Create `cognitive-load-metrics.mjs` to measure:
1. Raw element count (demonstrates system scale)
2. Pattern visibility (proves manageability)
3. Task completion accuracy (validates effectiveness)

---

### 2. Visual Search Efficiency

**Task Completion Time**
```javascript
{
  task: "Find boundary interaction for FraudDetector at hour 12.4",
  trials: 10,
  measurements: {
    avg_time_full: 2.3, // seconds
    avg_time_standard: 1.8,
    avg_time_compact: 3.5,
    avg_time_minimal: 5.2
  },
  conclusion: "STANDARD mode optimal for visual search"
}
```

**Metrics:**
- Time to locate specific particle type
- Time to identify steward for envelope
- Time to trace particle source → destination
- Errors: clicking wrong element

**Automation:** Playwright test that simulates search tasks, measures interaction delays.

---

### 3. Split Attention Effect

**Definition:** Cognitive load increases when information is spatially separated.

**HDDL-Specific Issues:**
- Particle label far from particle (especially at small scales)
- Envelope version info separate from envelope node
- Embedding 3D space disconnected from agent nodes
- Timeline scrubber separate from visual elements

**Measurement:**
```javascript
{
  spatial_proximity: {
    particle_to_label: avg_distance_pixels,
    agent_to_envelope: avg_distance_pixels,
    embedding_to_agent: avg_distance_pixels
  },
  gaze_switches: { // if eye tracking available
    avg_per_task: count,
    min_distance_traveled: pixels
  }
}
```

**Threshold:** Elements > 100px apart require eye movement, increasing cognitive load.

---

### 4. Temporal Coherence (Animation Overload)

**Simultaneous Animation Budget**
```javascript
{
  concurrent_pREVISED for demonstration):**
- **< 3 concurrent:** Unrealistic, doesn't show system activity
- **3-8 concurrent:** REALISTIC production activity (target)
- **8-15 concurrent:** HIGH activity, requires spatial separation + motion hierarchy
- **> 15 concurrent:** Peak load, requires particle grouping or temporal spreading

**Key Insight:** We WANT to show 3-8 concurrent particles to demonstrate fleet activity. The question is: "Can stewards still track individual particles and notice patterns?"

**Current Challenge:** Insurance scenario has 17 events in hours 0-12. This is GOOD (shows realistic activity), but requires:
1. **Spatial separation:** Particles should flow from distinct source locations
2. **Motion hierarchy:** Different speeds for different priorities (boundary interactions slower?)
3. **Visual grouping:** Similar particles (e.g., multiple decisions from same agent) could cluster
4. **Playback control:** Stewards can pause/slow when needed

**Solution Validation:**
- Measure pattern recognition accuracy at different densities
- Test: "Can you identify which agent triggered escalation?" at 8 concurrent particles
- Validate: Spatial separation prevents tracking conflicts
- NOT: Auto-slow playback (removes realism), INSTEAD: Give stewards pause control
- **< 3 concurrent:** Easy to track
- **3-5 concurrent:** Manageable with spatial separation
- **> 5 concurrent:** Overwhelming, user loses focus

**Current Risk:** Insurance scenario has 17 events in hours 0-12. If playback speed too fast, cognitive overload.

**Solution Validation:**
- Measure playback speed vs particle count
- Auto-slow playback when > 5 particles on screen?
- Particle grouping/merging at high densities?

---

### 5. Visual Hierarchy & Preattentive Processing

**Perceptual Salience Score** (what catches attention first)
```javascript
{
  color_distinctiveness: {
    steward_colors: [0.8, 0.7, 0.75, 0.9], // semver distance
    particle_colors: [0.6, 0.5, 0.7], // by event type
    avg_distinguishability: 0.72 // > 0.6 is good
  },
  size_variation: {
    nodes: { min: 8px, max: 45px, ratio: 5.6 }, // good
    particles: { min: 4px, max: 4px, ratio: 1.0 }, // poor - all same size
    text: { min: 10px, max: 16px, ratio: 1.6 } // reasonable
  },
  motion_salience: {
    orbit_speed: 0.11, // radians/tick
    travel_speed: 0.011, // t/tick
    pulse_frequency: 3 // per 12 ticks
  }
}
```

**Recommendations:**
- High-priority particles (boundary interactions) should be larger/brighter
- Critical stewards should have higher contrast
- Reduce motion for background particles?

---

### 6. Modal Complexity (Detail Disclosure)

**REVISED Strategy for HDDL:**
- **FULL mode:** Show more context upfront to prove system transparency
  - Particle labels visible during orbit (shows what steward is reviewing)
  - Embedding space visible (proves decision memory is active)
  - Purpose: "Look how much is happening, AND you can see it all"
  
- **STANDARD mode:** Balanced disclosure (labels on hover)
  - Reduces clutter for focused tasks
  - Still demonstrates system scale through node count/particle count
  
- **COMPACT/MINIMAL:** Heavy progressive disclosure
  - Status indicators only
  - Hover for details

**Key Questions:**
```javascript
{
  always_visible_text_elements: 32, // FULL mode
  hover_activated_elements: 18,
  click_activated_panels: 4,
  
  questions: [
    "Do visible labels help pattern recognition, or just add noise?",
    "Can stewards distinguish 8 concurrent particles WITH labels?",
    "Does embedding space visibility help or distract during particle tracking?"
  ],
  
  recommendation: "A/B test: labels always visible vs hover-only at FULL mode
**Measurement:**
```javascript
{
  always_visible_text_elements: 32, // FULL mode
  hover_activated_elements: 18,
  click_activated_panels: 4,
  
  recommendation: "Move particle labels to Layer 1 (hover only)"
}
```

---

### 7. Steward Task-Specific Metrics

**Domain Alignment Score** (does visualization match steward mental model?)

```javascript
{
  tasks: [
    {
      name: "Identify escalation patterns",
      current_difficulty: "medium", // 3/5
      expected_flow: "filter by steward → scrub timeline → watch boundary interactions",
      actual_flow: "scrub timeline → filter → re-scrub → notice pattern",
      friction_points: ["filter clears timeline position", "no pattern highlighting"],
      cognitive_load_rating: 3.5
    },
    {
      name: "Trace decision memory retrieval",
      current_difficulty: "low", // 2/5
      expected_flow: "see retrieval particle → identify embeddings → trace to decision",
      actual_flow: "matches expectation",
      friction_points: ["embedding IDs not hoverable in particle label"],
      cognitive_load_rating: 2.0
    },
    {
      name: "Understand envelope evolution",
      current_difficulty: "high", // 4/5
      expected_flow: "see envelope versions in timeline",
      actual_flow: "manually scrub + remember previous states",
      friction_points: ["no envelope version timeline", "gap periods confusing"],
      cognitive_load_rating: 4.2
    }
  ]
}
```

**Rating Scale:** 1 (effortless) to 5 (very difficult)  
**Target:** All common tasks < 3.0

---

## Automated Measurement Tools

### Tool 1: `cognitive-load-metrics.mjs`

**Purpose:** Measure information density at each detail level

```javascript
// Run against any scenario
node hddl-sim/analysis/cognitive-load-metrics.mjs insurance-underwriting

// Output:
// COGNITIVE LOAD ANALYSIS: insurance-underwriting
// 
// INFORMATION DENSITY (by detail level)
// FULL mode (width: 1200px)
//   Visible particles (avg): 4.2
//   Visible labels: 48
//   Nodes: 24 (12 agents, 4 envelopes, 4 stewards, 4 embedding clusters)
//   Cognitive Load Score: 76/100 (MODERATE)
//
// STANDARD mode (width: 800px)  
//   Visible particles (avg): 3.8
//   Visible labels: 28
//   Nodes: 24
//   Cognitive Load Score: 52/100 (LOW-MODERATE)
//
// COMPACT mode (width: 500px)
//   Visible particles (avg): 1.2
//   Visible labels: 8
//   Nodes: 24 (icons only)
//   Cognitive Load Score: 28/100 (LOW)
```

### Tool 2: Playwright Visual Complexity Tests

```javascript
// tests/cognitive-load.spec.js
test('particle count stays under threshold during peak hours', async ({ page }) => {
  await page.goto('/')
  await page.selectOption('#scenario-select', 'insurance-underwriting')
  
  // Navigate to peak density hour (0-12 has 17 events)
  await page.click('[data-hour="6"]')
  
  // Count visible particles
  const particleCount = await page.locator('g.particle[opacity="1"]').count()
  expect(particleCount).toBeLessThan(8) // Working memory threshold
})

test('text labels readable at STANDARD detail', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 })
  await page.goto('/')
  
  // Check font size is within readable range
  const fontSize = await page.locator('.label-main').first().evaluate(el => 
    window.getComputedStyle(el).fontSize
  )
  expect(parseInt(fontSize)).toBeGreaterThanOrEqual(11) // Min legibility
})
```

### Tool 3: Heatmap of Visual Attention

**Simulated Attention Model** (based on saliency research)

```javascript
// Generate attention heatmap
{
  high_attention: ["orbiting particles", "pulse animations", "steward nodes"],
  medium_attention: ["envelope nodes", "agent nodes", "static labels"],
  low_attention: ["embedding space (when static)", "timeline ruler"],
  
  overlap_conflicts: [
    "particle labels overlap with agent labels at FULL mode",
    "multiple particles orbit same steward simultaneously"
  ]
}
```

---

## Validation Experiments

### Experiment 1: Detail Level Comparison

**Hypothesis:** STANDARD mode reduces cognitive load vs FULL without losing pattern visibility.

**Method:**
1. Give 10 stewards same scenario
2. Randomly assign FULL or STANDARD mode
3. Ask identical questions:
   - "How many boundary interactions occurred?"
   - "Which agent triggered the most escalations?"
   - "When did the fraud detector first escalate?"
4. Measure: accuracy + response time + NASA-TLX survey

**Success Criteria:**
- STANDARD mode: 90%+ accuracy (vs FULL)
- STANDARD mode: ≤ 20% longer response time
- STANDARD mode: Lower NASA-TLX mental demand score

### Experiment 2: Animation Speed Calibration

**Hypothesis:** Slower playback at high particle density reduces errors.

**Method:**
1. Vary playback speed: 1x, 2x, 4x
2. Ask users to count specific part (REVISED)

### Demonstration Goals (Show System Reality)

| Metric | Target | Current (est) | Status |
|--------|--------|---------------|--------|
| Visible elements (FULL) | 30-50 | ~70 | ⚠️ Refine hierarchy |
| Concurrent animations (peak) | 5-10 | 3-8 | ✅ Realistic |
| Event density (per hour) | 10-20 | 17 (peak) | ✅ Good demo |
| Particle types shown | All 6 | All 6 | ✅ Complete |
| Fleet visibility | All agents | All 12 | ✅ Shows scale |

### Manageability Goals (Prove Steward Effectiveness)

| Metric | Target | Current (est) | Status |
|--------|--------|---------------|--------|
| Pattern recognition accuracy | > 90% | Unknown | 🔬 Measure |
| Task completion time | < 10 sec | Unknown | 🔬 Measure |
| Error rate (identify event) | < 15% | Unknown | 🔬 Measure |
| NASA-TLX Mental Demand | < 60/100 | Unknown | 🔬 Measure |
| Subjective confidence | > 7/10 | Unknown | 🔬 Measure |

### Key Insight on Targets

**OLD thinking:** "Mental Demand < 50/100" (minimize cognitive load)  
**NEW thinking:** "Mental Demand 50-60/100" (show realistic complexity while proving manageability)

We WANT stewards to feel engaged/challenged, not bored. The question is whether they feel:
- **Productive challenge** (good): "This is complex but I can handle it"
- **Overwhelming chaos** (bad): "I can't keep track of what's happening"
**A/B Test:**
- Version A: Labels always visible (current FULL mode)
- VersA/B test: particle labels always visible vs hover-only in FULL mode
- [ ] Add visual hierarchy: larger particles for boundary_interactions (higher priority)
- [ ] Improve spatial separation: ensure concurrent particles have distinct flow paths
- [ ] Add "pause on hover" for particle inspection without losing timeline position
- [ ] Test identify specific particle
- Subjective clutter rating (1-5 scale)
- Missed information (did they notice important particles?)

---

## Recommended Thresholds & Targets

| Metric | Target | Current (est) | Status |
|--------|--------|---------------|--------|
| Visible elements (FULL) | < 50 | ~70 | ⚠️ Reduce |
| Visible elements (STANDARD) | < 30 | ~35 | ✅ Good |
| Concurrent animations | < 5 | 3-8 (peak) | ⚠️ Variable |
| Text size (min) | ≥ 11px | 10-14px | ✅ Meets min |
| Particle label visibility | Hover only | Always on | ❌ Change |
| Task completion (avg) | < 5 sec | Unknown | 🔬 Measure |
| NASA-TLX Mental Demand | < 50/100 | Unknown | 🔬 Measure |
| Error rate (identify event) | < 10% | Unknown | 🔬 Measure |

---

## Implementation Roadmap

### Phase 1: Measurement (Week 1)
- [ ] Create `cognitive-load-metrics.mjs` analysis tool
- [ ] Add Playwright visual complexity tests
- [ ] Instrument actual usage with telemetry (if feasible)
- [ ] Baseline measurements for insurance scenario at each detail level

### Phase 2: Quick Wins (Week 2)
- [ ] Move particle labels to hover-only in FULL mode
- [ ] Add auto-slowdown when > 5 particles on screen
- [ ] Increase particle size for boundary_interactions (higher priority)
- [ ] Add particle grouping indicator when multiple at same location

### Phase 3: Validation (Week 3)
- [ ] Run A/B tests with target users (stewards or proxies)
- [ ] Collect NASA-TLX survey data
- [ ] Time task completion for common scenarios
- [ ] Iterate based on results

### Phase 4: Advanced (Future)
- [ ] Attention-based highlighting (emphasize what user is searching for)
- [ ] Cognitive load-aware auto detail switching (not just width-based)
- [ ] Particle trail history (reduce memory burden)
- [ ] Pattern recognition hints (ML-detected frequent paths)

---

## References

**Cognitive Load Theory:**
- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning
- Chandler, P. & Sweller, J. (1991). Cognitive Load Theory and the Format of Instruction
- Mayer, R. (2002). Multimedia Learning

**Information Visualization:**
- Ware, C. (2012). Information Visualization: Perception for Design
- Few, S. (2009). Now You See It: Simple Visualization Techniques for Quantitative Analysis
- Tufte, E. (2001). Demonstrate 30-50 active elements while achieving > 90% pattern recognition accuracy and subjective confidence > 7/10

---

## Stakeholder Communication Strategy

### For Simulation Map (Current)

**Technical Audiences:**  
"The simulation shows realistic agent fleet activity (12 agents, 8 concurrent decisions at peak) while proving stewards can identify patterns, trace escalations, and understand feedback loops. This is an educational tool demonstrating HDDL spec behavior."

**Business Audiences:**  
"This visualization proves HDDL scales. You're seeing dozens of AI agents making hundreds of decisions. The replay shows how governance works, how stewards intervene, and how the system learns from human judgment."

**Skeptics:**  
"Yes, it looks busy - that's production reality with 12 AI agents. Now watch: [filter by steward] - see how Rebecca focuses only on risk assessment? [scrub to boundary interaction] - see how escalations are highlighted? This demonstrates complexity is MANAGEABLE, not overwhelming."

---

### For Interactive View (Future)

**Operational Stewards:**  
"Your daily dashboard shows only YOUR envelopes and active escalations. You check in 2-3x/day for 5 minutes. Alerts bring you directly to events needing your attention. Revising envelopes takes 3 clicks. The simulation map is for learning - this is for working."

**Engineering Teams:**  
"The interactive view is the operational interface. Stewards aren't watching replays - they're responding to alerts, annotating decisions, and revising envelopes in real-time. This is the production tool, not the demo."

**Compliance/Audit:**  
"Stewards use the interactive view for daily work. The simulation map serves as the audit trail - you can replay any time window to see what happened, who decided what, and why envelopes changed. Both views access the same decision telemetry."

**UX Metrics:**
- Hart, S. G. (2006). NASA-Task Load Index (TLX): 20 Years Later
- Longo, L. (2018). Experienced Mental Workload, Perception of Usability
- Palmer, S. (1999). Vision Science: Photons to Phenomenology

---

## Next Steps

1. **Create measurement tools** (cognitive-load-metrics.mjs)
2. **Establish baselines** for insurance scenario
3. **Run quick-win experiments** (hover labels, auto-slowdown)
4. **Validate with users** (even 5 users = 85% of issues found, Nielsen)
5. **Iterate and document** findings in this framework

**Owner:** UX team  
**Timeline:** 3 weeks for phases 1-3  
**Success Metric:** Reduce cognitive load scores by 30% while maintaining pattern discovery accuracy

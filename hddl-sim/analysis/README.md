# HDDL Analysis Tools

This directory contains analysis tools for HDDL scenarios and the visualization system. These tools are measurement instruments that output structured data to the console.

## Available Tools

### 1. Scenario Analysis
**File:** `scenario-analysis.mjs`  
**Purpose:** Validates scenario structure, temporal patterns, and feedback loops

```bash
node ./analysis/scenario-analysis.mjs <scenario-name>
```

**Outputs:**
- Scenario structure validation
- Temporal pattern analysis
- Feedback loop detection
- Particle flow validation (visual requirements)
- Actor/envelope/event relationships

### 2. Cognitive Load Metrics
**File:** `cognitive-load-metrics.mjs`  
**Purpose:** Measures UX information design complexity

```bash
npm run cognitive-load <scenario-name>
# or
node ./analysis/cognitive-load-metrics.mjs <scenario-name>
```

**Outputs:**
- Information density (element counts by detail level)
- Pattern complexity (feedback cycle visibility)
- Concurrent particle load (animation complexity)
- Interaction complexity (hover/click targets)

### 3. Performance Metrics
**File:** `performance-metrics.mjs`  
**Purpose:** Measures browser rendering performance

```bash
npm run performance [scenario-name]
# or
node ./analysis/performance-metrics.mjs [scenario-name]
```

**Default scenario:** `test-minimal` (fast, predictable baseline)

**Requires:** Dev server running at `http://localhost:5173` (or specify URL as second argument)

**Outputs:**
- Initial Load Time
- First Contentful Paint (FCP)
- FPS during animation (Avg/Min/Max, 150 samples)
- JS Heap Memory usage
- SVG complexity (DOM node count, path segments)

**Example:**
```bash
# Start dev server (in one terminal)
npm run dev

# Run performance test (in another terminal)
npm run performance insurance-underwriting
```

### 4. Performance Test Suite
**File:** `../scripts/run-perf-suite.mjs`  
**Purpose:** Runs performance tests 5 times with statistical analysis

```bash
npm run performance:suite
# or
node ./scripts/run-perf-suite.mjs
```

**Requires:** Dev server running at `http://localhost:5173`

**Outputs:**
- 5 test runs with full metrics
- Mean and standard deviation for all metrics
- JSON results saved to `analysis/perf-runs/perf-results.json`

**Interpreting Results:**
- **Load Time:** Time until page is fully loaded and interactive
- **First Contentful Paint (FCP):** Time until first visual content appears
- **Avg FPS:** Average frames per second during animation (target >30)
- **Min FPS:** Lowest FPS observed (indicates worst-case performance)
- **Max FPS:** Highest FPS observed (typically 60-120 Hz depending on monitor)
- **Standard Deviation (±):** Consistency measure; lower is better

**Variance Analysis:**
- High variance (±100ms+) indicates inconsistent performance
- External monitors, GPU state, and background processes affect variance
- Focus on reducing variance for predictable user experience
- Changes that reduce variance are valuable even without speed gains

## Creating Analysis Reports

When synthesizing tool output into markdown reports:

1. **Run the appropriate tools** based on what's being analyzed:
   - Scenario quality → `scenario-analysis.mjs`
   - UX complexity → `cognitive-load-metrics.mjs`
   - Performance → `performance-metrics.mjs`
   - Complete analysis → all three

2. **Capture tool output** and synthesize into markdown report

3. **Structure the report:**
   - Executive summary with key findings
   - Metrics tables from tool outputs
   - Analysis sections (structure, patterns, performance)
   - Recommendations for improvement

4. **Save to:** `analysis/<Scenario>_Analysis.md`

**Example Reports:**
- [Insurance_Scenario_Deep_Dive.md](./Insurance_Scenario_Deep_Dive.md)
- [Performance_Optimization_Opportunities.md](./Performance_Optimization_Opportunities.md)

## Performance Testing Workflow

### Quick Performance Check
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Single run
npm run performance
```

### Baseline Establishment
```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: 5-run statistical baseline
npm run performance:suite
```

Results saved to `analysis/perf-runs/perf-results.json` (gitignored)

### Testing Optimizations
1. Run baseline with 5 iterations: `npm run performance:suite`
2. Implement optimization in code
3. Run 5 more iterations: `npm run performance:suite`
4. Compare means and standard deviations
5. Look for:
   - Reduced variance (improved consistency)
   - Improved min FPS (better worst-case)
   - Lower load time (faster initial render)

**Important:** Variance reduction often more valuable than raw speed gains.

### Complex Scenario Testing
```bash
# Test with high particle count
npm run performance insurance-underwriting

# Or with 5-run suite (modify run-perf-suite.mjs scenario)
# Edit line 25: const proc = spawn('node', ['./analysis/performance-metrics.mjs', 'insurance-underwriting'], ...
npm run performance:suite
```

## Output Directory Structure

```
analysis/
├── README.md                           # This file
├── scenario-analysis.mjs               # Scenario validation tool
├── cognitive-load-metrics.mjs          # UX complexity tool
├── performance-metrics.mjs             # Performance measurement tool
├── perf-runs/                          # Performance test results (gitignored)
│   └── perf-results.json              # Latest test suite results
├── Insurance_Scenario_Deep_Dive.md     # Example analysis report
└── Performance_Optimization_Opportunities.md  # Performance optimization documentation
```

## Tool Design Principles

### Separation of Concerns
- **Don't** add FPS measurement to `scenario-analysis.mjs`
- **Don't** add closed-loop validation to `cognitive-load-metrics.mjs`
- **Don't** add element counting to `performance-metrics.mjs`

Each tool has a specific purpose and should stay focused.

### Output Expectations
- Console-first output, structured and scannable
- Reasonably short and focused
- End with "what to run next" pointer when helpful

### Reports vs. Tools
- **Tools** output measurements to console
- **Reports** are markdown documents synthesizing tool outputs
- Reports provide context, analysis, and recommendations

## Related Documentation

- [`../tests/README.md`](../tests/README.md) - Testing infrastructure (Playwright, Vitest)
- [`../.github/copilot-instructions.md`](../../.github/copilot-instructions.md) - Development workflow
- [`../docs/PARTICLE_FLOW_RULES.md`](../docs/PARTICLE_FLOW_RULES.md) - Visualization requirements
- [Map_TS_Readiness_Coverage_Log.md](./Map_TS_Readiness_Coverage_Log.md) - Running log of map helper-extraction coverage waves

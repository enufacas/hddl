# Performance Optimization Opportunities (Visual-Neutral)

**Document Purpose:** Identify performance optimizations that don't change what users see, focusing on rendering efficiency, memory usage, and frame rate improvements.

**Last Updated:** 2025-12-29

---

## Baseline Performance (Pre-Optimization)

**Test Date:** 2025-12-29  
**Scenario:** test-minimal (6h, 9 events, 4 particles at hour 3)  
**Environment:** Chromium headless via Playwright  
**Sample Size:** 5 runs, 150 FPS samples per run

| Metric | Mean | StdDev | Min | Max | Target | Status |
|--------|------|--------|-----|-----|--------|--------|
| **Initial Load Time** | 3014ms | ±54ms | 2948ms | 3071ms | <2000ms | ⚠️ SLOW |
| **First Contentful Paint** | 422ms | ±44ms | 356ms | 472ms | <1000ms | ✅ FAST |
| **Average FPS** | 63.3 | ±0.9 | 62.0 | 64.6 | >30fps | ✅ SMOOTH |
| **Min FPS (transient)** | 24.7 | ±3.2 | 21.5 | 28.9 | >30fps | ⚠️ JANK |
| **Max FPS (burst)** | 212.4 | ±34.5 | 163.9 | 250.0 | n/a | - |
| **Memory (JS Heap)** | 16.3 MB | ±0 | 16.3 MB | 16.3 MB | <50MB | ✅ LIGHT |
| **SVG Node Count** | 131 | - | - | - | <1000 | ✅ SIMPLE |

### Key Observations
- **FPS consistency is excellent:** σ = 0.9 fps across 5 runs (1.4% variance)
- **Transient frame drops:** Min FPS dips to ~25fps suggest brief jank during particle spawning or force simulation reheating
- **Load time variance:** ±54ms (1.8% variance) indicates stable measurement environment
- **Memory stability:** Perfect consistency at 16.3 MB suggests no leaks during test window

### Optimization Targets
1. **Primary:** Eliminate transient jank (min FPS <30fps) → Target sustained 60fps
2. **Secondary:** Reduce initial load time from 3014ms → <2000ms
3. **Stretch:** Maintain performance at FULL detail level with complex scenarios (>1000 SVG nodes)

---

## Current Architecture Analysis

### Rendering Pipeline
- **Framework:** D3.js for data binding and SVG manipulation
- **Animation Loop:** `d3.forceSimulation()` with `alphaDecay(0)` → runs continuous `ticked()` function
- **Detail Levels:** 4 responsive breakpoints (FULL/STANDARD/COMPACT/MINIMAL)
- **Layers:** Separate SVG groups for headers, cycles, fleets, links, exceptions, nodes, particles, embeddings

### Performance Characteristics
- **SVG Node Count:** ~500-1000+ nodes depending on scenario complexity
- **Particle Animation:** Real-time bezier curve calculations on every tick
- **Memory:** Embedding chips accumulate over time (never pruned)
- **Repaints:** Full node transforms on every animation frame

---

## High-Impact Optimizations (No Visual Changes)

### 1. **CSS Transform for Node Positioning** ⭐⭐⭐
**Current:** 
```javascript
nodeLayer.selectAll('g.node')
  .attr('transform', d => `translate(${d.x},${d.y})`)
```

**Problem:** Setting SVG `transform` attribute triggers layout recalculation.

**Solution:** Use CSS `transform` with `will-change` hint:
```javascript
nodeLayer.selectAll('g.node')
  .style('transform', d => `translate(${d.x}px,${d.y}px)`)
  .style('will-change', 'transform')
```

**Expected Gain:** 20-30% FPS improvement by using GPU compositing instead of CPU layout.

**Risk:** Low — CSS transforms are well-supported, behavior is identical.

---

### 2. **Memoize Bezier Curve Calculations** ⭐⭐⭐
**Current:**
```javascript
// Inside ticked() - recalculates curve every frame
if (p.curve) {
  p.curve = makeFlowCurve(p.sourceX, p.sourceY, p.targetX, p.targetY, sign)
  const pt = bezierPoint(p.t, p.curve.p0, p.curve.p1, p.curve.p2, p.curve.p3)
}
```

**Problem:** Rebuilding bezier curves every frame for every particle (~50-100 particles).

**Solution:** Only recalculate when endpoints change significantly:
```javascript
const threshold = 2 // pixels
const needsUpdate = !p.curveCache || 
  Math.abs(p.targetX - p.curveCache.targetX) > threshold ||
  Math.abs(p.targetY - p.curveCache.targetY) > threshold

if (needsUpdate) {
  p.curveCache = {
    curve: makeFlowCurve(p.sourceX, p.sourceY, p.targetX, p.targetY, sign),
    targetX: p.targetX,
    targetY: p.targetY
  }
}
const pt = bezierPoint(p.t, p.curveCache.curve.p0, ...)
```

**Expected Gain:** 15-25% CPU reduction in `ticked()`.

**Risk:** Low — threshold-based invalidation prevents visual artifacts.

---

### 3. **Batch DOM Updates with `requestAnimationFrame`** ⭐⭐
**Current:** D3 simulation ticks drive rendering directly.

**Problem:** Simulation may tick faster than display refresh (60fps), causing wasted work.

**Solution:** Decouple simulation from render:
```javascript
let renderScheduled = false

simulation.on('tick', () => {
  // Update data model (cheap)
  updateParticlePositions()
  
  if (!renderScheduled) {
    renderScheduled = true
    requestAnimationFrame(() => {
      applyDOMUpdates() // Expensive DOM work
      renderScheduled = false
    })
  }
})
```

**Expected Gain:** Prevents over-rendering, caps at 60fps even if simulation ticks faster.

**Risk:** Low — standard RAF pattern, no visual changes.

---

### 4. **Virtual Scrolling for Embeddings** ⭐⭐
**Current:** All embedding chips render and persist forever (line 3721).

**Problem:** Memory grows unbounded; scenarios with 50+ embeddings accumulate DOM nodes.

**Solution:** Only render embeddings visible in viewport + small margin:
```javascript
function cullOffscreenEmbeddings() {
  const viewportPadding = 50
  embeddingElements.forEach(e => {
    const inView = 
      e.targetX > -viewportPadding &&
      e.targetX < width + viewportPadding &&
      e.targetY > mapHeight - embeddingHeight - viewportPadding &&
      e.targetY < mapHeight + viewportPadding
    
    e.element.style('display', inView ? null : 'none')
  })
}
```

**Expected Gain:** 10-20MB memory savings on long scenarios; 5-10% FPS on complex scenarios.

**Risk:** Low — embeddings below viewport fold are typically not visible anyway.

---

### 5. **Throttle Particle Label Updates** ⭐
**Current:** Particle labels update text/position every frame.

**Problem:** Text rendering is expensive; labels rarely change content.

**Solution:** Only update label when content changes, not every frame:
```javascript
pEnter.append('text')
  .attr('class', 'particle-label')
  .each(function(d) { this._lastLabel = null }) // Cache

particleSelection.select('.particle-label')
  .each(function(d) {
    const newLabel = getParticleLabel(d)
    if (this._lastLabel !== newLabel) {
      d3.select(this).text(newLabel)
      this._lastLabel = newLabel
    }
  })
```

**Expected Gain:** 5-10% reduction in text rendering cost.

**Risk:** Very low — labels are static for particle lifetime.

---

### 6. **Conditional Detail Level Rendering** ⭐
**Current:** Some elements check `shouldRenderEnvelopeElement()` but still create DOM nodes.

**Problem:** Hidden elements still exist in DOM, consuming memory and layout time.

**Solution:** Use conditional data binding:
```javascript
// Instead of filtering after creation
envShape.filter(d => shouldRenderElement('glow', d.envDims?.density))
  .append('rect').attr('class', 'envelope-glow')

// Filter before binding
const glowData = nodes.filter(d => 
  d.type === 'envelope' && 
  shouldRenderElement('glow', d.envDims?.density)
)
nodeLayer.selectAll('.envelope-glow')
  .data(glowData, d => d.id)
  .join('rect')
  .attr('class', 'envelope-glow')
```

**Expected Gain:** 10-15% fewer DOM nodes at COMPACT/MINIMAL detail levels.

**Risk:** Low — requires careful data join management.

---

### 7. **Reduce Activity Halo Recalculation** ⭐
**Current:**
```javascript
function ticked() {
  const now = Date.now()
  const pulse = 0.5 + 0.5 * Math.sin(now / 260)
  nodeLayer.selectAll('circle.agent-activity-halo')
    .attr('r', d => d?.isRecentlyActive ? (15 + pulse * 4) : 16)
}
```

**Problem:** Recalculating `pulse` and updating every halo radius every frame, even for inactive agents.

**Solution:** Use CSS animation for pulse effect:
```css
@keyframes activity-pulse {
  0%, 100% { r: 15; }
  50% { r: 19; }
}

.agent-activity-halo.active {
  animation: activity-pulse 520ms ease-in-out infinite;
}
```

```javascript
// Only toggle class, not recalculate
nodeLayer.selectAll('circle.agent-activity-halo')
  .classed('active', d => d?.isRecentlyActive)
```

**Expected Gain:** Remove repeated trig calculation; 5-8% CPU in `ticked()`.

**Risk:** Low — CSS animations are GPU-accelerated and smoother.

---

## Medium-Impact Optimizations

### 8. **Debounce Window Resize Recalculations**
**Current:** Detail level recalculation happens synchronously on resize.

**Solution:** Debounce by 150ms to prevent rapid recalcs during drag-resize.

**Expected Gain:** Prevents layout thrashing during window resize.

---

### 9. **Pre-compute Static Paths**
**Current:** Lifecycle loop paths recalculate on every initialization.

**Solution:** Generate once, store as constants if width is fixed for session.

**Expected Gain:** Minor — only affects initial load, not runtime.

---

### 10. **Optimize Tooltip Creation**
**Current:** Multiple tooltip divs may be created across components.

**Solution:** Single shared tooltip element with fast content swapping.

**Expected Gain:** Reduces DOM node count by ~5-10 nodes.

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 hours)
1. CSS transforms for nodes (#1)
2. CSS animation for activity halos (#7)
3. Throttle particle labels (#5)

**Expected Cumulative Gain:** 30-40% FPS improvement

---

### Phase 2: Algorithmic Improvements (2-4 hours)
4. Memoize bezier curves (#2)
5. RAF batching (#3)
6. Virtual embedding culling (#4)

**Expected Cumulative Gain:** +15-20% FPS, -10-20MB memory

---

### Phase 3: Structural Refactors (4-6 hours)
7. Conditional detail rendering (#6)
8. Resize debouncing (#8)
9. Static path caching (#9)

**Expected Cumulative Gain:** +10-15% FPS at lower detail levels

---

## Measurement Plan

### Before/After Metrics
Use `performance-metrics.mjs` to measure:
- **Baseline:** Average FPS, SVG node count, JS heap size
- **After Phase 1:** Target >40 FPS avg (from ~30)
- **After Phase 2:** Target >50 FPS avg
- **After Phase 3:** Target <800 SVG nodes at COMPACT

### Test Scenarios
- `insurance-underwriting` (complex, many events)
- `medical-triage` (high particle density)
- Window resize stress test (rapid 400px ↔ 1200px)

---

## Risks and Mitigations

### CSS Transform Browser Compatibility
**Risk:** Older browsers may not support CSS transforms on SVG.

**Mitigation:** Feature detect and fallback:
```javascript
const useCSSTransform = CSS.supports('transform', 'translate(0, 0)')
```

### Memoization Cache Invalidation
**Risk:** Stale curve cache if drag-and-drop changes node positions.

**Mitigation:** Invalidate cache on dragstart event.

### RAF Timing Issues
**Risk:** Simulation and render out of sync could cause visual stutter.

**Mitigation:** Keep simulation alpha at 0 (pure animation loop, not physics).

---

## Non-Goals (Explicitly Excluded)

- ❌ Changing visual appearance (colors, sizes, animations)
- ❌ Reducing functionality (removing features)
- ❌ WebGL rewrite (out of scope)
- ❌ Web Workers (complexity not justified yet)

---

## Related Documents

- [`performance-metrics.mjs`](./performance-metrics.mjs) — Measurement tool
- [`cognitive-load-metrics.mjs`](./cognitive-load-metrics.mjs) — Information design metrics (separate concern)
- [`hddl-map.js`](../src/components/hddl-map.js) — Primary visualization component
- [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) — Development workflow

---

## Next Steps

1. ✅ Document created
2. ⏳ Run baseline performance metrics
3. ⏳ Implement Phase 1 optimizations
4. ⏳ Measure improvements
5. ⏳ Iterate to Phase 2/3 based on results

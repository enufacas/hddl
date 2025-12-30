# HDDL Map Particle Flow Rules

This document defines the canonical particle flows in the HDDL visualization and how they map to the underlying decision memory system.

## Particle Types & Flows

### 1. Signal Particles
**Source:** External world (top of viewport)  
**Destination:** Envelope  
**Meaning:** Environmental telemetry or external input entering the system  
**Visual:** Curves downward from above  
**Scenario Field:** `type: "signal"`  
**Post-arrival:** Fades out immediately

---

### 2. Decision Particles (Allowed)
**Source:** Agent (within fleet)  
**Destination:** Envelope  
**Meaning:** Agent makes decision within its authorized bounds  
**Visual:** Curves from agent to envelope, then **orbits envelope** (18 ticks)  
**Scenario Fields:**
- `type: "decision"`
- `status: "allowed"` (or missing status field)
- `agentId: "AG-XXX-XX"` (optional, uses `actorName` if missing)

**Post-arrival:** Orbits envelope to show decision "operating within" bounds

---

### 3. Decision Particles (Denied/Blocked)
**Source:** Agent (within fleet)  
**Waypoint:** Envelope (pulses to show rejection)  
**Destination:** Steward  
**Meaning:** Agent decision rejected by envelope, forwarded to steward for review  
**Visual:** 
1. Curves from agent to envelope
2. **Pulses at envelope** (12 ticks total, ~1 second)
   - Formula: `scale = 1.0 + sin(phase * 3π) * 0.5` creates 3 complete pulses
   - Scale range: 0.5x to 1.5x
   - Life decay: 0.005 per tick during pulse
3. Continues curving from envelope to steward
**Scenario Fields:**
- `type: "decision"`
- `status: "denied"` or `status: "blocked"`
- `agentId: "AG-XXX-XX"` (optional, uses `actorName` if missing)

**Post-arrival:** Fades out at steward

**Key Insight:** Shows envelope as active gatekeeper - all decisions flow through envelope first

---

### 4. Boundary Interaction Particles
**Source:** Agent (within fleet)  
**Waypoint:** Envelope (boundary check)
**Destination:** Steward (escalation recipient)
**Meaning:** Agent encounters boundary condition, envelope detects and forwards escalation request to steward
**Visual:** 
1. Curves from agent to envelope
2. **Pulses at envelope** (8 ticks, ~0.5 seconds) to show boundary check
   - Formula: `scale = 1.0 + sin(phase * 3π) * 0.5`
   - Life decay: 0.005 per tick during pulse
3. Continues curving from envelope to steward
4. **Orbits steward** (variable duration based on resolution time)
   - Formula: `(resolutionHour - eventHour) * 25 ticks/hour`
   - Typical range: 25-150 ticks (≈0.4 to 2.6 circles at 57 ticks/circle)
**Scenario Fields:**
- `type: "boundary_interaction"`
- `actorName: "AgentName"` (WHO: agent that triggered boundary)
- `envelopeId: "ENV-XXX-XX"` (WHERE: which boundary was crossed)
- `actorRole: "Steward Name"` (REVIEW: steward that receives escalation)
- `boundary_kind: "escalated"` (required: escalated/deferred/overridden)
- `boundary_reason: "fraud_suspected"` (optional: structured reason code for domain context)
- `eventId` (used to find resolution time)

**Boundary Reason Codes (Insurance Domain):**
- `high_risk_threshold` - Risk score exceeds escalation threshold
- `fraud_suspected` - Anomaly pattern requires investigation
- `fraud_confirmed` - Evidence of fraudulent activity
- `price_threshold_exceeded` - Premium change exceeds policy limits
- `regulatory_compliance_gap` - Missing documentation or explainability

**Post-arrival:** Orbits steward while under review, duration calculated from scenario timing:
- Resolution time = next event with `resolvesEventId` matching this `eventId`
- Orbit duration = `(resolutionHour - eventHour) * 25 ticks/hour`
- Typical range: 25-150 ticks (≈0.4 to 2.6 complete circles)
- At 0.11 radians/tick, one full circle = 57 ticks (≈2.3 hours scenario time)

**Lifecycle:** 
- Fades slowly during orbit (`life -= 0.003` per tick)
- Consumed when revision/decision resolves it

**Particle Label:** 
- Prefix based on `boundary_kind`: "Exception Request" (escalated), "Deferred Request", "Override Request"
- Core shows `boundary_reason` (human-readable) or falls back to `label`

**Key Insight:** Shows envelope as authority boundary - agent requests escalation, envelope mediates, steward reviews

---

### 5. Revision Particles
**Source:** Steward  
**Destination:** Envelope  
**Meaning:** Steward updates envelope bounds based on learned pattern  
**Visual:** Curves from steward to envelope (lower arc)  
**Scenario Fields:**
- `type: "revision"`
- `actorRole: "Steward Name"`
- `resolvesEventId: "boundary_interaction:X:Y:Z"` (optional, links to boundary interaction)

**Post-arrival:** Fades out at envelope

---

### 6. Retrieval Particles
**Source:** Embedding Store (right side, near embedding visualization)
**Destination:** Agent (within fleet)
**Meaning:** Agent queries decision memory before making a decision
**Visual:** Curves from embedding store to agent (dotted/dashed appearance via lighter opacity)
**Scenario Fields:**
- `type: "retrieval"`
- `actorName: "AgentName"` (agent performing the query)
- `envelopeId: "ENV-XXX-XX"` (envelope context)
- `queryText: "search terms"` (human-readable query description)
- `retrievedEmbeddings: ["EMB-ID-1", "EMB-ID-2"]` (array of embedding IDs retrieved)
- `relevanceScores: [0.92, 0.78]` (similarity scores 0-1, parallel to retrievedEmbeddings)

**Post-arrival:** Fades out at agent

**Particle Label:**
- Prefix: "Query"
- Core: Shows count and top relevance score (e.g., "3 results (92%)")

**Key Insight:** Shows agents "thinking with memory" - retrievals make the learning feedback loop visible. Agents don't make decisions in isolation; they query precedent and policy context from embeddings.

---

## Visual Properties

### Arc Direction (sign parameter in makeFlowCurve)
- **Positive arc (+1):** Lower curve - used for **revisions** (steward → envelope)
- **Negative arc (-1):** Upper curve - used for **signals, decisions, boundary interactions**

### Orbit Behavior
- **Orbit radius:** 45% of node radius, capped at 10-22px
- **Orbit speed:** 0.11 radians/tick (≈57 ticks per full circle)
- **Orbit triggers:**
  - Allowed decisions: Orbit envelope after arrival (18 ticks fixed)
  - Boundary interactions: Orbit steward after arrival (variable based on scenario timing)

### Life Decay Rates
- **During travel:** No decay (life = 1.0 or 1.5 for boundary interactions)
- **During waypoint pulse:** 0.005 per tick (rejected decisions at envelope)
- **During orbit:** 0.003 per tick (slow fade)
- **After orbit ends:** 0.002 per tick (boundary interactions), 0.01 (decisions), or 0.025 (immediate fade)
- **Boundary interactions start with:** `life: 1.5` (extra buffer for long orbits)

### Pulse Animation (Rejected Decisions)
- **Duration:** 12 ticks (~1 second)
- **Effect:** Scale oscillates: `1.0 + sin(phase * 3π) * 0.5` (creates 3 pulses)
- **Scale range:** 0.5x to 1.5x
- **Purpose:** Visual feedback of envelope rejection before forwarding to steward

### Particle Identification
Each particle gets unique ID: `${eventId}:${currentHour}`

---

## Scenario Data Requirements

### For Agent-Sourced Particles (decisions, boundary_interactions)
Either include:
- `agentId: "AG-XXX-XX"` (preferred), OR
- `actorName: "AgentName"` (will lookup agent node by name)

### For Boundary Interaction Resolution Timing
- Boundary interaction must have unique `eventId`
- Boundary interaction must have `boundary_kind` (escalated/deferred/overridden) - **required per schema**
- Boundary interaction may have `boundary_reason` (structured code) - **optional for domain context**
- Resolving event (revision/decision) must have `resolvesEventId: "boundary_interaction:X:Y:Z"`
- Orbit duration calculated as: `(resolutionEvent.hour - boundaryEvent.hour) * 25 ticks/hour`

### Schema Enhancement (v2)
**New field:** `boundary_reason` provides structured escalation context without overloading free-text `label`:
- Queryable for analytics (e.g., "count fraud_suspected escalations")
- Domain-specific vocabulary (insurance: fraud_suspected, high_risk_threshold, etc.)
- Backward compatible (optional field)
- Complements `boundary_kind` (canonical taxonomy) with domain richness

---

## Implementation Notes

### Node Lookup Priority
1. **Envelope:** Always required, looked up by `envelopeId`
2. **Steward:** Looked up by `actorRole` (steward name)
3. **Agent:** 
   - For decisions: Looked up by `agentId` (if present)
   - For boundary_interactions: Looked up by `actorName` (agent name)

### Fallback Behavior
- If agent not found for decision: Source from random edge of viewport
- If agent not found for boundary_interaction: Source from envelope (fallback)
- If steward not found: Target remains at envelope

---

## Canon Compliance Checklist

✅ Agents make decisions within bounds → agent to envelope (orbit)  
✅ Agents hit boundaries → agent to steward (orbit while under review)  
✅ Stewards update bounds → steward to envelope (revision)  
✅ **Denied decisions flow through envelope first → agent to envelope (pulse) to steward**  
✅ **Envelope is active gatekeeper → all decisions pass through envelope boundary check**  
✅ Orbit duration reflects real processing time from scenario data  
✅ External signals enter from outside → world to envelope  

---

## Future Considerations

- [x] ~~Add visual distinction between `boundary_kind: "escalated"`, `"overridden"`, `"deferred"`~~ (**IMPLEMENTED**: Particle labels show "Exception Request", "Override Request", "Deferred Request" based on `boundary_kind`)
- [ ] Consider showing "decision after review" as separate particle (steward → envelope after boundary resolution)
- [ ] Add particle trails or persistence for key decisions
- [ ] Enhance envelope gap visualization when no events occur between versions
- [ ] Add steward activity pulses to show human judgment moments

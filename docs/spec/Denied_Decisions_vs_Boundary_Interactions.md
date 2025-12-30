# Denied Decisions vs Boundary Interactions

## The Question

**What is the difference between a denied decision and a boundary interaction?**

Both involve an agent encountering limits and a steward getting involved, but they represent fundamentally different scenarios in the HDDL system.

---

## Denied Decision

### Example (Insurance Scenario, Hour 10.3)
```json
{
  "type": "decision",
  "status": "denied",
  "actorName": "RiskScorer",
  "envelopeId": "ENV-INS-001",
  "detail": "RiskScorer evaluated commercial property in flood zone with no mitigation history. Risk score: 94/100 (uninsurable). Application declined with referral to specialty market."
}
```

### What's Happening
- Agent **made a decision** ("let's decline this application")
- Agent **executed its logic** (evaluated property, calculated risk score: 94/100)
- Envelope **blocked it** (score exceeds safety threshold, outside established bounds)
- Decision forwarded to steward for final review/override

### Key Characteristics
- ❌ **Agent tried to do something** (made a decision)
- ❌ **Envelope said "no, you can't"** (exercised blocking authority)
- 🎯 **Envelope exercises authority** (active enforcement)
- 📊 **Agent completed its work** (has a score, has a recommendation, has reasoning)

### Semantic Meaning
> **"I tried to do X, but the envelope blocked me. Now a human needs to review my blocked decision."**

---

## Boundary Interaction

### Example (Insurance Scenario, Hour 5.3)
```json
{
  "type": "boundary_interaction",
  "boundary_kind": "escalated",
  "boundary_reason": "high_risk_threshold",
  "actorName": "ThresholdEscalator",
  "envelopeId": "ENV-INS-001",
  "detail": "ThresholdEscalator flagged homeowner's policy with risk score 89/100 (elevated flood risk + prior claims). Routed to senior underwriter."
}
```

### What's Happening
- Agent **encountered a boundary** ("this situation is beyond my authority")
- Agent **recognizes its limits** (before making a final decision)
- Agent **requests escalation** ("I need human judgment for this")
- Envelope forwards escalation request to appropriate steward

### Key Characteristics
- 🤚 **Agent recognizes limit before deciding** (self-aware)
- 🙋 **Agent asks "I need help with this"** (requests assistance)
- 🎯 **Envelope mediates** (connects agent to steward)
- ⏸️ **Agent hasn't completed work** (no final decision yet, work paused)

### Semantic Meaning
> **"I've encountered situation X that I'm not authorized to handle. I need a human to take over."**

---

## Core Difference

|  | Denied Decision | Boundary Interaction |
|--|----------------|---------------------|
| **Agent state** | Has made a decision | Hasn't decided yet |
| **Agent intent** | "Here's my answer" | "I need help" |
| **Envelope role** | **Enforcer** (blocks) | **Mediator** (routes) |
| **Steward role** | Reviews/overrides block | Makes the decision |
| **Without steward** | Decision is blocked ❌ | Agent is stuck ⏸️ |
| **Authority model** | Envelope vetoes agent | Agent defers to steward |
| **Semantic** | "You can't do that" | "I can't do that" |
| **Violation** | Agent exceeded bounds | Agent respected bounds |

---

## In Terms of Authority

### Denied Decision: Enforcement Model
```
Agent: "I've decided to decline this application (score: 94)"
  ↓
Envelope: "BLOCKED - That score is too high, you're not allowed to decline that"
  ↓
Steward: "Let me review why you blocked this..."
```

**The envelope is actively enforcing boundaries.** The agent tried to do something, and the envelope stopped it.

### Boundary Interaction: Recognition Model
```
Agent: "I've encountered a high-risk case (score: 89) - this is beyond my authority"
  ↓
Envelope: "Understood, routing to Underwriting Steward..."
  ↓
Steward: "Let me make the decision on this case..."
```

**The agent is proactively respecting boundaries.** The agent knows its limits and asks for help before making a decision it's not authorized to make.

---

## Why Both Exist

### Denied Decisions catch **errors and drift**
- Agent doesn't know it's out of bounds
- Envelope provides safety net
- Indicates potential training issue or boundary drift
- **Reactive protection**

### Boundary Interactions represent **designed escalation**
- Agent is self-aware of its limitations
- Built-in recognition of complexity/risk/authority thresholds
- Expected part of normal workflow
- **Proactive collaboration**

---

## Visual Representation

Both particle flows now consistently route through the envelope:

### Denied Decision Flow
```
Agent → Envelope (pulse: BLOCKED) → Steward
        └─ Shows enforcement action
```

### Boundary Interaction Flow
```
Agent → Envelope (pulse: boundary check) → Steward (orbits while reviewed)
        └─ Shows mediation/routing           └─ Shows active review
```

**Why both pulse at envelope?**
- **Denied decision pulse:** "STOP - blocked by authority"
- **Boundary interaction pulse:** "CHECK - routing to authority"

Both show the envelope as the **authority boundary**, but with different semantics.

---

## Implementation Guidance

### When to use `type: "decision"` with `status: "denied"`
- Agent made a complete decision
- Envelope determined decision violates bounds
- Rejection happened **after** agent committed to action
- Example: risk score too high, price outside range, unauthorized access

### When to use `type: "boundary_interaction"` with `boundary_kind: "escalated"`
- Agent recognizes situation requires human judgment **before** deciding
- Agent is designed to escalate certain cases
- Request happens **before** agent attempts decision
- Example: fraud indicators detected, regulatory compliance question, high-stakes scenario

---

## Related Concepts

- **Envelope Authority**: [Authority_Order.md](Authority_Order.md)
- **Decision Memory**: [Decision_Memory_and_AI_Native_Operations.md](../foundations/Decision_Memory_and_AI_Native_Operations.md)
- **Boundary Reason Codes**: [Schema_Enhancement_Boundary_Reason.md](Schema_Enhancement_Boundary_Reason.md)
- **Particle Flow Rules**: [PARTICLE_FLOW_RULES.md](../../hddl-sim/docs/PARTICLE_FLOW_RULES.md)

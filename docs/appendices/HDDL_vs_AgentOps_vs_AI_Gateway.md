# HDDL vs AgentOps vs AI Gateway
**Confidence:** Medium

## Purpose

These are adjacent layers that often appear together in agent-first stacks, but they govern different things.

This document exists to prevent a common failure: using execution tooling (AgentOps) or access tooling (AI Gateway) as a substitute for decision authority governance (HDDL).

## Layer Responsibilities (At a Glance)

| Layer | Governs | Primary artifacts | Primary question it answers | Failure mode if missing |
|---|---|---|---|---|
| **HDDL** | Decision authority | decision envelopes, steward revisions, escalation rules | “Who is allowed to decide what, and within what bounds?” | authority drifts into code/models/prompts; degradation is discovered late |
| **AgentOps** | Execution | runbooks, retries, task orchestration, observability | “How does work reliably happen and recover?” | execution is brittle; work is unreliable or unrepeatable |
| **AI Gateway** | Access | auth, quotas, routing, model/tool policies | “What calls are allowed, by whom, under what constraints?” | unsafe/uncontrolled access; cost/security drift; policy becomes tribal |

HDDL can exist without AgentOps (in simple environments), and AgentOps can exist without HDDL (in low-autonomy environments), but at scale:
- AgentOps without HDDL tends to optimize execution throughput while decision authority drifts.
- HDDL without AgentOps tends to define boundaries but struggle to execute reliably.

## How They Fit Together (Typical Flow)

1. A decision class is bounded in an **envelope** (HDDL):
	- allowed actions/tools
	- prohibited actions/tools
	- escalation triggers
	- owning steward(s) and revision process
2. A run is executed (AgentOps):
	- orchestration, retries, idempotency
	- controlled observability for reliability
3. Model/tool calls are enforced (AI Gateway):
	- routing to allowed providers/models
	- quota/cost controls
	- tool policy enforcement
4. The system emits **Decision Telemetry** (DTS):
	- about decisions and boundary interactions
	- used for envelope revision and degradation detection

The integration point is simple: envelopes define constraints; gateways and AgentOps enforce and operationalize those constraints.

## Boundaries (Non-Negotiables)

- HDDL governs decision authority; it does not own execution details.
- AgentOps reliability data must remain consistent with DTS posture: focus on decisions, outcomes, and boundary interactions.
- AI Gateway logging must obey the same constraint. “Helpful debugging” should not become a reasoning transcript or an employee-monitoring surface.
- Retention should remain short by default for granular telemetry (days to low weeks), consistent with DTS.

## Common Anti-Patterns

- **“Gateway policy is governance.”** A gateway can enforce constraints, but it cannot decide which constraints should exist or when they must change.
- **“AgentOps metrics are authority.”** Execution success rates can inform envelope revision, but they do not define what is permissible.
- **Observability creep.** Recording internal reasoning traces, private communications, or other forbidden signals violates DTS posture and erodes trust.
- **Silent strategy drift.** Gateway routing defaults (models/tools) become de facto strategy without steward review and envelope revision.

## Minimal Implementation (Practical)

If you need a minimal posture that is HDDL-aligned:

1. Define a small set of envelopes for recurring decision classes.
2. Encode envelope constraints as enforceable gateway policies (allowlists/quotas/routes).
3. Implement AgentOps runbooks that respect envelope escalation triggers.
4. Emit DTS events for:
	- envelope version used
	- escalation/override events
	- rollback/reversal events
	- outcomes (success/failure)
5. Run steward-led calibration to revise envelopes based on outcomes.

## Related Canon Documents

- ../foundations/HDDL_System_Overview.md
- ../foundations/Executive_Reference.md
- ../foundations/Decision_Telemetry_Specification.md
- ../operations/Request_Lifecycle_Walkthrough.md
- ../groups/Decision_Stewardship_Group.md
- ../operations/Steward_Playbook.md

---

## One-Line Summary (Preserved)

HDDL governs decision authority.
AgentOps governs execution.
AI Gateways govern access.


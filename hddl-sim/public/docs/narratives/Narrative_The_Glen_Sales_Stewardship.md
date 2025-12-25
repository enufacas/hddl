# The Glen Narrative: Sales Stewardship
**Confidence:** High

Glen wasn’t a “Sales Ops” guy in the old sense.
He was a **Sales Steward** in an HDDL company: the person accountable for how revenue decision authority is formed, bounded, and improved.

The company didn’t lose deals because it lacked AI.
It lost deals when *defaults* were treated like strategy.

Glen’s job was to make sure the system could help a rep move faster **without** turning the funnel into a black box.

---

## What Glen Owns

Glen’s domain is the revenue path:

- Lead qualification defaults
- Account scoring and prioritization
- Outreach sequencing and tone guardrails
- Proposal and pricing assistance (bounded)
- Hand-off integrity between SDR → AE → CS
- Competitive intelligence usage (policy-bound)

He does not “run the CRM.”
He **stewards decision authority** about who to pursue, how to pursue, and when humans must decide.

---

### Interface Moment: Steward-Led Interpretation

**Human (VP Sales)**
> “Our reps waste time chasing bad-fit leads.
> I want the system to surface the best prospects and draft outreach—
> but do *not* let it auto-disqualify accounts or change pricing without approval.”

**System Interpretation**
> • Domain: sales.pipeline
> • Objective: reduce time on low-fit leads; accelerate outreach creation
> • Guardrails:
>   – no auto-disqualification (human decision required)
>   – no pricing changes without approval
>   – no new data collection; use allowed signals only
> • Ownership: DSG / Sales + Sales Steward (Glen)

**Steward Execution**
```bash
stewardctl request compile   --domain sales.pipeline   --intent "Prioritize high-fit prospects and accelerate outreach drafts"   --constraints "no-auto-disqualify;pricing=human-approval;no-new-signals"   --owner dsg/sales
```

**Result**
> The system can recommend and draft, but it cannot silently decide who is “out.”
> Glen owns the envelope; leaders own the strategy; reps keep agency.

---

## The Subtle Failure Mode Glen Prevents

In the first rollout, the tool default “worked” on paper:
- Meeting rate up
- Time-to-first-touch down

But Glen caught the rot early:
- The system was overweighting “fast responders”
- It was deprioritizing strategic accounts that moved slower
- Reps started trusting the score more than their territory knowledge

That’s not a model bug.
That’s **unsteered decision authority**.

---

### Interface Moment: Calibration Instead of Blind Adoption

**Human (Glen)**
> “This default is optimizing for speed, not revenue quality.
> We need to calibrate for strategic fit and keep reps in the loop.”

**System Interpretation**
> • Promote tool default → candidate decision authority (shadow)
> • Success requires: improved qualified pipeline *without* strategic-account drop
> • Guardrails: rep overrides remain healthy (not suppressed)
> • Rollback: immediate on adverse selection signals

**Steward Execution**
```bash
stewardctl calibration create   --domain sales.pipeline   --name "Account-Scoring v2 (Strategic Fit)"   --from tool-default   --mode shadow   --success "qualified-pipeline:+ AND strategic-account-coverage>=baseline"   --stop-if "strategic-account-coverage<baseline OR override-rate spikes"   --owner dsg/sales
```

**Result**
> Glen turns “AI scoring” into **standing decision authority** that matches the company’s actual go-to-market reality.

---

## Glen’s Real Product: Trust

Sales systems fail when:
- they hide why a lead is prioritized
- they punish human overrides
- they create false certainty

Glen makes the system:
- explainable enough to trust
- bounded enough to govern
- useful enough that reps adopt it voluntarily

In HDDL terms, Glen protects the company from converting *tool defaults* into *strategy by accident*.

That’s Sales Stewardship.

# A Tuesday in the Near Future
**Confidence:** High

This narrative illustrates HDDL in its earliest mature form: decision authority is visible, bounded, and stewarded.

### Interface Moment: Steward-Led Interpretation

**Human (Natural Language)**
> “I want to reduce the showing scheduling exception backlog without making the system reckless.
> If confidence drops, a human should intervene.”

**System Interpretation**
> • Domain: leasing.ops
> • Objective: reduce exceptions
> • Risk posture: conservative
> • Constraints: no new data, human review below threshold
> • Owner: DSG / Leasing Ops

**Steward Execution**
```bash
stewardctl request compile   --domain leasing.ops   --intent "Reduce scheduling exception backlog without increasing risk"   --constraints "no-new-signals;human-review-required;confidence>=baseline"   --owner dsg/leasing-ops
````markdown
# A Tuesday in the Near Future
**Confidence:** High

It’s not a launch day.
Nothing is on fire.

The leasing ops team has a backlog of showing scheduling exceptions that have been piling up for weeks.
The work is repetitive, the failure modes are boring, and the cost is real: occupancy slows because people are stuck re-checking the same classes of issues.

This is the kind of work HDDL was built for: compounding human steering into bounded decision authority.

---

## The Problem (As Humans Say It)

In the weekly ops thread, someone writes:

> “We can’t keep doing this by hand. But I don’t want an agent deciding money movement based on vibes.
> Reduce the exception backlog. If confidence drops, a human should intervene.”

The key detail is what they did *not* ask for:
they didn’t ask to watch every keystroke, record every screen, or reconstruct who was “slow.”
They want the system to act inside a bounded space and surface boundary conditions when it should not.

---

## DTS Is the First Constraint

The Human Resources Steward has already co-owned the Decision Telemetry Specification (DTS) boundaries.
The leasing ops domain has an active DTS boundary document and the defaults are familiar:

- Minimal sufficiency
- Aggregation over individual-level instrumentation
- Short retention
- No reasoning capture
- No screen/audio/video capture

The leasing lead says it plainly:

> “Measure the *system* and the *envelope*. Don’t measure the people.”

---

## Interface Moment: Steward-Led Interpretation

The domain stewards (leasing.ops) meet for thirty minutes.
Not to approve a request.
To define decision authority.

**Human (Natural Language)**
> “Reduce the showing scheduling exception backlog without increasing risk.
> Stay conservative. No new telemetry signals.
> If the confidence drops, route to human review.”

**System Interpretation**
> • Domain: leasing.ops
> • Objective: reduce exceptions
> • Risk posture: conservative
> • Constraints: no-new-signals; human-review-required
> • DTS: aggregate-only; short-retention; no reasoning capture
> • Owner: Domain Stewards/leasing.ops

**Steward Execution**
```bash
# A Tuesday in the Near Future
**Confidence:** High

Maya didn’t think of herself as someone who “worked with AI.”

She was a director in Operations. She ran escalation reviews, signed off on vendor exceptions, and owned a quarterly planning number that everyone pretended was conservative and everyone knew was not.

At 8:17 a.m., she opened her laptop and saw three things waiting for her:

1. A flagged decision packet from her domain stewards
2. A quiet annotation from the Human Resources Steward (HRS)
3. A green checkmark indicating that everything else had proceeded without her

That last one mattered most.

## Decisions Without Transcripts

The packet wasn’t a log. There was no transcript. No replay of internal reasoning. No step-by-step explanation of how the system had arrived at its recommendation.

But there *was* a bounded, replayable trail of decision events—enough to investigate what happened without becoming a transcript.

Instead, it contained:

- The **decision outcome** that had been taken
- The **decision class** it belonged to
- A short **boundary annotation** explaining *why* this decision touched a calibrated edge
- Aggregate telemetry showing this class of decision was trending upward

That was it.

Under HDDL’s Decision Telemetry Specification (DTS), the system was not allowed to capture reasoning traces, deliberation chains, or internal model state.
Those belonged either to the model vendor or to the human mind—never to the organization.

What the company owned was the *decision boundary*, not the thinking inside it.

## Stewardship, Not Approval

Maya skimmed the packet. The decision itself was fine. Expected, even. What mattered was the pattern.

She added a single note:

> "Escalation frequency acceptable. No boundary adjustment needed. Monitor for next cycle."

She didn’t approve the past decision. That had already happened.

She shaped the *future envelope*.

The system updated quietly. No retraining. No hotfix. Just a slight compression of the envelope so the next thousand similar decisions would require even less attention.

By 8:42 a.m., Maya was done.

No one had watched her think.

No one had extracted her judgment.

But her judgment would compound anyway.
- time-to-resolution of exception classes

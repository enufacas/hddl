# Data Steward
**Confidence:** Medium

**Canonical language (locked):**
- In an AI-native company, data quality is not a technical concern—it is a decision authority concern.
- If the data environment degrades, all other stewardship fails.

## Definition
The Data Steward owns the data environment as a decision authority surface—ensuring that raw and refined data remains trustworthy, queryable, and semantically stable as models, agents, and product behavior change.

## Why this role is foundational
When data degrades:
- evaluation becomes unreliable,
- agents plan off incorrect priors,
- customer constraints misfire,
- and all other stewardship domains suffer.

## Core responsibilities
- data quality envelopes (freshness, completeness, correctness)
- data lineage and origin
- semantic stability and ontology drift
- embedding hygiene (vector DBs)
- contamination controls (train vs eval)
- multi-store orchestration

## Interfaces
Platform Steward, Security Steward, Customer Advocate Steward, HRS

---

### Interface Moment: Steward-Led Interpretation (Human → Steward Compilation)

**Human (Natural Language)**
> “Before I trust this system today, show me whether the data environment itself is still healthy.”

**System Interpretation**
> • Assess data environment health without inspecting sensitive contents
> • Signals only: freshness, drift, joins, schema stability
> • Purpose: protect downstream decision validity

**Steward Execution**
```bash
stewardctl data health \
  --domains payments.recon,finance.close \
  --signals freshness,drift,join-integrity,schema-churn \
  --window 72h
```

**Result**
> Decisions proceed only if the environment itself remains sound.

## Stewardship and Engineering

**Stewards—especially technical stewards—are engineers first.**
Stewardship is not a separate profession or job family; it is a responsibility taken on by experienced engineers when decision authority, risk, and scale demand it.

Stewardship describes an area of responsibility, not a hierarchy.
Most stewards remain practicing engineers who design, build, debug, and operate systems while also shaping how decision authority is bounded, traced, and revised.

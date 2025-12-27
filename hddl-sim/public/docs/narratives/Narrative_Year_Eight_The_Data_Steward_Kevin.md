# Year Eight: The Data Steward (Kevin)
**Confidence:** Medium

Kevin had been a DBA and data architect long before AI-first companies were common.
As agents spread, his value increased.

In an AI-native company, data quality is not a technical concern—it is a decision authority concern.
If the data environment degrades, all other stewardship fails.

## Near-future operations

```bash
# Validate embedding freshness and semantic drift
data-steward check embeddings --store vectordb --freshness 24h --drift-threshold 0.12

# Rebuild retrieval index after ontology change
vectordb reindex --collection customer_events --embedding-model embed-v5

# Enforce evaluation/training separation
data-steward enforce boundaries --no-cross eval->train

# Promote retrieval envelope after clean shadow run
hddl envelope promote --id ENV-DATA-009 --from shadow --to live
```

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
  --domains leasing.ops,finance.close \
  --signals freshness,drift,join-integrity,schema-churn \
  --window 72h
```

**Result**
> Decisions proceed only if the environment itself remains sound.

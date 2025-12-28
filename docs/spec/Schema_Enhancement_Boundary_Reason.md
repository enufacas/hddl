# Schema Enhancement: boundary_reason Field

**Status:** Proposed Enhancement  
**Date:** December 28, 2025  
**Target:** hddl-scenario.schema.json v2

## Problem Statement

Current `boundary_interaction` events use only `boundary_kind` (escalated/deferred/overridden) which provides canonical categorization but loses domain-specific context:

```json
{
  "type": "boundary_interaction",
  "boundary_kind": "escalated",
  "label": "Fraud indicators detected"  // ← Unstructured, inconsistent
}
```

**Limitations:**
- All escalations look the same taxonomically (fraud ≈ high-risk ≈ compliance gap)
- Domain semantics relegated to free-text `label` field
- Not queryable/filterable by escalation reason
- Loses structured metadata for analytics

## Proposed Solution

Add optional `boundary_reason` field for structured escalation codes:

```json
{
  "type": "boundary_interaction",
  "boundary_kind": "escalated",        // ← Canonical (interoperability)
  "boundary_reason": "fraud_suspected", // ← Domain-specific (context)
  "label": "Fraud indicators detected"  // ← Human-readable (UX)
}
```

## Schema Change

**File:** `hddl-sim/schemas/hddl-scenario.schema.json`

```json
{
  "boundary_kind": { 
    "type": "string",
    "enum": ["escalated", "deferred", "overridden"],
    "description": "Canonical category of boundary interaction"
  },
  "boundary_reason": { 
    "type": "string",
    "description": "Structured reason code for escalation (domain-specific, e.g., fraud_detected, high_risk_threshold, regulatory_exception)"
  }
}
```

**Properties:**
- **Optional** field (backward compatible)
- **No enum constraint** (domain-specific vocabularies vary)
- **Snake_case convention** for consistency
- **Complements** `boundary_kind`, doesn't replace it

## Insurance Domain Vocabulary

Proposed `boundary_reason` codes for insurance scenarios:

| Code | Boundary Kind | Meaning |
|------|---------------|---------|
| `high_risk_threshold` | escalated | Risk score exceeds auto-approval threshold |
| `fraud_suspected` | escalated | Anomaly patterns require investigation |
| `fraud_confirmed` | escalated | Evidence of fraudulent activity detected |
| `price_threshold_exceeded` | escalated | Premium change exceeds policy limits |
| `regulatory_compliance_gap` | escalated | Missing required documentation or explainability |
| `manual_review_requested` | escalated | Explicit human judgment required |
| `confidence_threshold` | deferred | Model confidence below acceptable level |
| `policy_override_applied` | overridden | Business rule exception granted |

**Note:** Other domains (HR, sales, etc.) define their own vocabularies.

## Benefits

1. **Interoperability preserved:** `boundary_kind` remains canonical taxonomy
2. **Domain richness:** Structured context without schema bloat
3. **Queryable analytics:** Filter by reason code, not free-text search
4. **Backward compatible:** Optional field, existing scenarios unchanged
5. **Visualization enhancement:** More informative particle labels
6. **Telemetry alignment:** DTS-focused metadata for decision memory

## Migration Path

### For Implementers
- **MUST** respect `boundary_kind` (canonical)
- **MAY** use `boundary_reason` for enhanced context
- **MUST** ignore unknown fields (forward compatibility)

### For Scenario Authors
- Add `boundary_reason` to new scenarios
- Update existing scenarios opportunistically (not required)
- Define domain-specific vocabulary in scenario documentation

### For Visualizations
```javascript
const prefix = boundaryKind === 'escalated' ? 'Exception' : 'Boundary'
const detail = boundaryReason?.replace(/_/g, ' ') || label || boundaryKind
console.log(`${prefix}: ${detail}`)
// "Exception: fraud suspected" vs "Exception: Fraud indicators detected"
```

## Related Work

- Implementers Guide: "Use `boundary_interaction` with `boundary_kind: 'escalated'`"
- Decision Telemetry Spec: "Focus on decisions, outcomes, and boundary interactions"
- Drift + Gap Analysis: Normalize legacy `escalation` → `boundary_interaction`

## Open Questions

1. Should we standardize cross-domain reason codes (e.g., `confidence_threshold` used in HR + insurance)?
2. Should schema provide example vocabularies per domain?
3. Should `boundary_reason` be machine-readable (enum) or human-extensible (string)?

**Current decision:** Keep as string for flexibility, domains self-organize.

## Implementation Checklist

- [x] Update `hddl-scenario.schema.json`
- [x] Add `boundary_reason` to insurance-underwriting scenario
- [x] Update visualization code to use both fields
- [x] Document in PARTICLE_FLOW_RULES.md
- [ ] Update Implementers_Guide.md with examples
- [ ] Add conformance test for boundary_kind validation
- [ ] Document reason code vocabularies per domain

## Examples

### Before (Status Quo)
```json
{
  "type": "boundary_interaction",
  "label": "High-risk application escalated",
  "boundaryType": "manual_review_required"  // ← Non-standard field
}
```

### After (Enhanced)
```json
{
  "type": "boundary_interaction",
  "boundary_kind": "escalated",              // ← Canonical
  "boundary_reason": "high_risk_threshold",  // ← Structured
  "label": "High-risk application escalated" // ← Human-readable
}
```

### Analytics Query (After)
```javascript
// Count escalations by reason
const reasonCounts = events
  .filter(e => e.type === 'boundary_interaction' && e.boundary_kind === 'escalated')
  .reduce((acc, e) => {
    acc[e.boundary_reason || 'unknown'] = (acc[e.boundary_reason || 'unknown'] || 0) + 1
    return acc
  }, {})

// {
//   fraud_suspected: 2,
//   high_risk_threshold: 1,
//   price_threshold_exceeded: 2,
//   regulatory_compliance_gap: 1
// }
```

## Approval & Timeline

**Proposed by:** Development team during UX improvements  
**Review needed:** Canon maintainers, domain stewards  
**Target release:** Schema v2 (next breaking change window)  
**Breaking change:** No (optional field, backward compatible)

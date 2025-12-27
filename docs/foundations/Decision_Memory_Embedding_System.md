# Decision Memory & Embedding System

## Overview

The **Embedding Vector Space** is HDDL's long-term decision memory system. Every significant decision, signal pattern, boundary interaction, and DSG session artifact is converted into a semantic vector embedding and stored for future retrieval.

## Purpose

The embedding system enables:

1. **Similarity-Based Retrieval**: Find past decisions similar to current situations
2. **Pattern Recognition**: Detect recurring issues across time and envelopes
3. **Institutional Memory**: Preserve organizational learning beyond individual stewards
4. **Drift Detection**: Identify when current decisions diverge from historical patterns
5. **Cross-Domain Learning**: Discover analogous solutions from other envelopes

## Architecture

### Embedding Types

The system stores five types of embeddings:

| Type | Source | Purpose | Example |
|------|--------|---------|---------|
| `decision` | Decision events | Capture judgment outcomes and rationale | "Approved index change with impact analysis" |
| `signal` | Signal events | Store anomaly patterns and metrics | "Connection pool saturation at 92% during traffic spike" |
| `boundary_interaction` | Boundary events | Record constraint encounters | "PII table flagged for security review" |
| `revision` | Revision events | Preserve authority adjustments | "Alert threshold increased from 85% to 92%" |
| `session_artifact` | DSG sessions | Archive collective decisions | "47 optimization recommendations reviewed" |

### Vector Dimensions

Embeddings use **768-dimensional vectors** (standard for semantic similarity models like sentence-transformers). Each dimension captures latent semantic features of the decision context.

### Event Schema

```json
{
  "type": "embedding",
  "hour": 3.0,
  "envelopeId": "ENV-DB-001",
  "embeddingId": "EMB-001",
  "embeddingType": "decision",
  "vectorDimensions": 768,
  "sourceEventId": "decision:2_5:ENV-DB-001:2",
  "semanticContext": "database index optimization for composite queries",
  "label": "Decision embedded",
  "detail": "Index recommendation embedded for future retrieval"
}
```

## Operational Flow

### 1. Event Occurs
A steward or agent makes a decision, detects a signal, or encounters a boundary.

### 2. Embedding Created
The system extracts semantic context:
- Decision rationale and outcome
- Environmental conditions (time, envelope state, active constraints)
- Actor roles and agents involved
- Outcome metrics (if available)

### 3. Vector Generated
Text is processed through a semantic embedding model (e.g., `all-MiniLM-L6-v2` or `text-embedding-ada-002`) to produce a 768-dim vector.

### 4. Stored in Vector Space
The embedding is indexed with metadata:
- Envelope context
- Temporal context (hour in scenario timeline)
- Event type and severity
- Source event reference

### 5. Available for Retrieval
Future decisions can query the vector space:
```
Query: "slow query on users table"
→ Retrieve: Top 5 similar past decisions
→ Result: "Index on users(email, created_at) reduced query time 78%"
```

## Visualization

The **Embedding Vector Space** panel at the bottom of the HDDL interface shows:

- **Floating embedding icons**: Animate from decision point into the vector space
- **Density visualization**: Subtle grid showing embedding distribution
- **Count badge**: Total embeddings stored
- **Color coding**: Embeddings color-coded by envelope/steward

As time progresses, embeddings accumulate, creating a visual representation of institutional memory growth.

## Integration with Authority

Embeddings enhance HDDL's authority model:

### Before Embeddings (Authority Only)
```
Problem → Check Constraints → Make Decision
```

### With Embeddings (Authority + Memory)
```
Problem → Check Constraints → Query Similar Past Decisions → Make Informed Decision
```

### Example Scenario

**Situation**: Database connection pool at 90% capacity

**Without Embeddings**:
- Agent checks constraints: "Alert rate < 5/hour"
- Agent triggers alert
- Steward investigates from scratch

**With Embeddings**:
- Agent checks constraints
- Agent queries vector space: "connection pool saturation"
- Retrieves: Previous threshold adjustment (EMB-002)
- Rationale: "Increased threshold to 92% to reduce false positives"
- Agent applies learned pattern, avoiding unnecessary alert

## Similarity Threshold

Embeddings are retrieved based on **cosine similarity**:

- `> 0.9`: Nearly identical situations
- `0.7 - 0.9`: Highly similar, likely applicable
- `0.5 - 0.7`: Somewhat similar, worth reviewing
- `< 0.5`: Dissimilar, not recommended

Stewards can adjust thresholds per envelope based on domain sensitivity.

## Privacy & Compliance

### PII Handling
- Embeddings store **semantic meaning**, not raw data
- Patient names, SSNs, etc. are stripped before embedding
- Only decision context and patterns are preserved

### Retention
- Embeddings are immutable once created
- Can be flagged for deletion per regulatory requirements
- Audit logs track all embedding creation and retrieval

### Explainability
- Each embedding links back to source event
- Full decision trail remains accessible
- Stewards can inspect "why" a similar decision was retrieved

## Performance Characteristics

### Storage
- ~3KB per embedding (768 floats + metadata)
- 1,000 embeddings ≈ 3MB
- Typical scenario: 50-200 embeddings over 48-120 hours

### Retrieval Speed
- Vector similarity search: <50ms for 10K embeddings
- Indexed with HNSW or IVF for scale
- Real-time retrieval during decision-making

### Accuracy
- Semantic similarity models: 85-95% relevance at top-5
- Domain-specific fine-tuning improves to 90-98%
- Continuous evaluation via steward feedback

## Future Directions

### Phase 2 Enhancements
- **Clustering**: Group similar decisions into patterns
- **Temporal Weighting**: Recent decisions weighted higher
- **Cross-Envelope Retrieval**: Find solutions from adjacent domains
- **Active Learning**: Stewards rate embedding relevance to improve model

### Integration Points
- **Interactive Mode**: Real-time similarity suggestions during decision flow
- **Drift Analysis**: Compare current authority to embedded historical patterns
- **DSG Tools**: Retrieve past session artifacts for calibration reviews

## Canonical References

- [Decision Telemetry Specification](../foundations/Decision_Telemetry_Specification.md)
- [Decision Memory and AI-Native Operations](../foundations/Decision_Memory_and_AI_Native_Operations.md)
- [Steward-Led Decision Calibration](../operations/Steward_Led_Decision_Calibration.md)
- [Continuous Stewardship](../operations/Continuous_Stewardship.md)

---

**Status**: Active as of HDDL v2.0  
**Owner**: Data Steward + Engineering Steward collaboration  
**Review Cadence**: Quarterly DSG session on embedding quality and coverage

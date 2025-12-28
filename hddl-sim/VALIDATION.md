# HDDL Scenario Validation

This document describes the validation tooling for HDDL scenarios.

## Overview

The HDDL project includes a suite of validation scripts that ensure scenario files are:
- **Schema-compliant** - Match the JSON schema structure
- **Canonically correct** - Reference existing canonical documents
- **Feedback-complete** - Have required embeddings for agent learning
- **Chronologically consistent** - Retrievals don't reference future knowledge

## Running Validation

```bash
cd hddl-sim
npm run conformance
```

This orchestrates all validators in sequence and stops on first failure.

## Validation Scripts

### 1. `conformance.mjs` - Orchestrator

**Purpose:** Runs all validation steps in order.

**Location:** `hddl-sim/scripts/conformance.mjs`

**Invoked by:** `npm run conformance`

**What it does:**
- Executes validate-canon-registry.mjs
- Executes validate-scenarios.mjs
- Executes validate-closed-loops.mjs
- Stops on first failure

### 2. `validate-canon-registry.mjs` - Canonical Document Checker

**Purpose:** Ensures all documents referenced in Canon_Registry.md actually exist.

**Location:** `hddl-sim/scripts/validate-canon-registry.mjs`

**What it validates:**
- ✅ Every entry in Canon_Registry.md points to an existing file
- ✅ File paths are correct (docs/spec/, docs/foundations/, etc.)
- ✅ 39+ canonical documents are present

**Example output:**
```
✓ Canon Registry validated successfully (39 entries)
```

**Exit code:** 0 if valid, 1 if any files missing

### 3. `validate-scenarios.mjs` - JSON Schema Validator

**Purpose:** Validates scenario JSON files against the formal schema.

**Location:** `hddl-sim/scripts/validate-scenarios.mjs`

**Schema:** `hddl-sim/schemas/hddl-scenario.schema.json`

**What it validates:**
- ✅ Valid JSON structure
- ✅ Required fields present (metadata, envelopes, events, dsg, actors)
- ✅ Field types correct (strings, numbers, arrays, objects)
- ✅ Enum values valid (event types, boundary kinds, etc.)
- ✅ Array item structure (events, agents, stewards)

**Example output:**
```
✓ insurance-underwriting.scenario.json validated successfully
✓ All 1 scenarios validated
```

**Exit code:** 0 if all valid, 1 if any invalid

**Common errors:**
- Missing required fields
- Wrong data types
- Invalid enum values
- Malformed JSON

### 4. `validate-closed-loops.mjs` - Feedback Loop Validator ⭐

**Purpose:** Validates that scenarios have complete feedback loops for agent learning.

**Location:** `hddl-sim/scripts/validate-closed-loops.mjs`

**Normative reference:** [Canonical_Event_Patterns.md](../docs/spec/Canonical_Event_Patterns.md)

**What it validates (REQUIRED - errors if missing):**

#### ✅ Every revision has an embedding
```json
// Revision
{"type": "revision", "eventId": "rev-001", "hour": 10}

// REQUIRED: Embedding linking back
{"type": "embedding", "embeddingType": "revision", 
 "sourceEventId": "rev-001", "hour": 10.5}
```

**Error if missing:**
```
❌ Revision at hour 10 (rev-001) is missing required embedding.
   Add embedding with embeddingType: "revision" and sourceEventId: "rev-001"
```

#### ✅ Every boundary_interaction has an embedding
```json
// Boundary interaction
{"type": "boundary_interaction", "eventId": "boundary-001", "hour": 25}

// REQUIRED: Embedding linking back
{"type": "embedding", "embeddingType": "boundary_interaction",
 "sourceEventId": "boundary-001", "hour": 25.5}
```

**Error if missing:**
```
❌ Boundary interaction at hour 25 (boundary-001) is missing required embedding.
   Add embedding with embeddingType: "boundary_interaction" and sourceEventId: "boundary-001"
```

#### ✅ Retrievals only reference chronologically valid embeddings
```json
// Embedding created first
{"type": "embedding", "embeddingId": "EMB-001", "hour": 10}

// Retrieval can reference it (hour 15 > 10)
{"type": "retrieval", "hour": 15, 
 "retrievedEmbeddings": ["EMB-001"]}  // ✅ Valid
 
// Retrieval CANNOT reference future embeddings
{"type": "retrieval", "hour": 5,
 "retrievedEmbeddings": ["EMB-001"]}  // ❌ Time paradox!
```

**Error if chronologically invalid:**
```
❌ Retrieval at hour 5 references embedding EMB-001 created at hour 10
   (time paradox - can't retrieve future knowledge)
```

**What it warns about (RECOMMENDED - warnings if missing):**

#### ⚠️ Boundary interactions should have preceding retrieval
Shows agent "thinking with memory" before escalating.

```json
// Recommended pattern
{"type": "retrieval", "hour": 24.5, "actorName": "PricingBot"}
{"type": "boundary_interaction", "hour": 25, "actorName": "PricingBot"}
```

**Warning if missing:**
```
⚠ Boundary interaction at hour 25 (PricingBot) lacks preceding retrieval
  Recommended: Add retrieval event ~0.5 hours before boundary
```

#### ⚠️ Scenarios should have historical baseline
Pre-existing knowledge makes agents realistic (not blank memory).

```json
{"type": "embedding", "embeddingId": "EMB-HIST-001", "hour": -48}
```

**Warning if missing:**
```
⚠ Scenario lacks historical baseline embeddings (hour < 0)
  Recommended: Add embeddings at negative hours to represent pre-existing knowledge
```

#### ⚠️ Steward decisions should have embeddings
Human judgment patterns teach agents.

```json
{"type": "decision", "eventId": "decision-001", "hour": 30}
{"type": "embedding", "embeddingType": "decision", 
 "sourceEventId": "decision-001", "hour": 30.5}
```

**Warning if missing:**
```
⚠ Steward decision at hour 30 (decision-001) lacks embedding
  Recommended: Add embedding to capture human judgment patterns
```

**Example output:**
```
Validating insurance-underwriting.scenario.json...

❌ ERRORS (8):

  ❌ Revision at hour 6 (REV-001) is missing required embedding.
     Add embedding with embeddingType: "revision" and sourceEventId: "REV-001"

  ❌ Boundary interaction at hour 63 (boundary:63) is missing required embedding.
     Add embedding with embeddingType: "boundary_interaction" and sourceEventId: "boundary:63"

⚠ WARNINGS (3):

  ⚠ Boundary interaction at hour 78.4 (PricingBot) lacks preceding retrieval
    Recommended: Add retrieval event ~0.5 hours before boundary

Validation failed with 8 errors across 1 scenarios
```

**Exit code:** 0 if no errors, 1 if any errors (warnings don't fail)

## Why These Validations Matter

### Schema Validation: Portability
The JSON schema ensures scenarios are **portable** across HDDL implementations. Any conformant reader can parse and understand the data structure.

### Closed Loop Validation: Learning
The feedback loop validations ensure scenarios demonstrate **genuine agent learning**, not just audit trails. This is what differentiates HDDL from traditional logging:

| Traditional Audit Logs | HDDL Scenarios with Closed Loops |
|------------------------|----------------------------------|
| Record "what happened" | Show "how agents learn" |
| Linear event sequence | Feedback cycles with memory |
| No learning mechanism | Embeddings enable retrieval |
| Notifications outward | Knowledge captured for reuse |

### Chronological Validation: Realism
Time consistency ensures scenarios are **realistic** - agents can't retrieve knowledge that doesn't exist yet. This prevents logical paradoxes in scenario data.

## Integration with Development Workflow

### 1. During Scenario Creation
Run `npm run conformance` after editing scenario files:

```bash
cd hddl-sim
# Edit src/sim/scenarios/my-scenario.scenario.json
npm run conformance
```

### 2. Pre-commit Hook (Recommended)
Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
cd hddl-sim && npm run conformance || exit 1
```

### 3. CI/CD Pipeline
Add to GitHub Actions or similar:

```yaml
- name: Validate scenarios
  run: cd hddl-sim && npm run conformance
```

### 4. Scenario Generation
When generating scenarios with AI or tools, run conformance to verify output:

```bash
# Generate scenario (AI, script, manual)
# Save to hddl-sim/src/sim/scenarios/new-scenario.scenario.json

# Validate
cd hddl-sim
npm run conformance

# If errors, fix and re-run
npm run conformance
```

## Conformance Checklist

Your scenario MUST pass:
- ✅ Schema valid (conforms to hddl-scenario.schema.json)
- ✅ Every revision has embedding with matching sourceEventId
- ✅ Every boundary_interaction has embedding with matching sourceEventId
- ✅ Retrievals only reference embeddings that exist before retrieval.hour

Your scenario SHOULD have:
- ⚠️ Retrieval events before boundary interactions (shows agent thinking)
- ⚠️ Historical baseline embeddings (hour < 0, pre-existing knowledge)
- ⚠️ Embeddings for steward decisions (captures human judgment patterns)

## Fixing Common Validation Errors

### Missing Revision Embedding

**Error:**
```
❌ Revision at hour 19 (REV-DISCOUNT-POLICY) is missing required embedding.
```

**Fix:** Add embedding event ~0.5-1 hour after revision:
```json
{
  "type": "embedding",
  "embeddingType": "revision",
  "embeddingId": "EMB-005",
  "sourceEventId": "REV-DISCOUNT-POLICY",
  "hour": 19.5,
  "description": "Policy update on bulk discounts",
  "vector": [0.32, 0.61],
  "tags": ["policy", "pricing", "discounts"]
}
```

### Missing Boundary Embedding

**Error:**
```
❌ Boundary interaction at hour 63 (boundary:63) is missing required embedding.
```

**Fix:** Add embedding event ~0.5-1 hour after boundary:
```json
{
  "type": "embedding",
  "embeddingType": "boundary_interaction",
  "embeddingId": "EMB-009",
  "sourceEventId": "boundary:63",
  "hour": 63.5,
  "description": "Escalation: unusual discount request pattern",
  "vector": [0.78, 0.82],
  "tags": ["boundary", "pricing", "escalation"]
}
```

### Time Paradox in Retrieval

**Error:**
```
❌ Retrieval at hour 28 references embedding EMB-009 created at hour 63.5
   (time paradox - can't retrieve future knowledge)
```

**Fix:** Only reference embeddings created BEFORE retrieval:
```json
{
  "type": "retrieval",
  "hour": 28,
  "actorName": "DiscountBot",
  "queryText": "similar discount patterns",
  "retrievedEmbeddings": ["EMB-001", "EMB-003", "EMB-005"],
  "relevanceScores": [0.91, 0.87, 0.83]
}
```

Make sure all retrieved embedding IDs have `hour < 28`.

## Reference Documentation

- **Canonical Event Patterns:** [docs/spec/Canonical_Event_Patterns.md](../docs/spec/Canonical_Event_Patterns.md) - Normative feedback loop patterns
- **Scenario Wire Format:** [docs/spec/Scenario_Replay_Wire_Format.md](../docs/spec/Scenario_Replay_Wire_Format.md) - Normative JSON structure
- **Implementers Guide:** [docs/spec/Implementers_Guide.md](../docs/spec/Implementers_Guide.md) - FAQs and examples
- **AI Scenario Generation:** [docs/spec/AI_Generated_Scenarios.md](../docs/spec/AI_Generated_Scenarios.md) - Guide for creating scenarios
- **Agent Learning:** [docs/spec/Agent_Learning_Feedback_Loop.md](../docs/spec/Agent_Learning_Feedback_Loop.md) - Why closed loops matter

## Living Example

The most complete validated scenario is:

**[src/sim/scenarios/insurance-underwriting.scenario.json](src/sim/scenarios/insurance-underwriting.scenario.json)**

Use this as a reference when creating new scenarios or fixing validation errors. It demonstrates:
- Historical baseline embeddings (hour -48)
- Complete 6-event feedback cycles
- Retrieval events before decisions
- Semantic vector positioning
- Chronologically consistent retrievals
- ~1050 lines of conformant event data

## Future Enhancements

Potential tooling improvements:
- `conformance --fix` - Auto-generate missing embeddings
- `conformance --explain` - Show why validation failed with context
- `conformance --watch` - Continuous validation during editing
- IDE integration - Real-time validation in VS Code
- Scenario templates - Scaffolding for common patterns

## Questions?

See the [Implementers Guide FAQ section](../docs/spec/Implementers_Guide.md#faq) for common questions about closed loops and validation.

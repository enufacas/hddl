# Decision Memory and AI-Native Operations in HDDL
**Confidence:** High

**Status:** Canon

This document integrates Decision Memory, Embeddings, and AI-Native Operational Signals into a single coherent operational model within the Human-Derived Decision Layer (HDDL).

---

## Framing

HDDL does not require humans to participate in every decision.
It requires that the authority for decisions—human or automated—be explicitly derived from humans, bounded, and traceable.

As AI-native systems scale, learning and adaptation must occur without introducing opaque control or silent authority expansion.

---

## Decision Memory

Decision Memory is the AI-assisted recall and learning layer derived from:
- decision artifacts
- decision lifecycle events
- incident narratives
- customer and operational signals

Decision Memory:
- is non-authoritative by itself
- may be consumed by humans and agents
- enables precedent discovery and pattern recognition
- must always reference authoritative artifacts

Embeddings are the enabling mechanism for Decision Memory.

---

## Embeddings and Autonomous Decisions

Embeddings in HDDL may inform and drive autonomous decisions **within an explicitly authorized decision envelope**.

They may be used to:
- select actions based on similarity to prior decisions
- adapt behavior within granted bounds
- route work or escalate based on learned patterns
- choose between tools or models

They must not:
- expand authority beyond declared bounds
- justify actions without envelope reference
- obscure attribution or origin

---

## AI-Native Operational Signals

HDDL introduces decision-centric operational signals beyond traditional observability.

### Decision Drift
Occurs when assumptions underlying authority no longer hold despite healthy execution.

### Authority–Model Mismatch
Occurs when model capability diverges from assumed authority.

### Tool Overreach
Occurs when tools expose more capability than intended.

### Silent Automation Expansion
Occurs when agents evolve behavior without explicit authority change.

---

## Operational Responses

HDDL responses operate at the authority layer:
- authority narrowing or suspension
- decision re-promotion
- steward annotation
- DSG arbitration when cross-domain

These actions are reversible, traceable, and do not block execution globally.

---

## Relationship to Observability

Observability answers *what is happening*.
Decision Memory explains *what this resembles*.
HDDL governs *what is allowed to happen next*.

---

## Requirements (Canon)

The following are intended as **hard requirements** (not optional guidance):

- All embedding-driven actions must reference a decision_id
- No hidden scoring of people
- Embeddings never hold authority; they assist recall; they do not decide
- Authority boundaries must be inspectable at rest
- Autonomous actions must emit traceable events
- No silent authority expansion

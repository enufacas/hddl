# Architecture Decision Records (ADRs)

**Purpose:** Track significant decisions about the HDDL canon, spec, and SIM implementation so we can trace why things are the way they are.

---

## What is an ADR?

An Architecture Decision Record (ADR) documents a significant decision made about the HDDL canon or portable spec. ADRs are used when:
- SIM needs to model a concept not yet in the canon
- SIM discovered ambiguity or drift in the spec
- External implementers request clarification
- A breaking change is proposed

---

## When to Write an ADR

✅ **Write an ADR when:**
- Proposing a change to normative documents (Tier 1 or Tier 2 in `docs/spec/Authority_Order.md`)
- Adding/removing event types or required fields
- Changing schema semantics (even if backward-compatible)
- Resolving ambiguity in the spec
- Bumping schema version

❌ **Don't write an ADR for:**
- SIM-only UI changes (e.g., colors, layout)
- Non-normative documentation updates (e.g., fixing typos in narratives)
- Test improvements (unless they reveal spec gaps)
- Scenario pack additions (unless they reveal spec gaps)

---

## Process

1. **Propose:** Copy `template.md` → `adr-NNNN-short-title.md` (use next available number)
2. **Evaluate:** Fill in the criteria evaluation section
3. **Discuss:** Share with team/community for feedback
4. **Decide:** Mark status as Accepted/Rejected/Superseded
5. **Implement:** Follow the implementation plan
6. **Update Canon Registry:** Add ADR reference to affected documents

---

## ADR Index

| ADR | Title | Status | Date | Tags |
|-----|-------|--------|------|------|
| [template](template.md) | ADR Template | - | - | meta |

---

## How to Reference ADRs

In spec documents:
```markdown
**See ADR-0001** for the rationale behind this decision.
```

In code comments:
```javascript
// ADR-0001: We chose snake_case for wire format portability
```

In commit messages:
```
feat: add retry_count to boundary_interaction (ADR-0002)
```

---

## Questions?

- **"Do I need an ADR for X?"** → Check the "When to Write an ADR" section above.
- **"What if I disagree with an ADR?"** → Propose a superseding ADR that references the original.
- **"Can ADRs be rejected?"** → Yes! Recording why we *didn't* do something is valuable.

/**
 * HDDL Glossary - Canonical definitions for domain terms
 * Used for tooltips and inline help throughout the UI
 */
export const HDDL_GLOSSARY = {
  'envelope': 'A versioned, steward-owned boundary defining what automation/agents may do, under what constraints, and what must be escalated.',
  'steward': 'A domain-aligned human who holds bounded decision authority. Stewards define and revise envelopes, arbitrate domain conflicts, and preserve human judgment under scale.',
  'boundary interaction': 'When execution reaches an envelope boundary (escalated, overridden, deferred). These are key signals for steward review.',
  'revision': 'An authoritative change to an envelope\'s assumptions or constraints. Revisions create lineage and make authority changes inspectable.',
  'feedback loop': 'The pattern where boundary interactions trigger steward decisions, leading to envelope revisions that update agent behavior.',
  'decision memory': 'AI-assisted recall layer (embeddings) derived from past decisions and events. Supports precedent discovery but does not hold authority.',
  'embedding': 'A vectorized memory of a decision, event, or boundary interaction, used for AI recall and precedent discovery.',
  'agent': 'An automated system or process operating within the constraints of an envelope, subject to escalation and revision by stewards.'
}

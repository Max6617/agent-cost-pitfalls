/**
 * The decision object.
 *
 * Callers render this straight into an audit log and into the "why was I
 * denied?" panel of the console, so every field has to agree with every other
 * one: see `docs/authorization-rules.md` § 5 for the invariants.
 */
const REASONS = {
  allow: 'allowed',
  deny: 'explicit-deny',
  none: 'no-matching-rule',
}

export function explain(subjectId, outcome) {
  const rule = outcome.examined

  if (!rule) {
    return {
      allowed: false,
      effect: 'deny',
      rule: null,
      path: [],
      reason: REASONS.none,
    }
  }

  return {
    allowed: outcome.allowed,
    effect: outcome.effect,
    rule: rule.id,
    path: [subjectId, rule.role, rule.id],
    reason: outcome.allowed ? REASONS.allow : REASONS.deny,
  }
}

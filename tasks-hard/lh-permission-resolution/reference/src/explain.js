/**
 * The decision object.
 *
 * Callers render this straight into an audit log and into the "why was I
 * denied?" panel of the console, so every field has to agree with every other
 * one: see `docs/authorization-rules.md` § 5 for the invariants.
 *
 * The rule reported is the rule the verdict came from, never one that was
 * merely examined on the way, and the path is the route resolution took to get
 * there.
 */
import { routeToRule } from './resolver.js'

const REASONS = {
  allow: 'allowed',
  deny: 'explicit-deny',
  none: 'no-matching-rule',
}

export function explain(subjectId, outcome, resolution) {
  if (!outcome.rule) {
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
    rule: outcome.rule.id,
    path: routeToRule(resolution, subjectId, outcome.rule),
    reason: outcome.allowed ? REASONS.allow : REASONS.deny,
  }
}

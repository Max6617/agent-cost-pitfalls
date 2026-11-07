/**
 * Precedence: which of the candidate rules decides the question.
 *
 * The candidate list arrives in a stable order and the rules are applied in it.
 * `docs/authorization-rules.md` § 4 has the table this has to implement.
 */
import { matches } from './match.js'

/**
 * Walk the candidates until one of them covers the resource.
 *
 * Returns the verdict together with the rule that carried it; `examined` is the
 * last rule the walk looked at, which the explanation needs when the answer is
 * that nothing matched.
 */
export function decide(candidates, resource) {
  let examined = null
  for (const rule of candidates) {
    examined = rule
    if (!matches(rule.resource, resource)) continue
    return {
      effect: rule.effect,
      allowed: rule.effect === 'allow',
      rule,
      examined,
    }
  }
  return { effect: 'deny', allowed: false, rule: null, examined }
}

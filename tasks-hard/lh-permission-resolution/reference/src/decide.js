/**
 * Precedence: which of the candidate rules decides the question.
 *
 * `docs/authorization-rules.md` § 4 has the table this has to implement: an
 * explicit deny anywhere in the candidate list decides the question, and the
 * list has to be read to the end before that can be said.
 */
import { matches } from './match.js'
import { compareIds } from './util/ids.js'

/**
 * Read every candidate that covers the resource and keep the decisive one.
 *
 * `rank(rule)` is how far the rule sits from the subject, which is what breaks
 * a tie between two rules that would both decide the question.
 */
export function decide(candidates, resource, rank = () => 0) {
  let allow = null
  let deny = null

  for (const rule of candidates) {
    if (!matches(rule.resource, resource)) continue
    if (rule.effect === 'deny') {
      if (isNearer(rule, deny, rank)) deny = rule
    } else if (isNearer(rule, allow, rank)) {
      allow = rule
    }
  }

  if (deny) return { effect: 'deny', allowed: false, rule: deny }
  if (allow) return { effect: 'allow', allowed: true, rule: allow }
  return { effect: 'deny', allowed: false, rule: null }
}

/** The rule nearer the subject wins; at the same distance the lower id does. */
function isNearer(rule, current, rank) {
  if (!current) return true
  const distance = rank(rule)
  const known = rank(current)
  if (distance !== known) return distance < known
  return compareIds(rule.id, current.id) < 0
}

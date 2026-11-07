/**
 * Which rules can apply to a subject at all.
 *
 * A rule is a candidate when it is bound to a role the subject effectively
 * holds and when it is about the action being asked about. Nothing else in the
 * service looks at `rule.role` or `rule.action`, so this is the only place
 * where the resolved role set meets the rule table.
 */
import { compareIds } from './util/ids.js'

/**
 * The candidate rules for a resolved role set, in ascending id order so that a
 * decision does not depend on the order the document happened to list them in.
 */
export function candidateRules(graph, roles, action) {
  const held = new Set(roles)
  const candidates = []
  for (const rule of graph.rules.values()) {
    if (!held.has(rule.role)) continue
    if (rule.action !== action) continue
    candidates.push(rule)
  }
  return candidates.sort((a, b) => compareIds(a.id, b.id))
}

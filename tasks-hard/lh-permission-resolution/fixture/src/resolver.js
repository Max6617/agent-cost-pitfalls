/**
 * Who holds what.
 *
 * Resolution is the first half of every decision: turn a subject into the set
 * of roles it effectively holds, so that rule selection can be a set lookup.
 * The arrows it follows are written down in `docs/authorization-rules.md` § 2.
 */
import { unknownSubject } from './errors.js'
import { uniqueSorted } from './util/ids.js'

/**
 * The roles a subject holds, directly and through the groups it is a member of,
 * ascending.
 */
export function effectiveRoles(graph, subjectId) {
  return resolve(graph, subjectId).roles
}

/**
 * The resolution of one subject: the roles it holds, and the name it is known
 * by, which the audit console shows next to a decision.
 */
export function resolve(graph, subjectId) {
  const subject = graph.subjects.get(subjectId)
  if (!subject) throw unknownSubject(subjectId)

  const roles = new Set()

  for (const groupId of subject.groups) {
    const group = graph.groups.get(groupId)
    if (!group) continue
    for (const roleId of group.roles) roles.add(roleId)
  }

  for (const roleId of subject.roles) {
    roles.add(roleId)
    const role = graph.roles.get(roleId)
    if (!role) continue
    for (const inherited of role.roles) roles.add(inherited)
  }

  return { roles: uniqueSorted(roles), name: subject.name }
}

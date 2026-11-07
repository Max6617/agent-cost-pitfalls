/**
 * Who holds what.
 *
 * Resolution is the first half of every decision: turn a subject into the set
 * of roles it effectively holds, so that rule selection can be a set lookup.
 * The arrows it follows are written down in `docs/authorization-rules.md` § 2.
 *
 * The walk is breadth-first-ish over the whole reachable graph rather than a
 * fixed number of hops, and it keeps the route it took to every node so that a
 * decision can report one.
 */
import { cycleError, unknownSubject } from './errors.js'
import { compareIds } from './util/ids.js'

/**
 * The roles a subject holds, directly and through the groups it is a member of,
 * ascending.
 */
export function effectiveRoles(graph, subjectId) {
  return resolve(graph, subjectId).roles
}

/** The nodes `id` points at: groups first, then roles. Rules are not part of it. */
function successors(graph, id) {
  const subject = graph.subjects.get(id)
  if (subject) return [...subject.groups, ...subject.roles]
  const group = graph.groups.get(id)
  if (group) return [...group.groups, ...group.roles]
  const role = graph.roles.get(id)
  if (role) return [...role.roles]
  return []
}

/**
 * The first cycle reachable from `subjectId`, as the ids along it starting and
 * ending with the same one, or null when everything the subject can reach is
 * acyclic.
 *
 * Only what the subject can reach is walked: a loop in a branch nobody holds
 * says nothing about this decision. The stack, not a shared visited set, is
 * what distinguishes a cycle from two routes meeting at the same node.
 */
function findCycle(graph, subjectId) {
  const finished = new Set()
  const route = []
  const onRoute = new Set()

  const walk = (id) => {
    if (onRoute.has(id)) return [...route.slice(route.indexOf(id)), id]
    if (finished.has(id)) return null
    route.push(id)
    onRoute.add(id)
    for (const next of successors(graph, id)) {
      const cycle = walk(next)
      if (cycle) return cycle
    }
    route.pop()
    onRoute.delete(id)
    finished.add(id)
    return null
  }

  return walk(subjectId)
}

/**
 * The best route from the subject to every node it can reach: the shortest one,
 * and among equally short ones the one whose ids sort first.
 *
 * Each improvement is a strict step down a finite order — the reachable graph
 * is acyclic by the time this runs — so the walk settles.
 */
function bestRoutes(graph, subjectId) {
  const routes = new Map([[subjectId, [subjectId]]])
  const pending = [subjectId]

  while (pending.length > 0) {
    const id = pending.pop()
    const route = routes.get(id)
    for (const next of successors(graph, id)) {
      const candidate = [...route, next]
      const known = routes.get(next)
      if (!known || isBetterRoute(candidate, known)) {
        routes.set(next, candidate)
        pending.push(next)
      }
    }
  }

  return routes
}

function isBetterRoute(candidate, known) {
  if (candidate.length !== known.length) return candidate.length < known.length
  for (let i = 0; i < candidate.length; i += 1) {
    if (candidate[i] !== known[i]) return compareIds(candidate[i], known[i]) < 0
  }
  return false
}

/**
 * The resolution of one subject: the roles it holds, the route to each node
 * that got it there, and the name it is known by, which the audit console shows
 * next to a decision.
 */
export function resolve(graph, subjectId) {
  const subject = graph.subjects.get(subjectId)
  if (!subject) throw unknownSubject(subjectId)

  const cycle = findCycle(graph, subjectId)
  if (cycle) throw cycleError(cycle)

  const routes = bestRoutes(graph, subjectId)
  const roles = []
  for (const id of routes.keys()) {
    if (graph.roles.has(id)) roles.push(id)
  }
  roles.sort(compareIds)

  return { roles, routes, name: subject.name }
}

/** The route from the subject down to a rule, rule id included. */
export function routeToRule(resolution, subjectId, rule) {
  const viaRole = resolution.routes.get(rule.role)
  return [...(viaRole ?? [subjectId]), rule.id]
}

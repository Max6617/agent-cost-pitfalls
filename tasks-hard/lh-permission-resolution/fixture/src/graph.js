/**
 * The policy graph.
 *
 * `data/policy.json` — and anything a caller hands to `createEngine` — is four
 * flat lists. Everything in the service works against the indexed form built
 * here, so that a lookup is a Map hit rather than a scan and so that the shape
 * of the document never leaks into the decision code.
 *
 * The document itself is never modified: the editable lists are copied on the
 * way in, because the console keeps rendering the object it passed us.
 */
import { badRule, unknownSubject } from './errors.js'

const list = (value) => (Array.isArray(value) ? value : [])

export function buildGraph(document = {}) {
  const graph = {
    document,
    subjects: new Map(),
    groups: new Map(),
    roles: new Map(),
    rules: new Map(),
  }
  for (const raw of list(document.subjects)) graph.subjects.set(raw.id, normalizeSubject(raw))
  for (const raw of list(document.groups)) graph.groups.set(raw.id, normalizeGroup(raw))
  for (const raw of list(document.roles)) graph.roles.set(raw.id, normalizeRole(raw))
  for (const raw of list(document.rules)) addRule(graph, raw)
  return graph
}

function normalizeSubject(raw) {
  return {
    id: raw.id,
    name: raw.name ?? raw.id,
    groups: [...list(raw.groups)],
    roles: [...list(raw.roles)],
  }
}

function normalizeGroup(raw) {
  return {
    id: raw.id,
    name: raw.name ?? raw.id,
    groups: [...list(raw.groups)],
    roles: [...list(raw.roles)],
  }
}

function normalizeRole(raw) {
  return {
    id: raw.id,
    name: raw.name ?? raw.id,
    roles: [...list(raw.roles)],
  }
}

function normalizeRule(raw) {
  return {
    id: raw.id,
    role: raw.role,
    effect: raw.effect === 'deny' ? 'deny' : 'allow',
    action: raw.action,
    resource: raw.resource,
  }
}

/** Add a rule, or replace the rule that already carries this id. */
export function addRule(graph, raw) {
  if (!raw || !raw.id || !raw.role) throw badRule(raw)
  const rule = normalizeRule(raw)
  graph.rules.set(rule.id, rule)
  return rule
}

/** Remove a rule by id; null when there is nothing to remove. */
export function removeRule(graph, ruleId) {
  const rule = graph.rules.get(ruleId)
  if (!rule) return null
  graph.rules.delete(ruleId)
  return rule
}

export function addMembership(graph, subjectId, groupId) {
  const subject = graph.subjects.get(subjectId)
  if (!subject) throw unknownSubject(subjectId)
  if (!graph.groups.has(groupId)) throw badRule({ id: groupId })
  if (!subject.groups.includes(groupId)) subject.groups.push(groupId)
  return subject
}

export function removeMembership(graph, subjectId, groupId) {
  const subject = graph.subjects.get(subjectId)
  if (!subject) throw unknownSubject(subjectId)
  subject.groups = subject.groups.filter((id) => id !== groupId)
  return subject
}

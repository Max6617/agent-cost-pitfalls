/**
 * The engine.
 *
 * One engine wraps one policy document. The gateway builds it once at boot and
 * asks it questions; the console builds a second one, edits it, and writes the
 * result back to `data/policy.json` when an operator saves.
 */
import { addMembership, addRule, buildGraph, removeMembership, removeRule } from './graph.js'
import { resolve } from './resolver.js'
import { candidateRules } from './rules.js'
import { decide } from './decide.js'
import { explain } from './explain.js'
import { createDecisionCache, decisionKey } from './cache.js'
import { loadConfig, loadPolicy } from './policy.js'
import { unknownSubject } from './errors.js'
import { assertId } from './util/ids.js'
import { log } from './util/log.js'

export class Engine {
  #graph
  #cache
  #generation = 0
  #decisions = 0
  #hits = 0

  constructor(document, options = {}) {
    this.#graph = buildGraph(document)
    this.#cache = createDecisionCache(options.cacheLimit ?? loadConfig().cacheLimit ?? 500)
  }

  get graph() {
    return this.#graph
  }

  /** May `subjectId` perform `action` on `resource`? */
  authorize(subjectId, action, resource) {
    assertId(subjectId, 'subjectId')
    assertId(action, 'action')
    assertId(resource, 'resource')
    if (!this.#graph.subjects.has(subjectId)) throw unknownSubject(subjectId)

    this.#decisions += 1
    const key = decisionKey(subjectId, action, resource)
    const cached = this.#cache.get(key, this.#generation)
    if (cached !== undefined) {
      this.#hits += 1
      return cached
    }

    const resolution = resolve(this.#graph, subjectId)
    const candidates = candidateRules(this.#graph, resolution.roles, action)
    const outcome = decide(candidates, resource)
    const decision = explain(subjectId, outcome)

    this.#cache.set(key, this.#generation, decision)
    if (!decision.allowed) log.debug('denied', subjectId, action, resource, decision.rule)
    return decision
  }

  effectiveRoles(subjectId) {
    assertId(subjectId, 'subjectId')
    return resolve(this.#graph, subjectId).roles
  }

  grant(raw) {
    const rule = addRule(this.#graph, raw)
    this.#invalidate()
    return rule
  }

  revoke(ruleId) {
    assertId(ruleId, 'ruleId')
    return removeRule(this.#graph, ruleId)
  }

  addMember(subjectId, groupId) {
    assertId(subjectId, 'subjectId')
    assertId(groupId, 'groupId')
    return addMembership(this.#graph, subjectId, groupId)
  }

  removeMember(subjectId, groupId) {
    assertId(subjectId, 'subjectId')
    assertId(groupId, 'groupId')
    return removeMembership(this.#graph, subjectId, groupId)
  }

  stats() {
    return {
      decisions: this.#decisions,
      cacheHits: this.#hits,
      cacheSize: this.#cache.size(),
    }
  }

  #invalidate() {
    this.#generation += 1
  }
}

/**
 * An engine over `document`, or over the policy of record when it is left out.
 * The document is not modified; see `src/graph.js`.
 */
export function createEngine(document, options = {}) {
  return new Engine(document ?? loadPolicy(), options)
}

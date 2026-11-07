#!/usr/bin/env node
/**
 * authz - ask the policy of record one question from the shell.
 *
 *   node bin/authz.js u-anna project.read project/42
 *
 * Exists because "the gateway says 403 and the console says 200" is a
 * conversation nobody enjoys having over a screenshot.
 */
import { createEngine } from '../src/index.js'

const [, , subjectId, action, resource] = process.argv
if (!subjectId || !action || !resource) {
  console.error('usage: node bin/authz.js <subject> <action> <resource>')
  process.exit(2)
}

const engine = createEngine()
const decision = engine.authorize(subjectId, action, resource)

console.log(JSON.stringify({ ...decision, path: decision.path.join(' -> ') }, null, 2))

if (decision.allowed) {
  console.log('roles: ' + engine.effectiveRoles(subjectId).join(', '))
} else {
  console.log('denied: ' + decision.reason + (decision.rule ? ' by ' + decision.rule : ''))
}
console.error('stats: ' + JSON.stringify(engine.stats()))

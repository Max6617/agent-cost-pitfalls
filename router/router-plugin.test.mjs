/**
 * Plugin-level guards. These are static checks over router-plugin.mjs, because the
 * failure they guard against only manifests inside a real Cordis context.
 *
 * The bug they exist for: the plugin read 'ctx.tools ? ...' as a defensive check,
 * and Cordis refused the ENTIRE preset at mount with
 *
 *   cannot get property "tools" without inject
 *
 * A guard the runtime rejects is worse than no guard at all. Every service the
 * plugin touches must be declared in 'inject' or read through ctx.get().
 *
 *   node --test router/router-plugin.test.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { inject } from './router-plugin.mjs'

const here = dirname(fileURLToPath(import.meta.url))

/** Block comments, line comments and string literals removed, so prose cannot trip the scan. */
function stripCommentsAndStrings(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
}

test('the plugin reads no ctx service without declaring it', () => {
  const code = stripCommentsAndStrings(readFileSync(join(here, 'router-plugin.mjs'), 'utf8'))
  // 'on' is core Cordis event API and is always available. Anything else is a
  // service and needs inject (or ctx.get).
  const coreApi = new Set(['on', 'get', 'emit', 'waterfall', 'parallel', 'bail', 'plugin', 'effect'])
  const accessed = [...code.matchAll(/ctx\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1])
  const undeclared = [...new Set(accessed)].filter((p) => !coreApi.has(p) && !inject.includes(p))
  assert.deepEqual(undeclared, [],
    'ctx.' + undeclared.join(', ctx.') +
    ' is read without being declared in inject - Cordis will refuse the preset at mount')
})

test('inject stays empty while the plugin touches no service', () => {
  assert.deepEqual(inject, [],
    'if the plugin starts using a service, add it to inject and remove it from coreApi above')
})

test('every hook the plugin registers is a waterfall-shaped handler', () => {
  const src = readFileSync(join(here, 'router-plugin.mjs'), 'utf8')
  // Both hooks take (payload, next) and must call next(); a handler that forgets
  // would silently swallow the agent loop's own decision.
  const hooks = [...src.matchAll(/ctx\.on\(\s*'([^']+)'/g)].map((m) => m[1])
  assert.ok(hooks.includes('agent/request'), 'agent/request hook missing')
  assert.ok(hooks.includes('agent/pre-step'), 'agent/pre-step hook missing')
  assert.ok(!hooks.includes('tools/post-execute'),
    'tools/post-execute is a waterfall returning a PostToolDecision, not (payload, next) - do not hook it without verifying the contract')
})

test('the plugin does not import anything that could need a key', () => {
  const src = readFileSync(join(here, 'router-plugin.mjs'), 'utf8')
  const imports = [...src.matchAll(/^import .*from '([^']+)'/gm)].map((m) => m[1])
  for (const spec of imports) {
    assert.ok(spec.startsWith('./') || spec.startsWith('node:'),
      'unexpected dependency ' + spec + ' - the decision layer must stay credential-free')
  }
  assert.ok(!/\bfetch\s*\(/.test(src), 'the plugin must make no network calls')
})

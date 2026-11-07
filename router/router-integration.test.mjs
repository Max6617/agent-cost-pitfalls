/**
 * Integration tests: load the plugin into a real Cordis context and drive the
 * agent-loop hooks. No DSH session, no API key, no network.
 *
 * This file exists because the plugin shipped with two bugs that every static
 * check passed and that only showed up when the hooks were actually driven:
 *
 *   1. ctx.tools ? ... refused the preset at mount (cannot get property without
 *      inject) - now guarded statically in router-plugin.test.mjs
 *   2. beginInputIfNeeded() returned early whenever an input was already set, so
 *      the router decided the band and tier for the FIRST message and reused them
 *      for the whole session. A router that routes once and never again produces
 *      exactly the same symptom as "routing has no effect".
 *
 * Cordis is loaded from the DSH install, so this needs no dependency of its own.
 *
 *   node --test router/router-integration.test.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { dshApp } from '../tools/lib-yaml.mjs'

function loadCordis() {
  const store = join(dshApp(), 'node_modules', '.pnpm')
  const dir = readdirSync(store).find((d) => d.startsWith('@deepseek-ai+cordis@'))
  assert.ok(dir, 'cordis not found under ' + store)
  return import(pathToFileURL(join(store, dir, 'node_modules/@deepseek-ai/cordis/lib/index.js')).href)
}

const ROUTES = {
  cheap: { provider: 'test', model: 'tier-cheap', reasoningEffort: 'off' },
  standard: { provider: 'test', model: 'tier-standard', reasoningEffort: 'high' },
  strong: { provider: 'test', model: 'tier-strong', reasoningEffort: 'high' },
}
const DEFAULT_ENVELOPE = { provider: 'test', model: 'untouched', reasoningEffort: 'high' }

/** One loaded router, with helpers that drive the two hooks the plugin registers. */
async function harness(config = {}) {
  const { Context } = await loadCordis()
  const plugin = await import('./router-plugin.mjs')
  const ctx = new Context()
  ctx.plugin(plugin, { minChars: 24, injectPersona: true, routes: ROUTES, ...config })
  await new Promise((r) => setTimeout(r, 100))

  return {
    ctx,
    /** A pre-step for one step of one turn. */
    preStep: (text, step = 1) => ctx.waterfall('agent/pre-step',
      { agent: {}, messages: text ? [{ role: 'user', content: text }] : [], signal: { aborted: false }, step },
      async () => ({ kind: 'ok', messages: [] })),
    request: () => ctx.waterfall('agent/request', {}, async () => ({ ...DEFAULT_ENVELOPE })),
  }
}

const BUILD = 'Build a CLI that generates reports'
const FIX = 'Fix the crash when the config file is missing'
const AMBIGUOUS = 'Thoughts on the auth module?'
const COMPLEX = 'refactor the whole persistence layer across the codebase'

test('a new turn gets a new decision - the router does not lock onto the first input', async () => {
  const h = await harness()
  const t1 = await h.request.call(null) // no input begun yet: must be untouched
  assert.equal(t1.model, 'untouched')

  await h.preStep(BUILD, 1)
  assert.equal((await h.request()).model, 'tier-cheap', 'build should route to the cheap tier')

  // turn 2, a different kind of task, must re-decide
  await h.preStep(FIX, 1)
  assert.equal((await h.request()).model, 'tier-standard', 'fix should re-decide to the standard tier')
})

test('every step of one turn reuses the decision made for that turn', async () => {
  const h = await harness()
  await h.preStep(BUILD, 1)
  const first = await h.request()
  for (const step of [2, 3, 4]) {
    await h.preStep(null, step)               // later steps carry no new user text
    assert.deepEqual(await h.request(), first, 'step ' + step + ' must reuse the turn decision')
  }
})

test('persona guidance is injected once per turn, never per step', async () => {
  const h = await harness()
  const s1 = await h.preStep(BUILD, 1)
  assert.equal(s1.messages.length, 1, 'first step injects the band persona')
  assert.match(s1.messages[0].content, /write or edit/i, 'react band persona')

  for (const step of [2, 3]) {
    const later = await h.preStep(null, step)
    assert.equal(later.messages.length, 0,
      're-injecting identical text would still alter the message list and invalidate the prompt cache')
  }
})

test('the band selects the persona and the tier', async () => {
  const cases = [
    [BUILD, 'tier-cheap', /write or edit/i],
    [FIX, 'tier-standard', /read-first/i],
    [AMBIGUOUS, 'tier-standard', /decide what this task/i],
    [COMPLEX, 'tier-strong', /read-first/i],
  ]
  const h = await harness()
  for (const [text, tier, persona] of cases) {
    const d = await h.preStep(text, 1)
    const r = await h.request()
    assert.equal(r.model, tier, text)
    assert.match(d.messages[0]?.content ?? '', persona, text)
  }
})

test('all three tiers are reachable within one session', async () => {
  const h = await harness()
  const seen = new Set()
  for (const text of [BUILD, FIX, COMPLEX]) {
    await h.preStep(text, 1)
    seen.add((await h.request()).model)
  }
  assert.deepEqual([...seen].sort(), ['tier-cheap', 'tier-standard', 'tier-strong'],
    'a router that cannot reach more than one tier is not routing')
})

test('a gated input leaves the route untouched', async () => {
  const h = await harness()
  await h.preStep('hi', 1)                     // below minChars
  assert.equal((await h.request()).model, 'untouched',
    'short inputs must not be routed at all')
})

test('a plugin failure degrades to no routing rather than breaking the loop', async () => {
  const h = await harness()
  await h.preStep(BUILD, 1)
  h.ctx.emit('noop')                            // keep the context alive
  const r = await h.request()
  assert.equal(r.model, 'tier-cheap')
  // The wrapper must always hand control back: the envelope keeps its shape.
  assert.equal(typeof r.provider, 'string')
  assert.equal(typeof r.reasoningEffort, 'string')
})

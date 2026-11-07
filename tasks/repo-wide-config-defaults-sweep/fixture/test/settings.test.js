import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULTS, setting, isKnown, defaultFor, allKeys, typeOf, check, resolveAll, LIMITS } from '../src/settings.js'
import { makeClient, settingsFrom } from '../src/http.js'
import { Cache } from '../src/cache.js'
import { makeLogger } from '../src/log.js'
import { paginate, themeFor } from '../src/paging.js'

/** A settings reader over a plain object, with defaults applied. */
function reader(stored = {}) {
  return { get: (key) => setting(stored, key) }
}

test('the defaults are the whole surface of the app', () => {
  assert.deepEqual(allKeys(), [
    'cache.maxEntries',
    'cache.ttlMs',
    'http.maxRedirects',
    'http.timeoutMs',
    'log.includeStack',
    'log.level',
    'retry.attempts',
    'retry.baseDelayMs',
    'ui.pageSize',
    'ui.theme',
  ])
})

test('a missing value falls back to the default', () => {
  assert.equal(setting({}, 'retry.attempts'), 3)
  assert.equal(setting({ 'retry.attempts': 7 }, 'retry.attempts'), 7)
})

test('a stored false or zero is respected rather than replaced', () => {
  assert.equal(setting({ 'log.includeStack': false }, 'log.includeStack'), false)
  assert.equal(setting({ 'retry.attempts': 0 }, 'retry.attempts'), 0)
})

test('an unknown setting is an error rather than a silent default', () => {
  assert.equal(isKnown('nope'), false)
  assert.throws(() => setting({}, 'nope'), /unknown setting/)
})

test('the type of a setting follows its default', () => {
  assert.equal(typeOf('log.level'), 'string')
  assert.equal(typeOf('ui.pageSize'), 'number')
  assert.equal(typeOf('log.includeStack'), 'boolean')
  assert.equal(defaultFor('cache.ttlMs'), 30000)
})

test('a value of the wrong type is reported', () => {
  assert.deepEqual(check('ui.pageSize', 'big'), ['ui.pageSize must be number'])
})

test('a value outside its limits is reported', () => {
  assert.deepEqual(check('ui.pageSize', 5000), ['ui.pageSize must be between 1 and 200'])
  assert.deepEqual(check('retry.attempts', 99), ['retry.attempts must be between 0 and 10'])
})

test('limits only exist for the settings that have them', () => {
  assert.equal(LIMITS['cache.ttlMs'], undefined)
  assert.deepEqual(check('cache.ttlMs', 1), [])
})

test('resolving fills in every default', () => {
  const all = resolveAll({ 'ui.theme': 'dark' })
  assert.equal(all['ui.theme'], 'dark')
  assert.equal(all['retry.attempts'], 3)
  assert.deepEqual(Object.keys(all).sort(), allKeys())
})

test('the http client takes both limits from settings', () => {
  const client = makeClient({ settings: reader({ 'http.timeoutMs': 1234, 'http.maxRedirects': 2 }) })
  assert.equal(client.timeoutFor(), 1234)
  assert.equal(client.redirectsFor(), 2)
})

test('the http client falls back to the shared defaults', () => {
  const client = makeClient({ settings: reader() })
  assert.equal(client.timeoutFor(), DEFAULTS['http.timeoutMs'])
  assert.equal(client.redirectsFor(), DEFAULTS['http.maxRedirects'])
})

test('the retry count is one setting, used once', async () => {
  let calls = 0
  const waits = []
  const client = makeClient({
    settings: reader({ 'retry.attempts': 2, 'retry.baseDelayMs': 10 }),
    fetchImpl: async () => { calls += 1; return { status: 503 } },
    sleep: async (ms) => waits.push(ms),
  })

  await client.get('https://example.com')
  assert.equal(calls, 3)
  assert.deepEqual(waits, [10, 10])
})

test('a client error is not retried', async () => {
  let calls = 0
  const client = makeClient({
    settings: reader(),
    fetchImpl: async () => { calls += 1; return { status: 404 } },
  })
  await client.get('https://example.com')
  assert.equal(calls, 1)
})

test('the cache reads its ceiling from settings', () => {
  const settings = reader({ 'cache.maxEntries': 2 })
  const cache = new Cache({ settings, now: () => 0 })
  cache.put('a', 1).put('b', 2).put('c', 3)
  assert.equal(cache.entries.size, 2)
  assert.equal(cache.take('a'), undefined)
})

test('the cache reads its ttl from settings', () => {
  let t = 0
  const cache = new Cache({ settings: reader({ 'cache.ttlMs': 100 }), now: () => t })
  cache.put('a', 1)
  t = 100
  assert.equal(cache.take('a'), undefined)
})

test('the cache defaults apply when nothing is stored', () => {
  const cache = new Cache({ settings: reader(), now: () => 0 })
  assert.equal(cache.ttlMs, DEFAULTS['cache.ttlMs'])
  assert.equal(cache.maxEntries, DEFAULTS['cache.maxEntries'])
})

test('the logger level comes from settings', () => {
  const seen = []
  const logger = makeLogger({ settings: reader({ 'log.level': 'warn' }), sink: (r) => seen.push(r) })
  logger.debug('a')
  logger.info('b')
  logger.warn('c')
  assert.deepEqual(seen.map((r) => r.message), ['c'])
})

test('the stack is attached only when the setting says so', () => {
  const withStack = []
  makeLogger({ settings: reader({ 'log.includeStack': true }), sink: (r) => withStack.push(r) }).error('x', new Error('boom'))
  assert.equal(typeof withStack[0].stack, 'string')

  const without = []
  makeLogger({ settings: reader(), sink: (r) => without.push(r) }).error('x', new Error('boom'))
  assert.equal(without[0].stack, undefined)
})

test('paging uses the shared page size', () => {
  const items = Array.from({ length: 10 }, (_, i) => i)
  assert.deepEqual(paginate(items, { settings: reader({ 'ui.pageSize': 3 }), page: 2 }).items, [3, 4, 5])
  assert.equal(paginate(items, { settings: reader() }).size, DEFAULTS['ui.pageSize'])
})

test('the theme falls back to the default', () => {
  assert.equal(themeFor(reader()), 'system')
  assert.equal(themeFor(reader({ 'ui.theme': 'dark' })), 'dark')
})

test('every module agrees on the same default source', () => {
  const settings = reader()
  const values = [
    makeClient({ settings }).timeoutFor(),
    new Cache({ settings }).maxEntries,
    makeLogger({ settings }).level(),
    paginate([], { settings }).size,
  ]
  assert.deepEqual(values, [DEFAULTS['http.timeoutMs'], DEFAULTS['cache.maxEntries'], DEFAULTS['log.level'], DEFAULTS['ui.pageSize']])
})

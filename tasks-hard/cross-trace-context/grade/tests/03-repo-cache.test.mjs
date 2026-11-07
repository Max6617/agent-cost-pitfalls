// Sub-problem 3: the repository and the cache. They report into the request
// span, the cache never rewrites what it stored, and a replay is a fact about
// the request that replayed it.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createApp,
  createCache,
  createEventBus,
  createFixedClock,
  createIdFactory,
  createRepository,
  ofKind,
} from '../src/index.js'

const ids = (seed = 120) => createIdFactory({ seed, prefix: 'rc-' })
const USER = { authorization: 'Bearer tok-user-42' }

const newApp = (overrides = {}) => {
  const clock = createFixedClock()
  const events = createEventBus({ clock })
  const app = createApp({ clock, events, idGen: ids(), ...overrides })
  return { app, events, clock }
}

test('a replayed cache entry is reported under the current trace, not the one that filled it', async () => {
  const { app, events } = newApp()
  const first = await app.request({ method: 'GET', path: '/read/r-1' })
  events.clear()
  const second = await app.request({ method: 'GET', path: '/read/r-1' })

  const [hit] = ofKind(events.events(), 'cache')
  assert.equal(hit.name, 'cache.hit')
  assert.equal(hit.traceId, second.span.traceId)
  assert.equal(hit.spanId, second.span.spanId)
  assert.notEqual(hit.traceId, first.span.traceId, 'the replay was attributed to the span that filled the cache')
  assert.equal(second.body.cached, true)
})

test('the cache does not rewrite the record it stored', async () => {
  const { app } = newApp()
  await app.request({ method: 'GET', path: '/read/r-1' })
  const replayed = await app.request({ method: 'GET', path: '/read/r-1' })

  assert.deepEqual(replayed.body.record, { id: 'r-1', tenant: 'acme', status: 'open', total: '120.00' })
  const stored = app.cache.lookup('record:r-1')
  assert.equal(stored.hit, true)
  assert.deepEqual(stored.record, { id: 'r-1', tenant: 'acme', status: 'open', total: '120.00' })

  // A read with nothing running is anonymous: the keys are there and empty,
  // never null and never missing.
  const clock = createFixedClock()
  const events = createEventBus({ clock })
  const cache = createCache({ events })
  const repository = createRepository({ records: [{ id: 'x-1', total: '1.00' }] })
  const record = await repository.get('x-1')
  cache.lookup('record:x-1')
  assert.equal(record.id, 'x-1')
  const [miss] = ofKind(events.events(), 'cache')
  for (const key of ['traceId', 'spanId', 'parentSpanId']) {
    assert.equal(miss[key], undefined, key + ' must be an empty key, not ' + String(miss[key]))
  }
  assert.deepEqual(Object.keys(miss).sort(), ['at', 'meta', 'name', 'parentSpanId', 'spanId', 'traceId'])
})

test('a write and the read after it are reported in their own request spans', async () => {
  const { app, events } = newApp()
  const written = await app.request({
    method: 'PUT',
    path: '/read/r-2',
    headers: USER,
    body: { status: 'open', total: '5.00' },
  })
  assert.equal(written.status, 200)

  events.clear()
  const read = await app.request({ method: 'GET', path: '/read/r-2' })
  assert.equal(read.body.record.total, '5.00')
  assert.equal(read.body.cached, false, 'the write left a stale entry behind')
  for (const event of events.events()) {
    assert.equal(event.traceId, read.span.traceId, event.name + ' is attributed to another request')
  }
})

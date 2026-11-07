// Sub-problem 1: the context object itself - what a root is, what a child is,
// and what "there is no context" is allowed to look like.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AppError,
  anonymousContext,
  beginChild,
  beginTrace,
  contextOrAnonymous,
  createApp,
  createEventBus,
  createFixedClock,
  createIdFactory,
  currentContext,
  fields,
  mapError,
  runInContext,
} from '../src/index.js'

const ids = (seed = 0) => createIdFactory({ seed, prefix: 'g-' })

test('a root span mints a trace id and has no parent', () => {
  const span = beginTrace({ idGen: ids(1) })
  assert.equal(typeof span.traceId, 'string')
  assert.ok(span.traceId.length > 0)
  assert.equal(typeof span.spanId, 'string')
  assert.equal(span.parentSpanId, undefined)

  const gen = ids(2)
  const parent = beginTrace({ idGen: gen })
  const child = beginChild(parent, { idGen: gen })
  assert.equal(child.traceId, parent.traceId, 'a derived span started a trace of its own')
  assert.equal(child.parentSpanId, parent.spanId)
  assert.notEqual(child.spanId, parent.spanId)

  const orphan = beginChild(anonymousContext(), { idGen: ids(5) })
  assert.equal(typeof orphan.traceId, 'string')
  assert.equal(orphan.parentSpanId, undefined, 'a span with no real parent is a root')
})

test('the anonymous context serialises as three empty keys', () => {
  const anonymous = fields(anonymousContext())
  assert.deepEqual(Object.keys(anonymous).sort(), ['parentSpanId', 'spanId', 'traceId'])
  assert.equal(anonymous.traceId, undefined)
  assert.equal(anonymous.spanId, undefined)
  assert.equal(anonymous.parentSpanId, undefined)
  assert.equal(fields(undefined).traceId, undefined, 'a missing context is three empty keys, not null')
  assert.equal(fields(null).spanId, undefined, 'a null context is three empty keys, not null')

  const span = beginTrace({ idGen: ids(6) })
  runInContext(span, () => {
    runInContext(undefined, () => {
      assert.ok(currentContext() !== undefined, 'a non-existent context must not become undefined')
      assert.deepEqual(fields(currentContext()), { traceId: undefined, spanId: undefined, parentSpanId: undefined })
    })
    assert.equal(currentContext().spanId, span.spanId, 'the previous context was not restored')
  })
})

test('every event of a request has the three context fields', async () => {
  const clock = createFixedClock()
  const events = createEventBus({ clock })
  const app = createApp({ clock, events, idGen: ids(8) })
  await app.request({ method: 'GET', path: '/read/r-1' })

  assert.ok(events.events().length >= 3)
  for (const event of events.events()) {
    assert.deepEqual(
      Object.keys(event).sort(),
      ['at', 'meta', 'name', 'parentSpanId', 'spanId', 'traceId'],
      event.name + ' has the wrong envelope',
    )
    for (const key of ['traceId', 'spanId', 'parentSpanId']) {
      assert.notEqual(event[key], null, event.name + ' wrote null for ' + key)
      assert.ok(key in event, event.name + ' is missing ' + key)
    }
    for (const key of ['traceId', 'spanId']) {
      assert.ok(typeof event[key] === 'string' && event[key].length > 0, event.name + ' has no ' + key)
    }
    for (const key of ['traceId', 'spanId', 'parentSpanId']) {
      assert.equal(key in event.meta, false, event.name + ' repeated ' + key + ' in meta')
    }
  }
})

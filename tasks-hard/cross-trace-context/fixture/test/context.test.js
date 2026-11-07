import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createIdFactory,
  createEventBus,
  createFixedClock,
  createApp,
  fields,
  anonymousContext,
  contextOrAnonymous,
  currentContext,
  beginTrace,
  beginChild,
  runInContext,
} from '../src/index.js'

const ids = () => createIdFactory({ seed: 0, prefix: 'v-' })

test('a root span mints a trace and has no parent', () => {
  const span = beginTrace({ idGen: ids() })
  assert.equal(typeof span.traceId, 'string')
  assert.equal(typeof span.spanId, 'string')
  assert.equal(span.parentSpanId, undefined)
  assert.notEqual(span.traceId, span.spanId)
})

test('a derived span keeps the trace and points at the span it came from', () => {
  const parent = beginTrace({ idGen: ids() })
  const child = beginChild(parent, { idGen: ids() })
  assert.equal(child.traceId, parent.traceId)
  assert.equal(child.parentSpanId, parent.spanId)
  assert.notEqual(child.spanId, parent.spanId)
})

test('a span derived from the anonymous context is a root', () => {
  const span = beginChild(anonymousContext(), { idGen: ids() })
  assert.equal(typeof span.traceId, 'string')
  assert.equal(span.parentSpanId, undefined)
})

test('fields() of a missing context is three empty keys, not null', () => {
  assert.deepEqual(fields(undefined), { traceId: undefined, spanId: undefined, parentSpanId: undefined })
  assert.deepEqual(Object.keys(fields(undefined)).sort(), ['parentSpanId', 'spanId', 'traceId'])
  assert.deepEqual(fields(anonymousContext()), { traceId: undefined, spanId: undefined, parentSpanId: undefined })
})

test('running without a context is legal and does not leak the caller', () => {
  const span = beginTrace({ idGen: ids() })
  runInContext(span, () => {
    runInContext(undefined, () => {
      assert.deepEqual(fields(contextOrAnonymous()), { traceId: undefined, spanId: undefined, parentSpanId: undefined })
    })
    assert.equal(currentContext().spanId, span.spanId)
  })
})

test('two requests do not share a trace id', async () => {
  const clock = createFixedClock()
  const events = createEventBus({ clock })
  const app = createApp({ clock, events, idGen: ids() })

  const first = await app.request({ method: 'GET', path: '/status' })
  const second = await app.request({ method: 'GET', path: '/status' })
  assert.notEqual(first.span.traceId, second.span.traceId)
})

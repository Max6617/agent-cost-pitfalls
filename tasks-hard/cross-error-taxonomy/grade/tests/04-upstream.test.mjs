// Sub-problem 4: the outbound client and the queue publisher.
import test from 'node:test'
import assert from 'node:assert/strict'
import { newContext, createOutbound, createPublisher, isDomainError } from '../src/index.js'

const ctx = newContext('req-4')

const failure = (work) => {
  try {
    work()
    return null
  } catch (error) {
    return error
  }
}

const recorder = (answer) => {
  const calls = []
  return {
    calls,
    transport(request) {
      calls.push(request)
      if (answer instanceof Error) throw answer
      return answer
    },
  }
}

test('a 2xx answer is the body, and every call carries the correlation id', () => {
  const ok = recorder({ status: 200, body: { rate: '1.090000' } })
  const body = createOutbound(ok.transport).send({ method: 'GET', path: '/v1/rates', headers: { accept: 'application/json' } }, { ctx })
  assert.deepEqual(body, { rate: '1.090000' })
  assert.equal(ok.calls.length, 1)
  assert.equal(ok.calls[0].headers['x-correlation-id'], 'req-4')
  assert.equal(ok.calls[0].headers.accept, 'application/json')

  const missing = failure(() => createOutbound(() => ({ status: 404, body: {} })).send({ method: 'GET', path: '/v1/rates/EUR' }, { ctx }))
  assert.ok(isDomainError(missing))
  assert.equal(missing.code, 'NOT_FOUND')
})

test('every answer the far side can give has a code of its own', () => {
  const table = [
    [500, 'UPSTREAM_UNAVAILABLE'],
    [503, 'UPSTREAM_UNAVAILABLE'],
    [429, 'RATE_LIMITED'],
    [502, 'UPSTREAM_UNAVAILABLE'],
    [400, 'UPSTREAM_REJECTED'],
    [409, 'DUPLICATE_JOB'],
  ]
  for (const [status, code] of table) {
    const error = failure(() => createOutbound(() => ({ status, body: {} })).send({ method: 'POST', path: '/v1/jobs' }, { ctx }))
    assert.ok(isDomainError(error), 'status ' + status)
    assert.equal(error.code, code, 'status ' + status)
  }

  const socket = new Error('socket hang up')
  const error = failure(() => createOutbound(recorder(socket).transport).send({ method: 'GET', path: '/v1/rates' }, { ctx }))
  assert.ok(isDomainError(error))
  assert.equal(error.code, 'UPSTREAM_UNAVAILABLE')
  assert.equal(error.retryable, true)
})

test('a condition worth retrying is not a decision to retry this operation', () => {
  const unavailable = () => ({ status: 503, body: {} })

  const readable = failure(() => createOutbound(unavailable).send({ method: 'GET', path: '/v1/rates' }, { ctx }))
  assert.equal(readable.code, 'UPSTREAM_UNAVAILABLE')
  assert.equal(readable.retryable, true)

  const write = failure(() => createOutbound(unavailable).send({ method: 'POST', path: '/v1/rates' }, { ctx, idempotent: false }))
  assert.equal(write.code, 'UPSTREAM_UNAVAILABLE')
  assert.equal(write.retryable, false)

  const limited = failure(() => createOutbound(() => ({ status: 429, body: {} })).send({ method: 'POST', path: '/v1/jobs' }, { ctx, idempotent: false }))
  assert.equal(limited.code, 'RATE_LIMITED')
  assert.equal(limited.retryable, false)

  const published = failure(() => createPublisher(() => ({ status: 503 })).publish('mail', { jobId: 'j-1' }, { ctx, idempotent: false }))
  assert.equal(published.code, 'DEPENDENCY_UNAVAILABLE')
  assert.equal(published.retryable, false)

  const publishedOnce = failure(() => createPublisher(() => ({ status: 503 })).publish('mail', { jobId: 'j-2' }, { ctx }))
  assert.equal(publishedOnce.retryable, true)
})

test('an envelope the broker cannot name is refused before the broker sees it', () => {
  const broker = recorder({ status: 200 })
  const publisher = createPublisher(broker.transport)

  const nameless = failure(() => publisher.publish('mail', { to: 'ops@example.com' }, { ctx }))
  assert.equal(nameless.code, 'VALIDATION_FAILED')
  assert.deepEqual(nameless.details, { fields: ['jobId'] })
  assert.equal(broker.calls.length, 0)

  const accepted = publisher.publish('mail', { jobId: 'j-1', to: 'ops@example.com' }, { ctx })
  assert.equal(accepted.accepted, true)
  assert.equal(accepted.envelope.jobId, 'j-1')
  assert.equal(accepted.envelope.correlationId, 'req-4')
  assert.equal(broker.calls.length, 1)

  const duplicate = failure(() => createPublisher(() => ({ status: 409 })).publish('mail', { jobId: 'j-1' }, { ctx }))
  assert.equal(duplicate.code, 'DUPLICATE_JOB')

  const down = failure(() => createPublisher(() => ({ status: 503 })).publish('mail', { jobId: 'j-3' }, { ctx }))
  assert.equal(down.code, 'DEPENDENCY_UNAVAILABLE')
  assert.deepEqual(down.details, { status: 503 })

  const unreachable = failure(() => createPublisher(recorder(new Error('broker down')).transport).publish('mail', { jobId: 'j-4' }, { ctx }))
  assert.equal(unreachable.code, 'DEPENDENCY_UNAVAILABLE')
  assert.equal(unreachable.retryable, true)
})

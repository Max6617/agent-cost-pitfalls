import test from 'node:test'
import assert from 'node:assert/strict'
import { Scheduler, createService, renderReport } from '../src/index.js'

test('the scheduler ticks every tickMs', () => {
  const ticks = new Scheduler({ tickMs: 500 }).ticksUntil(2000)
  assert.deepEqual(ticks, [0, 500, 1000, 1500])
})

test('the report writes the timeout, the TTL and the tick in the documented form', () => {
  const report = renderReport(createService())
  assert.match(report, /^client\.timeout: 1\.5s$/m)
  assert.match(report, /^cache\.ttl: 2\.5s$/m)
  assert.match(report, /^scheduler\.tick: 500ms$/m)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { trialStatus } from '../src/index.js'

test('the trial is over on day start + lengthDays', () => {
  const status = trialStatus({ start: 1, lengthDays: 14 }, 15)
  assert.equal(status.active, false)
  assert.equal(status.daysLeft, 0)
})

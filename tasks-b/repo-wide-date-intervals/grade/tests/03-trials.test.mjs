// Sub-problem 3: trials - a trial covers exactly lengthDays days and is
// over on day start + lengthDays.
import test from 'node:test'
import assert from 'node:assert/strict'
import { trialStatus, billableDays } from '../src/index.js'

test('a trial covers exactly lengthDays days', () => {
  const status = trialStatus({ start: 1, lengthDays: 14 }, 1)
  assert.deepEqual(status, { active: true, daysLeft: 14, endsOn: 15 })
})

test('the trial is over on day start + lengthDays', () => {
  const status = trialStatus({ start: 1, lengthDays: 14 }, 15)
  assert.deepEqual(status, { active: false, daysLeft: 0, endsOn: 15 })
})

test('a trial that has not started is inactive with its full length ahead', () => {
  const status = trialStatus({ start: 10, lengthDays: 7 }, 3)
  assert.deepEqual(status, { active: false, daysLeft: 7, endsOn: 17 })
})

test('the last trial day is covered, and a cycle equal to the trial bills exactly its length', () => {
  const trial = { start: 1, lengthDays: 14 }
  assert.deepEqual(trialStatus(trial, 14), { active: true, daysLeft: 1, endsOn: 15 })
  assert.equal(billableDays({ start: 1, end: 15 }, { start: 1, end: 15 }), 14)
})

// Sub-problem 6: campaigns - a stay that shares no days with the plan
// window has no plan window at all, and only the days inside price at the
// plan rate.
import test from 'node:test'
import assert from 'node:assert/strict'
import { effectiveWindow, planNights } from '../src/index.js'

test('a stay after the plan window earns no plan nights', () => {
  assert.equal(planNights({ start: 10, end: 20 }, { start: 30, end: 40 }), 0)
})

test('a stay before the plan window has no effective window at all', () => {
  assert.equal(effectiveWindow({ start: 10, end: 20 }, { start: 1, end: 5 }), null)
})

test('a stay that only touches the window shares no days with it', () => {
  const plan = { start: 10, end: 20 }
  assert.equal(effectiveWindow(plan, { start: 20, end: 30 }), null)
  assert.equal(planNights(plan, { start: 20, end: 30 }), 0)
})

test('the nights inside the window price at the plan rate', () => {
  assert.equal(planNights({ start: 10, end: 20 }, { start: 5, end: 15 }), 5)
})

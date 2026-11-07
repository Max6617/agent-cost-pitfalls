import test from 'node:test'
import assert from 'node:assert/strict'
import { planNights } from '../src/index.js'

test('a stay outside the plan window gets no plan nights', () => {
  assert.equal(planNights({ start: 10, end: 20 }, { start: 30, end: 40 }), 0)
})

test('the nights inside the window price at the plan rate', () => {
  assert.equal(planNights({ start: 10, end: 20 }, { start: 5, end: 15 }), 5)
})

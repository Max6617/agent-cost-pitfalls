// Sub-problem 1: percent splits are exact-cent integer arithmetic
// (docs/split-rules.md section 1-2).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createGroup } from '../src/index.js'

const trio = () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('bob')
  g.addMember('cid')
  return g
}

test('an even percent split divides exactly', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  const { id } = g.addExpense({
    paidBy: 'amy', cents: 1000,
    split: { mode: 'percent', percents: { amy: 50, zoe: 50 } },
  })
  assert.deepEqual(g.expenseById(id).shares, { amy: 500, zoe: 500 })
  assert.deepEqual(g.balances(), { amy: 500, zoe: -500 })
})

test('a percent share is floored from the exact value, not a float ratio', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  const { id } = g.addExpense({
    paidBy: 'zoe', cents: 3500,
    split: { mode: 'percent', percents: { amy: 29, zoe: 71 } },
    among: ['zoe', 'amy'],
  })
  // 29% of 3500 is exactly 1015; 71% is exactly 2485
  assert.deepEqual(g.expenseById(id).shares, { amy: 1015, zoe: 2485 })
})

test('percent shares across three members each land on their exact cent', () => {
  const g = trio()
  const { id } = g.addExpense({
    paidBy: 'cid', cents: 3500,
    split: { mode: 'percent', percents: { amy: 29, bob: 35, cid: 36 } },
    among: ['bob', 'cid', 'amy'],
  })
  assert.deepEqual(g.expenseById(id).shares, { amy: 1015, bob: 1225, cid: 1260 })
  assert.deepEqual(g.balances(), { amy: -1015, bob: -1225, cid: 2240 })
})

test('a payer who is not among the participants still fronts the exact shares', () => {
  const g = trio()
  const { status } = g.addExpense({
    paidBy: 'bob', cents: 3500,
    split: { mode: 'percent', percents: { amy: 71, cid: 29 } },
    among: ['amy', 'cid'],
  })
  assert.equal(status, 'added')
  // bob partook in nothing; amy and cid owe their exact shares
  assert.deepEqual(g.balances(), { amy: -2485, bob: 3500, cid: -1015 })
})

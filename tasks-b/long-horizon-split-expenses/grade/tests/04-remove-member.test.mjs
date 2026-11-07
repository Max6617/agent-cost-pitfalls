// Sub-problem 4: removing a member is refused while their balance is not
// exactly zero, and a refusal changes nothing (docs/split-rules.md section 5).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createGroup } from '../src/index.js'

test('a member at zero leaves cleanly', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  assert.deepEqual(g.removeMember('zoe'), { status: 'removed' })
  assert.deepEqual(g.members(), ['amy'])
  assert.deepEqual(g.balances(), { amy: 0 })
})

test('a member who still owes is refused, and stays on the book', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  g.addExpense({ paidBy: 'amy', cents: 1000, split: { mode: 'exact', amounts: { zoe: 1000 } }, among: ['zoe'] })
  assert.deepEqual(g.removeMember('zoe'), { status: 'unsettled-balance' })
  assert.deepEqual(g.members(), ['amy', 'zoe'])
  assert.deepEqual(g.balances(), { amy: 1000, zoe: -1000 })
})

test('a partly repaid debt still blocks removal, for what is left', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  g.addExpense({ paidBy: 'amy', cents: 1000, split: { mode: 'exact', amounts: { zoe: 1000 } }, among: ['zoe'] })
  g.recordSettlement({ from: 'zoe', to: 'amy', cents: 400 })
  assert.deepEqual(g.removeMember('zoe'), { status: 'unsettled-balance' })
  assert.deepEqual(g.recompute(), { amy: 600, zoe: -600 })
})

test('a refused removal leaves the group as if it was never attempted', () => {
  const g = createGroup()
  for (const id of ['amy', 'bob', 'cid']) g.addMember(id)
  g.addExpense({ paidBy: 'amy', cents: 900, split: { mode: 'exact', amounts: { bob: 900 } }, among: ['bob'] })
  assert.deepEqual(g.removeMember('bob'), { status: 'unsettled-balance' })
  // the next expense still splits across all three, bob included
  const { id } = g.addExpense({ paidBy: 'cid', cents: 300, split: { mode: 'equal' } })
  assert.deepEqual(g.expenseById(id).shares, { amy: 100, bob: 100, cid: 100 })
  assert.deepEqual(g.recompute(), { amy: 800, bob: -1000, cid: 200 })
})

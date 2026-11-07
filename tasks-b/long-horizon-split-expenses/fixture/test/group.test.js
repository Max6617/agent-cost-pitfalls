// Reproductions for the group-level rules: balances after payments, settle-up
// suggestions, and removing a member. The contract is docs/split-rules.md.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createGroup } from '../src/index.js'

test('a single debt suggests a single transfer', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  g.addExpense({ paidBy: 'amy', cents: 1000, split: { mode: 'exact', amounts: { zoe: 1000 } }, among: ['zoe'] })
  assert.deepEqual(g.suggestSettlements(), [{ from: 'zoe', to: 'amy', cents: 1000 }])
})

test('a loop of debts that cancels out suggests nothing', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('bob')
  g.addMember('cid')
  g.addExpense({ paidBy: 'amy', cents: 1000, split: { mode: 'exact', amounts: { bob: 1000 } }, among: ['bob'] })
  g.addExpense({ paidBy: 'bob', cents: 1000, split: { mode: 'exact', amounts: { cid: 1000 } }, among: ['cid'] })
  g.addExpense({ paidBy: 'cid', cents: 1000, split: { mode: 'exact', amounts: { amy: 1000 } }, among: ['amy'] })
  assert.deepEqual(g.suggestSettlements(), [])
})

test('a member who still owes cannot be removed', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  g.addExpense({ paidBy: 'amy', cents: 1000, split: { mode: 'exact', amounts: { zoe: 1000 } }, among: ['zoe'] })
  assert.deepEqual(g.removeMember('zoe'), { status: 'unsettled-balance' })
  assert.deepEqual(g.balances(), { amy: 1000, zoe: -1000 })
})

test('a recorded payment moves the balances toward even', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  g.addExpense({ paidBy: 'amy', cents: 1000, split: { mode: 'exact', amounts: { zoe: 1000 } }, among: ['zoe'] })
  g.recordSettlement({ from: 'zoe', to: 'amy', cents: 400 })
  assert.deepEqual(g.balances(), { amy: 600, zoe: -600 })
  assert.deepEqual(g.recompute(), { amy: 600, zoe: -600 })
})

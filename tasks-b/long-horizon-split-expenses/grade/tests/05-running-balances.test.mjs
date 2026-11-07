// Sub-problem 5: the running balances and a from-scratch replay are two
// readings of one truth - after ANY prefix of events, settlements included,
// they agree (docs/split-rules.md section 3).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createGroup } from '../src/index.js'

test('balances track a replay across a run of expenses', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('bob')
  g.addExpense({ paidBy: 'amy', cents: 1000, split: { mode: 'equal' }, among: ['amy', 'bob'] })
  assert.deepEqual(g.balances(), { amy: 500, bob: -500 })
  g.addExpense({ paidBy: 'bob', cents: 500, split: { mode: 'exact', amounts: { amy: 500 } }, among: ['amy'] })
  assert.deepEqual(g.balances(), { amy: 0, bob: 0 })
  assert.deepEqual(g.balances(), g.recompute())
})

test('a recorded payment moves both balances toward even', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  g.addExpense({ paidBy: 'amy', cents: 1000, split: { mode: 'exact', amounts: { zoe: 1000 } }, among: ['zoe'] })
  assert.deepEqual(g.balances(), { amy: 1000, zoe: -1000 })
  g.recordSettlement({ from: 'zoe', to: 'amy', cents: 400 })
  assert.deepEqual(g.balances(), { amy: 600, zoe: -600 })
})

test('running balances equal a replay after every prefix of a mixed log', () => {
  const g = createGroup()
  for (const id of ['amy', 'bob', 'cid']) g.addMember(id)
  const steps = [
    () => g.addExpense({ paidBy: 'amy', cents: 1200, split: { mode: 'equal' } }),
    () => g.recordSettlement({ from: 'bob', to: 'amy', cents: 400 }),
    () => g.addExpense({ paidBy: 'cid', cents: 900, split: { mode: 'equal' }, among: ['amy', 'bob'] }),
    () => g.recordSettlement({ from: 'amy', to: 'cid', cents: 300 }),
  ]
  for (const step of steps) {
    step()
    assert.deepEqual(g.balances(), g.recompute())
  }
  assert.deepEqual(g.balances(), { amy: 250, bob: -450, cid: 200 })
})

test('payments and new expenses keep the two readings in lockstep', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('bob')
  g.addExpense({ paidBy: 'amy', cents: 2000, split: { mode: 'exact', amounts: { bob: 2000 } }, among: ['bob'] })
  g.recordSettlement({ from: 'bob', to: 'amy', cents: 500 })
  g.recordSettlement({ from: 'bob', to: 'amy', cents: 300 })
  g.addExpense({ paidBy: 'bob', cents: 600, split: { mode: 'equal' }, among: ['amy', 'bob'] })
  // bob repaid 800 of the 2000, then fronted 600 shared evenly
  assert.deepEqual(g.balances(), { amy: 900, bob: -900 })
  assert.deepEqual(g.balances(), g.recompute())
})

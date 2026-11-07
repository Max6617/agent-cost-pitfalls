// Sub-problem 2: the remainder cents after flooring go one at a time to the
// largest exact (pre-floor) share, ties broken by ascending member id - never
// by the order members were listed or joined (docs/split-rules.md section 2).
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

test('equal split: the leftover cent follows the id tie-break, not the list order', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  const { id } = g.addExpense({ paidBy: 'zoe', cents: 1001, split: { mode: 'equal' }, among: ['zoe', 'amy'] })
  assert.deepEqual(g.expenseById(id).shares, { amy: 501, zoe: 500 })
})

test('shares split: the leftover cent goes to the largest share', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  const { id } = g.addExpense({
    paidBy: 'amy', cents: 1001,
    split: { mode: 'shares', shares: { amy: 1, zoe: 3 } },
    among: ['amy', 'zoe'],
  })
  // 250.25 and 750.75: zoe's exact share is larger
  assert.deepEqual(g.expenseById(id).shares, { amy: 250, zoe: 751 })
})

test('equal split three ways: two leftover cents follow ascending member id', () => {
  const g = trio()
  const { id } = g.addExpense({ paidBy: 'cid', cents: 1001, split: { mode: 'equal' }, among: ['cid', 'amy', 'bob'] })
  assert.deepEqual(g.expenseById(id).shares, { amy: 334, bob: 334, cid: 333 })
})

test('percent split: the leftover cent goes to the largest percent', () => {
  const g = trio()
  const { id } = g.addExpense({
    paidBy: 'amy', cents: 1001,
    split: { mode: 'percent', percents: { amy: 33, bob: 33, cid: 34 } },
    among: ['amy', 'bob', 'cid'],
  })
  // 330.33, 330.33, 340.34: cid's exact share is the largest
  assert.deepEqual(g.expenseById(id).shares, { amy: 330, bob: 330, cid: 341 })
})

test('shares split: equal shares tie-break by member id', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  const { id } = g.addExpense({
    paidBy: 'zoe', cents: 1001,
    split: { mode: 'shares', shares: { zoe: 2, amy: 2 } },
    among: ['zoe', 'amy'],
  })
  assert.deepEqual(g.expenseById(id).shares, { amy: 501, zoe: 500 })
})

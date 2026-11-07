// Reproductions for the split rules: equal/percent/shares/exact, and who gets
// the leftover cents. The contract is docs/split-rules.md.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createGroup } from '../src/index.js'

test('an equal split that divides cleanly shares the expense evenly', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  const { id } = g.addExpense({ paidBy: 'amy', cents: 1000, split: { mode: 'equal' } })
  assert.deepEqual(g.expenseById(id).shares, { amy: 500, zoe: 500 })
})

test('the leftover cent of an equal split goes by the id tie-break, not the list order', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  const { id } = g.addExpense({ paidBy: 'zoe', cents: 1001, split: { mode: 'equal' }, among: ['zoe', 'amy'] })
  // exact shares tie, so ascending member id decides: amy gets the cent
  assert.deepEqual(g.expenseById(id).shares, { amy: 501, zoe: 500 })
})

test('the leftover cent of a shares split goes to the largest share', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  const { id } = g.addExpense({
    paidBy: 'amy', cents: 1001,
    split: { mode: 'shares', shares: { amy: 1, zoe: 3 } },
    among: ['amy', 'zoe'],
  })
  // 250.25 vs 750.75: zoe's share is the largest, so zoe gets the cent
  assert.deepEqual(g.expenseById(id).shares, { amy: 250, zoe: 751 })
})

test('an even percent split shares the expense by the given percents', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  const { id } = g.addExpense({
    paidBy: 'amy', cents: 1000,
    split: { mode: 'percent', percents: { amy: 50, zoe: 50 } },
  })
  assert.deepEqual(g.expenseById(id).shares, { amy: 500, zoe: 500 })
})

test('a percent split lands on the exact cent', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  const { id } = g.addExpense({
    paidBy: 'zoe', cents: 3500,
    split: { mode: 'percent', percents: { amy: 29, zoe: 71 } },
    among: ['zoe', 'amy'],
  })
  // 29% of 3500 is exactly 1015
  assert.deepEqual(g.expenseById(id).shares, { amy: 1015, zoe: 2485 })
})

test('an exact split keeps the given amounts', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  const { id } = g.addExpense({
    paidBy: 'amy', cents: 1000,
    split: { mode: 'exact', amounts: { amy: 333, zoe: 667 } },
  })
  assert.deepEqual(g.expenseById(id).shares, { amy: 333, zoe: 667 })
})

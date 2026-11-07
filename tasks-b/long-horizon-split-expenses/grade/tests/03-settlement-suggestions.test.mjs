// Sub-problem 3: settlement suggestions pair the largest debt with the largest
// credit for the smaller amount, ties by ascending member id, until everyone
// is even - no zero transfers, no cycles, minimal count
// (docs/split-rules.md section 4).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createGroup } from '../src/index.js'

// one exact debt of `cents` from `debtor` to `creditor`
const debt = (g, debtor, creditor, cents) => {
  g.addExpense({ paidBy: creditor, cents, split: { mode: 'exact', amounts: { [debtor]: cents } }, among: [debtor] })
}

const quad = () => {
  const g = createGroup()
  for (const id of ['amy', 'bob', 'cid', 'dan']) g.addMember(id)
  return g
}

test('a single debt suggests a single transfer', () => {
  const g = createGroup()
  g.addMember('amy')
  g.addMember('zoe')
  debt(g, 'zoe', 'amy', 1000)
  assert.deepEqual(g.suggestSettlements(), [{ from: 'zoe', to: 'amy', cents: 1000 }])
})

test('a loop of debts that cancels out suggests nothing', () => {
  const g = createGroup()
  for (const id of ['amy', 'bob', 'cid']) g.addMember(id)
  debt(g, 'bob', 'amy', 1000)
  debt(g, 'cid', 'bob', 1000)
  debt(g, 'amy', 'cid', 1000)
  assert.deepEqual(g.suggestSettlements(), [])
})

test('a chain of debts collapses to one transfer end to end', () => {
  const g = quad()
  debt(g, 'bob', 'amy', 1000)
  debt(g, 'cid', 'bob', 1000)
  debt(g, 'dan', 'cid', 1000)
  // bob and cid are even in the middle; only dan owes, only amy is owed
  assert.deepEqual(g.suggestSettlements(), [{ from: 'dan', to: 'amy', cents: 1000 }])
})

test('equal debts and equal credits pair off by member id, in few transfers', () => {
  const g = quad()
  debt(g, 'amy', 'cid', 400)
  debt(g, 'bob', 'cid', 400)
  debt(g, 'amy', 'dan', 200)
  debt(g, 'bob', 'dan', 200)
  // amy -600, bob -600, cid +800, dan +400
  assert.deepEqual(g.suggestSettlements(), [
    { from: 'amy', to: 'cid', cents: 600 },
    { from: 'bob', to: 'dan', cents: 400 },
    { from: 'bob', to: 'cid', cents: 200 },
  ])
})

test('a payment that closes a loop leaves nothing to suggest', () => {
  const g = createGroup()
  for (const id of ['amy', 'bob', 'cid']) g.addMember(id)
  debt(g, 'bob', 'amy', 1000)
  debt(g, 'cid', 'bob', 1000)
  debt(g, 'amy', 'cid', 600)
  // amy +400, bob 0, cid -400; cid hands amy 400 and everyone is even
  g.recordSettlement({ from: 'cid', to: 'amy', cents: 400 })
  assert.deepEqual(g.suggestSettlements(), [])
})

// Sub-problem 4: the grace period and lost fees - what the grace window
// waives, and what it must never waive.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createLibrary } from '../src/index.js'

const titles = [
  { id: 'T-DUNE', name: 'Dune', category: 'book', replacementCostCents: 4200 },
  { id: 'T-POD', name: 'The Daily (season 1)', category: 'audiobook', replacementCostCents: 3800 },
]
const copies = [
  { id: 'C-DUNE-1', titleId: 'T-DUNE' },
  { id: 'C-POD-1', titleId: 'T-POD' },
]
const members = [{ id: 'M-DAN', name: 'Dan', memberClass: 'standard' }]
const lib = () => createLibrary({ titles, copies, members })

test('a return inside the grace period owes nothing', () => {
  const l = lib()
  const { loanId } = l.checkout('C-DUNE-1', 'M-DAN', '2026-03-02')
  assert.equal(l.returnCopy(loanId, '2026-03-25').billCents, 0)
  assert.equal(l.balance('M-DAN'), 0)
})

test('the grace period waives the fine, it does not shorten it', () => {
  const l = lib()
  const { loanId } = l.checkout('C-POD-1', 'M-DAN', '2026-03-02')
  const out = l.returnCopy(loanId, '2026-03-19')
  assert.equal(out.daysLate, 3)
  assert.equal(out.billCents, 150)
})

test('a loss reported inside the grace period still bills the full replacement cost', () => {
  const l = lib()
  const { loanId } = l.checkout('C-DUNE-1', 'M-DAN', '2026-03-02')
  const out = l.reportLost(loanId, '2026-03-24')
  assert.equal(out.billCents, 4200)
  assert.deepEqual(
    l.charges('M-DAN').map((c) => [c.kind, c.amountCents]),
    [['lost', 4200]],
  )
  assert.deepEqual(l.returnCopy(loanId, '2026-03-25'), { ok: false, reason: 'loan-closed' })
})

test('a loss can be reported before the due date and bills the replacement cost', () => {
  const l = lib()
  const { loanId } = l.checkout('C-POD-1', 'M-DAN', '2026-03-02')
  assert.equal(l.reportLost(loanId, '2026-03-10').billCents, 3800)
  assert.equal(l.balance('M-DAN'), 3800)
})

test('a loss reported after a renewal bills the replacement cost, and no overdue fine besides', () => {
  const l = lib()
  const { loanId } = l.checkout('C-DUNE-1', 'M-DAN', '2026-03-02')
  l.renew(loanId)
  const out = l.reportLost(loanId, '2026-04-14')
  assert.equal(out.billCents, 4200)
  assert.equal(l.balance('M-DAN'), 4200)
})

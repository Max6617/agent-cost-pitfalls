// Sub-problem 3: overdue fines - day counting, per-category rates, and the
// per-loan cap.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createLibrary } from '../src/index.js'

const titles = [
  { id: 'T-DUNE', name: 'Dune', category: 'book', replacementCostCents: 4200 },
  { id: 'T-AMA', name: 'Amadeus', category: 'dvd', replacementCostCents: 2500 },
]
const copies = [
  { id: 'C-DUNE-1', titleId: 'T-DUNE' },
  { id: 'C-AMA-1', titleId: 'T-AMA' },
]
const members = [{ id: 'M-DAN', name: 'Dan', memberClass: 'standard' }]
const lib = () => createLibrary({ titles, copies, members })

test('a book returned three days late bills three days at the book rate', () => {
  const l = lib()
  const { loanId } = l.checkout('C-DUNE-1', 'M-DAN', '2026-03-02')
  const out = l.returnCopy(loanId, '2026-03-26')
  assert.equal(out.daysLate, 3)
  assert.equal(out.billCents, 75)
  assert.equal(l.balance('M-DAN'), 75)
})

test('a dvd returned five days late bills five days at the dvd rate', () => {
  const l = lib()
  const { loanId } = l.checkout('C-AMA-1', 'M-DAN', '2026-03-02')
  const out = l.returnCopy(loanId, '2026-03-14')
  assert.equal(out.daysLate, 5)
  assert.equal(out.billCents, 500)
})

test('a fine just under the per-loan cap bills the exact accrual', () => {
  const l = lib()
  const { loanId } = l.checkout('C-DUNE-1', 'M-DAN', '2026-03-02')
  const out = l.returnCopy(loanId, '2026-05-01')
  assert.equal(out.daysLate, 39)
  assert.equal(out.billCents, 975)
})

test('a renewed loan accrues from the renewed due date', () => {
  const l = lib()
  const { loanId } = l.checkout('C-DUNE-1', 'M-DAN', '2026-03-02')
  l.renew(loanId)
  const out = l.returnCopy(loanId, '2026-04-16')
  assert.equal(out.daysLate, 3)
  assert.equal(out.billCents, 75)
})

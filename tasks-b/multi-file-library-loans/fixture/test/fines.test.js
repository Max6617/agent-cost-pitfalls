import test from 'node:test'
import assert from 'node:assert/strict'
import { createLibrary } from '../src/index.js'

const titles = [
  { id: 'T-DUNE', name: 'Dune', category: 'book', replacementCostCents: 4200 },
]
const copies = [{ id: 'C-DUNE-1', titleId: 'T-DUNE' }]
const members = [{ id: 'M-DAN', name: 'Dan', memberClass: 'standard' }]
const lib = () => createLibrary({ titles, copies, members })

test('a book returned three days late bills three days at the book rate', () => {
  const l = lib()
  const { loanId } = l.checkout('C-DUNE-1', 'M-DAN', '2026-03-02')
  const out = l.returnCopy(loanId, '2026-03-26')
  assert.equal(out.daysLate, 3)
  assert.equal(out.billCents, 75)
})

test('a return inside the grace period owes nothing', () => {
  const l = lib()
  const { loanId } = l.checkout('C-DUNE-1', 'M-DAN', '2026-03-02')
  assert.equal(l.returnCopy(loanId, '2026-03-25').billCents, 0)
})

test('a loss reported just after the due date bills the replacement cost', () => {
  const l = lib()
  const { loanId } = l.checkout('C-DUNE-1', 'M-DAN', '2026-03-02')
  assert.equal(l.reportLost(loanId, '2026-03-24').billCents, 4200)
})

test('a fine just under the per-loan cap bills the exact accrual', () => {
  const l = lib()
  const { loanId } = l.checkout('C-DUNE-1', 'M-DAN', '2026-03-02')
  assert.equal(l.returnCopy(loanId, '2026-05-01').billCents, 975)
})

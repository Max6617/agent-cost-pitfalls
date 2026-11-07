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
const members = [
  { id: 'M-DAN', name: 'Dan', memberClass: 'standard' },
  { id: 'M-ELI', name: 'Eli', memberClass: 'standard' },
]
const lib = () => createLibrary({ titles, copies, members })

test('checkout sets the due date one loan period out', () => {
  const l = lib()
  const out = l.checkout('C-DUNE-1', 'M-DAN', '2026-03-02')
  assert.equal(out.ok, true)
  assert.equal(out.dueAt, '2026-03-23')
})

test('a loan renews twice and is refused a third time', () => {
  const l = lib()
  const { loanId } = l.checkout('C-AMA-1', 'M-DAN', '2026-03-02')
  assert.deepEqual(l.renew(loanId), { ok: true, dueAt: '2026-03-16' })
  assert.deepEqual(l.renew(loanId), { ok: true, dueAt: '2026-03-23' })
  assert.deepEqual(l.renew(loanId), { ok: false, reason: 'renewal-limit' })
})

test('a renewal is refused while someone is waiting for the title', () => {
  const l = lib()
  const { loanId } = l.checkout('C-DUNE-1', 'M-DAN', '2026-03-02')
  l.placeHold('T-DUNE', 'M-ELI', '2026-03-05')
  assert.deepEqual(l.renew(loanId), { ok: false, reason: 'held' })
})

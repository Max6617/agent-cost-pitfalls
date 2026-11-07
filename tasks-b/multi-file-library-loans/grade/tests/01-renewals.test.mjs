// Sub-problem 1: renewals - extension arithmetic, the limit, and the hold
// that must block a renewal whichever copy of the title is out.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createLibrary } from '../src/index.js'

const titles = [
  { id: 'T-DUNE', name: 'Dune', category: 'book', replacementCostCents: 4200 },
  { id: 'T-AMA', name: 'Amadeus', category: 'dvd', replacementCostCents: 2500 },
]
const copies = [
  { id: 'C-DUNE-1', titleId: 'T-DUNE' },
  { id: 'C-DUNE-2', titleId: 'T-DUNE' },
  { id: 'C-AMA-1', titleId: 'T-AMA' },
]
const members = [
  { id: 'M-DAN', name: 'Dan', memberClass: 'standard' },
  { id: 'M-ELI', name: 'Eli', memberClass: 'standard' },
  { id: 'M-FAY', name: 'Fay', memberClass: 'standard' },
]
const lib = () => createLibrary({ titles, copies, members })

test('a third renewal is refused at the renewal limit', () => {
  const l = lib()
  const { loanId } = l.checkout('C-DUNE-1', 'M-DAN', '2026-03-02')
  assert.deepEqual(l.renew(loanId), { ok: true, dueAt: '2026-04-13' })
  assert.deepEqual(l.renew(loanId), { ok: true, dueAt: '2026-05-04' })
  assert.deepEqual(l.renew(loanId), { ok: false, reason: 'renewal-limit' })
})

test('a renewal extends the due date from the current due date, not from today', () => {
  const l = lib()
  const { loanId } = l.checkout('C-AMA-1', 'M-DAN', '2026-03-02')
  assert.deepEqual(l.renew(loanId), { ok: true, dueAt: '2026-03-16' })
  assert.deepEqual(l.renew(loanId), { ok: true, dueAt: '2026-03-23' })
})

test('a renewal is refused while the title has an active hold', () => {
  const l = lib()
  const { loanId } = l.checkout('C-DUNE-1', 'M-DAN', '2026-03-02')
  l.placeHold('T-DUNE', 'M-ELI', '2026-03-05')
  assert.deepEqual(l.renew(loanId), { ok: false, reason: 'held' })
})

test('a held loan at the renewal limit is refused as held, not as over the limit', () => {
  const l = lib()
  const { loanId } = l.checkout('C-DUNE-2', 'M-DAN', '2026-03-02')
  l.renew(loanId)
  l.renew(loanId)
  l.placeHold('T-DUNE', 'M-ELI', '2026-03-05')
  assert.deepEqual(l.renew(loanId), { ok: false, reason: 'held' })
})

test('a cancelled hold no longer blocks a renewal, but a hold placed again does', () => {
  const l = lib()
  const { loanId } = l.checkout('C-DUNE-1', 'M-DAN', '2026-03-02')
  const eli = l.placeHold('T-DUNE', 'M-ELI', '2026-03-05')
  l.cancelHold(eli.holdId)
  assert.equal(l.renew(loanId).ok, true)
  l.placeHold('T-DUNE', 'M-FAY', '2026-03-07')
  assert.deepEqual(l.renew(loanId), { ok: false, reason: 'held' })
})

// Sub-problem 2: the hold queue - class priority, order inside a class, and
// which hold a returning copy readies.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createLibrary } from '../src/index.js'

const titles = [
  { id: 'T-LOTR', name: 'The Lord of the Rings', category: 'book', replacementCostCents: 5600 },
]
const copies = [{ id: 'C-LOTR-1', titleId: 'T-LOTR' }]
const members = [
  { id: 'M-ADA', name: 'Ada', memberClass: 'staff' },
  { id: 'M-BEN', name: 'Ben', memberClass: 'staff' },
  { id: 'M-CORA', name: 'Cora', memberClass: 'student' },
  { id: 'M-DAN', name: 'Dan', memberClass: 'standard' },
  { id: 'M-ELI', name: 'Eli', memberClass: 'standard' },
]
const lib = () => createLibrary({ titles, copies, members })

test('staff queue ahead of standard members regardless of placement order', () => {
  const l = lib()
  l.placeHold('T-LOTR', 'M-DAN', '2026-03-02')
  const ada = l.placeHold('T-LOTR', 'M-ADA', '2026-03-05')
  assert.equal(l.holdQueue('T-LOTR')[0].holdId, ada.holdId)
})

test('inside one class the member who waited longer is first', () => {
  const l = lib()
  const dan = l.placeHold('T-LOTR', 'M-DAN', '2026-03-02')
  const eli = l.placeHold('T-LOTR', 'M-ELI', '2026-03-04')
  assert.deepEqual(
    l.holdQueue('T-LOTR').map((h) => h.holdId),
    [dan.holdId, eli.holdId],
  )
})

test('a later staff hold jumps the queue but never past an earlier staff hold', () => {
  const l = lib()
  const ada = l.placeHold('T-LOTR', 'M-ADA', '2026-03-02')
  const dan = l.placeHold('T-LOTR', 'M-DAN', '2026-03-03')
  const ben = l.placeHold('T-LOTR', 'M-BEN', '2026-03-04')
  assert.deepEqual(
    l.holdQueue('T-LOTR').map((h) => h.holdId),
    [ada.holdId, ben.holdId, dan.holdId],
  )
})

test('a return readies the longest-waiting hold, and only that member can pick the copy up', () => {
  const l = lib()
  const { loanId } = l.checkout('C-LOTR-1', 'M-CORA', '2026-03-02')
  const ada = l.placeHold('T-LOTR', 'M-ADA', '2026-03-03')
  l.placeHold('T-LOTR', 'M-BEN', '2026-03-04')
  l.returnCopy(loanId, '2026-03-06')

  const queue = l.holdQueue('T-LOTR')
  assert.equal(queue[0].holdId, ada.holdId)
  assert.equal(queue[0].status, 'ready')
  assert.equal(queue[1].status, 'waiting')
  assert.deepEqual(l.checkout('C-LOTR-1', 'M-BEN', '2026-03-06'), { ok: false, reason: 'held-for-other' })

  const pickup = l.checkout('C-LOTR-1', 'M-ADA', '2026-03-06')
  assert.equal(pickup.ok, true)
  assert.equal(pickup.dueAt, '2026-03-27')
  assert.deepEqual(
    l.holdQueue('T-LOTR').map((h) => h.memberId),
    ['M-BEN'],
  )
})

test('a cancellation keeps the rest of the queue in order', () => {
  const l = lib()
  const { loanId } = l.checkout('C-LOTR-1', 'M-CORA', '2026-03-02')
  const dan = l.placeHold('T-LOTR', 'M-DAN', '2026-03-02')
  const ada = l.placeHold('T-LOTR', 'M-ADA', '2026-03-03')
  const ben = l.placeHold('T-LOTR', 'M-BEN', '2026-03-04')
  l.cancelHold(dan.holdId)
  assert.deepEqual(
    l.holdQueue('T-LOTR').map((h) => h.holdId),
    [ada.holdId, ben.holdId],
  )
  l.returnCopy(loanId, '2026-03-06')
  assert.equal(l.holdQueue('T-LOTR')[0].holdId, ada.holdId)
  assert.equal(l.holdQueue('T-LOTR')[0].status, 'ready')
})

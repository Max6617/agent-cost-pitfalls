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
]
const lib = () => createLibrary({ titles, copies, members })

test('inside one class the member who waited longer is first', () => {
  const l = lib()
  const first = l.placeHold('T-LOTR', 'M-ADA', '2026-03-03')
  const second = l.placeHold('T-LOTR', 'M-BEN', '2026-03-04')
  assert.deepEqual(
    l.holdQueue('T-LOTR').map((h) => h.holdId),
    [first.holdId, second.holdId],
  )
})

test('a return readies the hold that has waited longest', () => {
  const l = lib()
  const { loanId } = l.checkout('C-LOTR-1', 'M-CORA', '2026-03-02')
  const ada = l.placeHold('T-LOTR', 'M-ADA', '2026-03-03')
  l.placeHold('T-LOTR', 'M-BEN', '2026-03-04')
  l.returnCopy(loanId, '2026-03-06')
  const queue = l.holdQueue('T-LOTR')
  assert.equal(queue[0].holdId, ada.holdId)
  assert.equal(queue[0].status, 'ready')
})

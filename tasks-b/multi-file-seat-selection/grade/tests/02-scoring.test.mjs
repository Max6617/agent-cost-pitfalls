// Sub-problem 2: best available scores by the centre line first - the key's
// components and their order are pinned by docs/seating-rules.md.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createVenue, blockKey, rankBlocks } from '../src/index.js'

const hall = () =>
  createVenue({
    rows: [
      { id: 'A', count: 9, aislesAfter: [3, 6] },
      { id: 'B', count: 9, aislesAfter: [3, 6] },
      { id: 'C', count: 9, aislesAfter: [3, 6] },
    ],
  })

const names = (blocks) => blocks.map((b) => b.row + ':' + b.seats.join(','))

test('a block key leads with the lateral offset, then row, seat, row id', () => {
  const venue = hall()
  assert.deepEqual(blockKey(venue, { row: 'B', seats: [7, 8] }), [5, 1, 7, 'B'])
  assert.deepEqual(blockKey(venue, { row: 'A', seats: [4, 5] }), [1, 0, 4, 'A'])
})

test('a centred block further back beats an extreme block in the front row', () => {
  const venue = hall()
  const ranked = rankBlocks(venue, [
    { row: 'A', seats: [1, 2] },
    { row: 'C', seats: [4, 5] },
  ])
  assert.deepEqual(names(ranked), ['C:4,5', 'A:1,2'])
})

test('ranking compares offsets across every row before row distance', () => {
  const venue = hall()
  const ranked = rankBlocks(venue, [
    { row: 'A', seats: [1, 2] },
    { row: 'B', seats: [4, 5] },
    { row: 'B', seats: [7, 8] },
  ])
  assert.deepEqual(names(ranked), ['B:4,5', 'B:7,8', 'A:1,2'])
})

test('row distance only breaks a tie on lateral offset', () => {
  const venue = hall()
  const ranked = rankBlocks(venue, [
    { row: 'B', seats: [1, 2] },
    { row: 'C', seats: [4, 5] },
    { row: 'B', seats: [4, 5] },
  ])
  assert.deepEqual(names(ranked), ['B:4,5', 'C:4,5', 'B:1,2'])
})

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

test('the centred block beats the front-row block', () => {
  const venue = hall()
  const ranked = rankBlocks(venue, [
    { row: 'A', seats: [1, 2] },
    { row: 'B', seats: [4, 5] },
  ])
  assert.deepEqual(names(ranked), ['B:4,5', 'A:1,2'])
})

test('a block key leads with the lateral offset', () => {
  const venue = hall()
  assert.deepEqual(blockKey(venue, { row: 'C', seats: [1, 2] }), [7, 2, 1, 'C'])
})

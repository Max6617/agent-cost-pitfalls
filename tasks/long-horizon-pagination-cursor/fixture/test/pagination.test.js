import test from 'node:test'
import assert from 'node:assert/strict'
import { page, walk, compareRows, sortRows, encodeCursor, decodeCursor, isAfter } from '../src/pagination.js'

/** Rows at one millisecond, so the id has to break the tie. */
const SAME_MS = [
  { id: 'c', createdAt: '2026-03-04T05:00:00.000Z' },
  { id: 'a', createdAt: '2026-03-04T05:00:00.000Z' },
  { id: 'b', createdAt: '2026-03-04T05:00:00.000Z' },
]

const MIXED = [
  { id: 'z', createdAt: '2026-03-04T05:00:02.000Z' },
  { id: 'a', createdAt: '2026-03-04T05:00:00.000Z' },
  { id: 'm', createdAt: '2026-03-04T05:00:01.000Z' },
  { id: 'a2', createdAt: '2026-03-04T05:00:00.000Z' },
]

test('rows sort by time and then by id', () => {
  assert.deepEqual(sortRows(SAME_MS).map((r) => r.id), ['a', 'b', 'c'])
  assert.deepEqual(sortRows(MIXED).map((r) => r.id), ['a', 'a2', 'm', 'z'])
})

test('the comparison is a total order', () => {
  assert.ok(compareRows({ id: 'a', createdAt: 'x' }, { id: 'b', createdAt: 'x' }) < 0)
  assert.ok(compareRows({ id: 'b', createdAt: 'x' }, { id: 'a', createdAt: 'y' }) < 0)
  assert.equal(compareRows({ id: 'a', createdAt: 'x' }, { id: 'a', createdAt: 'x' }), 0)
})

test('a cursor round-trips through its opaque form', () => {
  const row = { id: 'a/b c', createdAt: '2026-03-04T05:00:00.000Z' }
  const cursor = encodeCursor(row)
  assert.equal(cursor.includes('/'), false)
  assert.deepEqual(decodeCursor(cursor), { createdAt: row.createdAt, id: row.id })
})

test('a cursor that is not ours decodes to nothing', () => {
  assert.equal(decodeCursor('not-a-cursor'), null)
  assert.equal(decodeCursor(''), null)
  assert.equal(decodeCursor(undefined), null)
})

test('an undecodable cursor starts from the beginning rather than failing', () => {
  const result = page({ rows: MIXED, cursor: 'garbage', limit: 2 })
  assert.deepEqual(result.items.map((r) => r.id), ['a', 'a2'])
})

test('the first page is the first rows in order', () => {
  const result = page({ rows: MIXED, limit: 2 })
  assert.deepEqual(result.items.map((r) => r.id), ['a', 'a2'])
  assert.equal(result.hasMore, true)
})

test('the cursor points at the last row served, not the next one', () => {
  const first = page({ rows: MIXED, limit: 2 })
  assert.deepEqual(decodeCursor(first.nextCursor), { createdAt: '2026-03-04T05:00:00.000Z', id: 'a2' })
})

test('the second page starts strictly after the cursor', () => {
  const first = page({ rows: MIXED, limit: 2 })
  const second = page({ rows: MIXED, cursor: first.nextCursor, limit: 2 })
  assert.deepEqual(second.items.map((r) => r.id), ['m', 'z'])
  assert.equal(second.hasMore, false)
  assert.equal(second.nextCursor, null)
})

test('a walk visits every row exactly once', () => {
  assert.deepEqual(walk(MIXED, 2).map((r) => r.id), ['a', 'a2', 'm', 'z'])
  assert.deepEqual(walk(SAME_MS, 1).map((r) => r.id), ['a', 'b', 'c'])
})

test('a page size larger than the data ends the walk', () => {
  const result = page({ rows: MIXED, limit: 99 })
  assert.equal(result.items.length, 4)
  assert.equal(result.hasMore, false)
  assert.equal(result.nextCursor, null)
})

test('rows sharing a millisecond are still paged without loss', () => {
  const first = page({ rows: SAME_MS, limit: 2 })
  const second = page({ rows: SAME_MS, cursor: first.nextCursor, limit: 2 })
  assert.deepEqual([...first.items, ...second.items].map((r) => r.id), ['a', 'b', 'c'])
})

test('a row inserted before the cursor is not served on a later page', () => {
  const first = page({ rows: MIXED, limit: 2 })
  const withNew = [...MIXED, { id: 'a1', createdAt: '2026-03-04T05:00:00.000Z' }]
  const second = page({ rows: withNew, cursor: first.nextCursor, limit: 9 })
  assert.deepEqual(second.items.map((r) => r.id), ['m', 'z'], 'a1 sorts before a2 and has already been passed')
})

test('a row inserted after the cursor is served on a later page', () => {
  const first = page({ rows: MIXED, limit: 2 })
  const withNew = [...MIXED, { id: 'n', createdAt: '2026-03-04T05:00:01.500Z' }]
  const second = page({ rows: withNew, cursor: first.nextCursor, limit: 3 })
  assert.deepEqual(second.items.map((r) => r.id), ['m', 'n', 'z'])
})

test('deleting a row between pages does not shift the ones that remain', () => {
  const first = page({ rows: MIXED, limit: 2 })
  const without = MIXED.filter((r) => r.id !== 'm')
  const second = page({ rows: without, cursor: first.nextCursor, limit: 2 })
  assert.deepEqual(second.items.map((r) => r.id), ['z'])
})

test('a walk over an empty store yields nothing', () => {
  assert.deepEqual(walk([], 2), [])
})

test('no row is ever served on two different pages', () => {
  const rows = Array.from({ length: 7 }, (_, i) => ({ id: 'r' + i, createdAt: '2026-03-04T05:00:0' + (i % 3) + '.000Z' }))
  const seen = []
  let cursor
  for (;;) {
    const result = page({ rows, cursor, limit: 2 })
    seen.push(...result.items.map((r) => r.id))
    if (!result.hasMore) break
    cursor = result.nextCursor
  }
  assert.equal(new Set(seen).size, rows.length)
  assert.deepEqual(seen, sortRows(rows).map((r) => r.id))
})

test('isAfter compares against the position tuple', () => {
  assert.equal(isAfter({ id: 'b', createdAt: 'x' }, { id: 'a', createdAt: 'x' }), true)
  assert.equal(isAfter({ id: 'a', createdAt: 'x' }, { id: 'a', createdAt: 'x' }), false)
  assert.equal(isAfter({ id: 'a', createdAt: 'y' }, { id: 'z', createdAt: 'x' }), true)
})

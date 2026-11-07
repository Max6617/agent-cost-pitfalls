import test from 'node:test'
import assert from 'node:assert/strict'
import { startOfLocalDay, endOfLocalDay } from '../src/index.js'

test('the day a run belongs to starts at local midnight', () => {
  const start = startOfLocalDay('America/New_York', Date.parse('2024-06-15T12:00:00Z'))
  assert.equal(start, Date.parse('2024-06-15T04:00:00Z'))
})

test('the day ends one millisecond before the next one starts', () => {
  const end = endOfLocalDay('America/New_York', Date.parse('2024-06-15T12:00:00Z'))
  assert.equal(end, Date.parse('2024-06-16T03:59:59.999Z'))
})

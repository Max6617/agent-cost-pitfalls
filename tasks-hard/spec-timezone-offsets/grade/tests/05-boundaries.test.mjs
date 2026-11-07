// Sub-problem 5: local day, month and year boundaries. They are wall-clock
// questions, and a local day is not always 24 hours long.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  startOfLocalDay, endOfLocalDay, startOfLocalMonth, isSameLocalDay, instantToLocal,
} from '../src/index.js'

const at = (iso) => Date.parse(iso)
const HOUR = 3600000

test('a local day begins at local midnight, not at UTC midnight', () => {
  const ny = startOfLocalDay('America/New_York', at('2024-06-15T12:00:00Z'))
  assert.equal(ny, at('2024-06-15T04:00:00Z'))
  assert.equal(instantToLocal('America/New_York', ny).hour, 0)
  assert.equal(instantToLocal('America/New_York', ny).day, 15)

  const auckland = startOfLocalDay('Pacific/Auckland', at('2024-12-31T11:30:00Z'))
  assert.equal(auckland, at('2024-12-31T11:00:00Z'))
  assert.equal(instantToLocal('Pacific/Auckland', auckland).year, 2025)
  assert.equal(instantToLocal('Pacific/Auckland', auckland).month, 1)
  assert.equal(instantToLocal('Pacific/Auckland', auckland).day, 1)

  const kolkata = startOfLocalDay('Asia/Kolkata', at('2024-06-15T20:00:00Z'))
  assert.equal(kolkata, at('2024-06-15T18:30:00Z'))
  assert.equal(instantToLocal('Asia/Kolkata', kolkata).day, 16)
})

test('a spring-forward day is 23 hours long and a fall-back day is 25', () => {
  const short = startOfLocalDay('America/New_York', at('2024-03-10T12:00:00Z'))
  assert.equal(short, at('2024-03-10T05:00:00Z'))
  assert.equal(endOfLocalDay('America/New_York', at('2024-03-10T12:00:00Z')), at('2024-03-11T03:59:59.999Z'))
  assert.equal(endOfLocalDay('America/New_York', at('2024-03-10T12:00:00Z')) - short + 1, 23 * HOUR)

  const long = startOfLocalDay('America/New_York', at('2024-11-03T12:00:00Z'))
  assert.equal(long, at('2024-11-03T04:00:00Z'))
  assert.equal(endOfLocalDay('America/New_York', at('2024-11-03T12:00:00Z')), at('2024-11-04T04:59:59.999Z'))
  assert.equal(endOfLocalDay('America/New_York', at('2024-11-03T12:00:00Z')) - long + 1, 25 * HOUR)

  const half = startOfLocalDay('Australia/Lord_Howe', at('2024-10-06T05:00:00Z'))
  assert.equal(half, at('2024-10-05T13:30:00Z'))
  assert.equal(endOfLocalDay('Australia/Lord_Howe', at('2024-10-06T05:00:00Z')), at('2024-10-06T12:59:59.999Z'))
  assert.equal(endOfLocalDay('Australia/Lord_Howe', at('2024-10-06T05:00:00Z')) - half + 1, 23.5 * HOUR)
})

test('months, years and days all turn over at local midnight', () => {
  assert.equal(startOfLocalMonth('Asia/Kolkata', at('2024-03-31T20:00:00Z')), at('2024-03-31T18:30:00Z'))
  assert.equal(startOfLocalMonth('Pacific/Auckland', at('2024-12-31T11:30:00Z')), at('2024-12-31T11:00:00Z'))
  assert.equal(startOfLocalDay('America/New_York', at('2025-01-01T02:00:00Z')), at('2024-12-31T05:00:00Z'))

  assert.equal(isSameLocalDay('America/New_York', at('2024-12-31T23:00:00Z'), at('2025-01-01T02:00:00Z')), true)
  assert.equal(isSameLocalDay('America/New_York', at('2025-01-01T04:59:59Z'), at('2025-01-01T05:00:00Z')), false)
  assert.equal(isSameLocalDay('Asia/Kolkata', at('2024-06-15T18:29:59Z'), at('2024-06-15T18:30:00Z')), false)
  assert.equal(isSameLocalDay('Asia/Kolkata', at('2024-06-15T18:30:00Z'), at('2024-06-16T18:29:59Z')), true)
})

test('a day whose local midnight never happened still starts', () => {
  const havana = at('2024-03-10T12:00:00Z')
  const start = startOfLocalDay('America/Havana', havana)
  assert.equal(start, at('2024-03-10T05:00:00Z'))
  assert.equal(instantToLocal('America/Havana', start).hour, 1)
  assert.equal(instantToLocal('America/Havana', start).minute, 0)
  assert.equal(endOfLocalDay('America/Havana', havana), at('2024-03-11T03:59:59.999Z'))

  const santiago = at('2024-09-08T12:00:00Z')
  assert.equal(startOfLocalDay('America/Santiago', santiago), at('2024-09-08T04:00:00Z'))
  assert.equal(instantToLocal('America/Santiago', startOfLocalDay('America/Santiago', santiago)).hour, 1)
  assert.equal(endOfLocalDay('America/Santiago', santiago), at('2024-09-09T02:59:59.999Z'))
})

test('a day in a zone whose clocks move at midnight is 25 hours long', () => {
  const instant = at('2024-04-06T18:00:00Z')
  const start = startOfLocalDay('America/Santiago', instant)
  assert.equal(start, at('2024-04-06T03:00:00Z'))
  assert.equal(instantToLocal('America/Santiago', start).day, 6)
  assert.equal(endOfLocalDay('America/Santiago', instant), at('2024-04-07T03:59:59.999Z'))
  assert.equal(endOfLocalDay('America/Santiago', instant) - start + 1, 25 * HOUR)
})

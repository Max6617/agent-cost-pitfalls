// Sub-problem 4: elapsed time against wall-clock time. A day added to an
// instant is 24 hours; a day added to a reading is the same time tomorrow. The
// cases that matter are the ones that cross a clock change.
import test from 'node:test'
import assert from 'node:assert/strict'
import { addToInstant, addToLocal, InvalidDurationError } from '../src/index.js'

const at = (iso) => Date.parse(iso)

test('elapsed units are elapsed time on an ordinary day', () => {
  const ny = addToInstant('America/New_York', at('2024-06-15T12:00:00Z'), { hours: 2 })
  assert.equal(ny.instant, at('2024-06-15T14:00:00Z'))
  assert.equal(ny.local.hour, 10)
  assert.equal(ny.local.minute, 0)

  const kolkata = addToInstant('Asia/Kolkata', at('2024-06-15T12:00:00Z'), { minutes: 90 })
  assert.equal(kolkata.instant, at('2024-06-15T13:30:00Z'))
  assert.equal(kolkata.local.hour, 19)
  assert.equal(kolkata.local.minute, 0)
})

test('a day added to an instant is 24 hours, whatever the clocks do', () => {
  const forward = addToInstant('America/New_York', at('2024-03-09T17:00:00Z'), { days: 1 })
  assert.equal(forward.instant, at('2024-03-10T17:00:00Z'))
  assert.equal(forward.local.hour, 13)
  assert.equal(forward.local.minute, 0)

  const back = addToInstant('America/New_York', at('2024-11-02T16:00:00Z'), { days: 1 })
  assert.equal(back.instant, at('2024-11-03T16:00:00Z'))
  assert.equal(back.local.hour, 11)
  assert.equal(back.local.minute, 0)

  const quarter = addToInstant('Australia/Lord_Howe', at('2024-10-05T06:00:00Z'), { days: 1 })
  assert.equal(quarter.instant, at('2024-10-06T06:00:00Z'))
})

test('a day added to a wall clock keeps the time of day', () => {
  const forward = addToLocal('America/New_York', '2024-03-09T12:00:00', { days: 1 })
  assert.equal(forward.resolution, 'exact')
  assert.equal(forward.instant, at('2024-03-10T16:00:00Z'))
  assert.equal(forward.local.hour, 12)
  assert.equal(forward.offsetMinutes, -240)

  const back = addToLocal('America/New_York', '2024-11-02T12:00:00', { days: 1 })
  assert.equal(back.resolution, 'exact')
  assert.equal(back.instant, at('2024-11-03T17:00:00Z'))
  assert.equal(back.local.hour, 12)

  const hours = addToLocal('America/New_York', '2024-03-09T12:00:00', { hours: 18 })
  assert.equal(hours.instant, at('2024-03-10T10:00:00Z'))
  assert.equal(hours.local.hour, 6)
  assert.equal(hours.local.day, 10)
})

test('months belong to a wall clock and are refused on an instant', () => {
  const forward = addToLocal('America/New_York', '2024-01-31T09:00:00', { months: 1 })
  assert.equal(forward.local.month, 2)
  assert.equal(forward.local.day, 29)
  assert.equal(forward.instant, at('2024-02-29T14:00:00Z'))

  const backward = addToLocal('America/New_York', '2024-03-31T09:00:00', { months: -1 })
  assert.equal(backward.local.month, 2)
  assert.equal(backward.local.day, 29)
  assert.equal(backward.instant, at('2024-02-29T14:00:00Z'))

  assert.throws(
    () => addToInstant('America/New_York', at('2024-01-31T14:00:00Z'), { months: 1 }),
    (error) => error instanceof InvalidDurationError && error.code === 'CALENDAR_UNIT_ON_INSTANT',
  )
})

test('a wall clock that lands in the gap or in the repeated hour is resolved there', () => {
  const gap = addToLocal('America/New_York', '2024-03-09T02:30:00', { days: 1 })
  assert.equal(gap.local.day, 10)
  assert.equal(gap.local.hour, 2)
  assert.equal(gap.local.minute, 30)
  assert.equal(gap.resolution, 'nonexistent')
  assert.equal(gap.instant, at('2024-03-10T07:30:00Z'))
  assert.equal(gap.offsetMinutes, -240)

  const repeated = addToLocal('America/New_York', '2024-11-02T01:30:00', { days: 1 })
  assert.equal(repeated.local.day, 3)
  assert.equal(repeated.local.hour, 1)
  assert.equal(repeated.resolution, 'ambiguous')
  assert.equal(repeated.instant, at('2024-11-03T05:30:00Z'))
  assert.equal(repeated.offsetMinutes, -240)
})

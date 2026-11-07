// Sub-problem 5: reports - busy intervals that overlap or touch are one
// busy period, and coverage counts follow the same convention.
import test from 'node:test'
import assert from 'node:assert/strict'
import { busyPeriods, occupancyReport, busiestDay } from '../src/index.js'

test('touching busy intervals merge into one period', () => {
  assert.deepEqual(busyPeriods([{ start: 1, end: 5 }, { start: 5, end: 9 }]), [{ start: 1, end: 9 }])
})

test('a stay inside another stay does not break the chain around it', () => {
  const busy = [{ start: 1, end: 10 }, { start: 3, end: 4 }, { start: 10, end: 12 }]
  assert.deepEqual(busyPeriods(busy), [{ start: 1, end: 12 }])
})

test('the report counts the merged stretches, not the raw stays', () => {
  const busy = [{ start: 2, end: 6 }, { start: 6, end: 10 }, { start: 20, end: 23 }]
  const report = occupancyReport(busy, { start: 1, end: 30 })
  assert.deepEqual(report.periods, [{ start: 2, end: 10 }, { start: 20, end: 23 }])
  assert.equal(report.occupiedDays, 11)
  assert.equal(report.longestPeriod, 8)
})

test('the busiest day is not the day one guest leaves and the next arrives', () => {
  const busy = [{ start: 1, end: 5 }, { start: 5, end: 9 }]
  assert.equal(busiestDay(busy, { start: 1, end: 12 }), 1)
})

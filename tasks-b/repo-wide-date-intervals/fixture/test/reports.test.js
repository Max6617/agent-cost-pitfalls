import test from 'node:test'
import assert from 'node:assert/strict'
import { busyPeriods } from '../src/index.js'

test('back-to-back stays are one busy period', () => {
  assert.deepEqual(busyPeriods([{ start: 1, end: 5 }, { start: 5, end: 9 }]), [{ start: 1, end: 9 }])
})

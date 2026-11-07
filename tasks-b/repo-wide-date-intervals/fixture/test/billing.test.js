import test from 'node:test'
import assert from 'node:assert/strict'
import { billableDays } from '../src/index.js'

test('only the days inside the cycle are billed', () => {
  assert.equal(billableDays({ start: 1, end: 32 }, { start: 10, end: 20 }), 10)
})

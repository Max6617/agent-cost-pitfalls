import test from 'node:test'
import assert from 'node:assert/strict'
import { parseDuration } from '../src/index.js'

test('the durations in the config file read back as milliseconds', () => {
  assert.equal(parseDuration(250), 250)
  assert.equal(parseDuration('250ms'), 250)
  assert.equal(parseDuration('2s'), 2000)
  assert.equal(parseDuration('30s'), 30000)
})

test('a fractional duration keeps its fraction, and a sub-millisecond one is not zero', () => {
  assert.equal(parseDuration('1.5s'), 1500)
  assert.equal(parseDuration('0.4ms'), 1)
})

test('a duration that cannot be read is refused', () => {
  assert.throws(() => parseDuration('1d'), RangeError)
  assert.throws(() => parseDuration('90000s'), RangeError)
})

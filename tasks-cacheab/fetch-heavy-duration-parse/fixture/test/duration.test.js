import test from 'node:test'
import assert from 'node:assert/strict'
import { parseDuration, formatDuration, mustParseDuration, parseProfile } from '../src/duration.js'

const SEC = 1000

test('a seconds component is read', () => {
  assert.equal(parseDuration('PT30S'), 30 * SEC)
})

test('minutes, hours and days are read', () => {
  assert.equal(parseDuration('PT5M'), 300 * SEC)
  assert.equal(parseDuration('PT2H'), 7200 * SEC)
  assert.equal(parseDuration('P1D'), 86400 * SEC)
})

test('weeks are read as seven days', () => {
  assert.equal(parseDuration('P2W'), 14 * 86400 * SEC)
})

test('components combine', () => {
  assert.equal(parseDuration('P1DT12H'), 36 * 3600 * SEC)
  assert.equal(parseDuration('PT1H30M'), 90 * 60 * SEC)
  assert.equal(parseDuration('P1DT2H3M4S'), ((86400 + 2 * 3600 + 3 * 60 + 4) * SEC))
})

test('a fraction applies to the component it is attached to', () => {
  assert.equal(parseDuration('PT1.5H'), 90 * 60 * SEC)
  assert.equal(parseDuration('PT0.5S'), 500)
  assert.equal(parseDuration('P0.5D'), 12 * 3600 * SEC)
})

test('a comma is accepted as the decimal separator', () => {
  assert.equal(parseDuration('PT1,5H'), 90 * 60 * SEC)
})

test('zero is a duration', () => {
  assert.equal(parseDuration('PT0S'), 0)
})

test('the date part may not carry time units', () => {
  assert.equal(parseDuration('P5H'), null)
  assert.equal(parseDuration('P1H'), null)
})

test('the time part may not carry date units', () => {
  assert.equal(parseDuration('PT5D'), null)
  assert.equal(parseDuration('PT1W'), null)
})

test('a component must carry a unit', () => {
  assert.equal(parseDuration('PT5'), null)
  assert.equal(parseDuration('P'), null)
})

test('an empty time part is not a duration', () => {
  assert.equal(parseDuration('P1DT'), null)
  assert.equal(parseDuration('PT'), null)
})

test('something that is not a duration at all is refused', () => {
  assert.equal(parseDuration('30s'), null)
  assert.equal(parseDuration('1d'), null)
  assert.equal(parseDuration(''), null)
  assert.equal(parseDuration(undefined), null)
})

test('mustParseDuration throws with the offending text', () => {
  assert.throws(() => mustParseDuration('30s'), /30s/)
  assert.equal(mustParseDuration('PT1S'), SEC)
})

test('a duration formats back into the notation', () => {
  assert.equal(formatDuration(0), 'PT0S')
  assert.equal(formatDuration(30 * SEC), 'PT30S')
  assert.equal(formatDuration(90 * 60 * SEC), 'PT1H30M')
  assert.equal(formatDuration(86400 * SEC), 'P1D')
  assert.equal(formatDuration(36 * 3600 * SEC), 'P1DT12H')
})

test('format and parse round-trip', () => {
  for (const ms of [SEC, 90 * 60 * SEC, 36 * 3600 * SEC, 14 * 86400 * SEC]) {
    assert.equal(parseDuration(formatDuration(ms)), ms, formatDuration(ms))
  }
})

test('a profile has its duration fields converted and the rest left alone', () => {
  const profile = parseProfile({ name: 'prod', timeout: 'PT30S', interval: 'PT5M', replicas: 3 })
  assert.equal(profile.timeoutMs, 30 * SEC)
  assert.equal(profile.intervalMs, 300 * SEC)
  assert.equal(profile.replicas, 3)
  assert.equal(profile.timeout, 'PT30S')
  assert.equal('graceMs' in profile, false)
})

test('a profile with a bad duration is refused rather than partially converted', () => {
  assert.throws(() => parseProfile({ timeout: '30 seconds' }), /30 seconds/)
})

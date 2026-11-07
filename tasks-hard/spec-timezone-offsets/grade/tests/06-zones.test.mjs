// Sub-problem 6: zones that are not in the table, and zones that never move.
// A zone is a table key or an offset string; anything else is an error.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  offsetAt, instantToLocal, localToInstant, addToLocal, UnknownZoneError,
} from '../src/index.js'

const at = (iso) => Date.parse(iso)

test('a fixed-offset zone has one offset for all time', () => {
  assert.equal(offsetAt('Asia/Kolkata', at('2024-03-10T07:00:00Z')), 330)
  assert.equal(offsetAt('Asia/Kolkata', at('2024-11-03T06:00:00Z')), 330)
  assert.equal(offsetAt('Asia/Kathmandu', at('2024-06-15T00:00:00Z')), 345)
  assert.equal(offsetAt('UTC', at('2024-06-15T00:00:00Z')), 0)
  assert.equal(instantToLocal('Asia/Kathmandu', at('2024-06-15T00:00:00Z')).minute, 45)

  // Africa/Nairobi carries a re-declaration of its own offset: not a change,
  // so it creates neither a gap nor a repetition.
  assert.equal(offsetAt('Africa/Nairobi', at('2024-06-30T23:59:59Z')), 180)
  assert.equal(offsetAt('Africa/Nairobi', at('2024-07-01T00:00:00Z')), 180)
  const nairobi = localToInstant('Africa/Nairobi', '2024-07-01T00:00:00')
  assert.equal(nairobi.resolution, 'exact')
  assert.equal(nairobi.instant, at('2024-06-30T21:00:00Z'))
  assert.equal(nairobi.offsetMinutes, 180)
})

test('a zone the table does not know is an error, not UTC', () => {
  const unknown = (error) => error instanceof UnknownZoneError && error.code === 'UNKNOWN_ZONE'
  assert.throws(() => offsetAt('Mars/Phobos', at('2024-06-15T00:00:00Z')), unknown)
  assert.throws(() => offsetAt('', at('2024-06-15T00:00:00Z')), unknown)
  assert.throws(() => offsetAt('asia/kolkata', at('2024-06-15T00:00:00Z')), unknown)
  assert.throws(() => offsetAt('+05:60', at('2024-06-15T00:00:00Z')), unknown)
  assert.throws(() => offsetAt('+5:30', at('2024-06-15T00:00:00Z')), unknown)
  assert.throws(() => localToInstant('Nowhere/City', '2024-06-15T12:00:00'), unknown)
  assert.throws(
    () => addToLocal('Nowhere/City', '2024-06-15T12:00:00', { days: 1 }),
    unknown,
  )
  assert.throws(() => offsetAt('Mars/Phobos', at('2024-06-15T00:00:00Z')), (error) => error.zone === 'Mars/Phobos')

  // a real zone may sit at offset zero; that is not a licence to invent one
  assert.equal(offsetAt('Europe/Lisbon', at('2024-01-15T12:00:00Z')), 0)
})

test('an explicit offset string is a zone in its own right', () => {
  assert.equal(offsetAt('+05:30', at('2024-06-15T00:00:00Z')), 330)
  assert.equal(offsetAt('-04:00', at('2024-03-10T07:00:00Z')), -240)
  assert.equal(offsetAt('-04:00', at('2024-11-03T06:00:00Z')), -240)
  assert.equal(offsetAt('+00:00', at('2024-06-15T00:00:00Z')), 0)

  const kolkata = localToInstant('+05:30', '2024-03-10T02:30:00')
  assert.equal(kolkata.resolution, 'exact')
  assert.equal(kolkata.instant, at('2024-03-09T21:00:00Z'))
  assert.equal(kolkata.offsetMinutes, 330)

  const epoch = instantToLocal('+05:30', 0)
  assert.equal(epoch.year, 1970)
  assert.equal(epoch.day, 1)
  assert.equal(epoch.hour, 5)
  assert.equal(epoch.minute, 30)

  const repeated = localToInstant('-04:00', '2024-11-03T01:30:00')
  assert.equal(repeated.resolution, 'exact')
  assert.equal(repeated.instant, at('2024-11-03T05:30:00Z'))
})

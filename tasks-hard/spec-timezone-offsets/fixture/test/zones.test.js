import test from 'node:test'
import assert from 'node:assert/strict'
import { offsetAt, localToInstant, UnknownZoneError } from '../src/index.js'

test('an offset string is a zone', () => {
  assert.equal(offsetAt('+05:30', Date.parse('2024-06-15T00:00:00Z')), 330)
  assert.equal(localToInstant('+05:30', '2024-06-15T12:00:00').instant, Date.parse('2024-06-15T06:30:00Z'))
})

test('a zone the table does not have is refused', () => {
  assert.throws(
    () => offsetAt('Mars/Phobos', Date.parse('2024-06-15T00:00:00Z')),
    (error) => error instanceof UnknownZoneError,
  )
})

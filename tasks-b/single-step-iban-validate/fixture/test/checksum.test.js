import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyChecksum } from '../src/index.js'

test('a known-good German IBAN passes the checksum', () => {
  assert.equal(verifyChecksum('DE44500105175407324931'), true)
})

test('a corrupted check digit fails the checksum', () => {
  assert.equal(verifyChecksum('DE54500105175407324931'), false)
})

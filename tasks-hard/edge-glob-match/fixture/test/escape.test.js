import test from 'node:test'
import assert from 'node:assert/strict'
import { match } from '../src/index.js'

test('brackets in a name have to be escaped', () => {
  assert.equal(match('data\\[1\\].json', 'data[1].json'), true)
  assert.equal(match('data\\[1\\].json', 'data1.json'), false)
})

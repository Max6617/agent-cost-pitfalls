import test from 'node:test'
import assert from 'node:assert/strict'
import { createMenu } from '../src/index.js'

test('a trace of sesame warns instead of refusing the dish', () => {
  const menu = createMenu()
  const result = menu.assess('fried-chicken', ['sesame'])
  assert.equal(result.status, 'warning')
  assert.deepEqual(result.matched, [])
  assert.deepEqual(result.warnings, ['sesame'])
})

test('the board for a mustard allergy refuses only the salad', () => {
  const menu = createMenu()
  const board = menu.safeMenu(['mustard'])
  assert.deepEqual(board.excluded, ['garden-salad'])
  assert.deepEqual(board.warning, [])
})

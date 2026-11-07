import test from 'node:test'
import assert from 'node:assert/strict'
import { createMenu } from '../src/index.js'

test('a dish carries the allergens of its ingredients', () => {
  const menu = createMenu()
  const result = menu.assess('fried-chicken', [])
  assert.deepEqual(result.contains, ['dairy', 'egg', 'gluten'])
  assert.equal(result.status, 'safe')
})

test('the dairy board refuses the two butter dishes but not the soup', () => {
  const menu = createMenu()
  const board = menu.safeMenu(['dairy'])
  assert.deepEqual(board.excluded, ['fried-chicken', 'grilled-salmon'])
  assert.ok(board.safe.includes('mushroom-soup'))
})

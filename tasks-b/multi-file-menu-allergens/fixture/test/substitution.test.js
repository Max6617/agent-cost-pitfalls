import test from 'node:test'
import assert from 'node:assert/strict'
import { createMenu } from '../src/index.js'

test('a substituted dish no longer carries the swapped-out sauce', () => {
  const menu = createMenu()
  const result = menu.assess('satay', ['peanut'])
  assert.equal(result.status, 'safe')
  assert.deepEqual(result.contains, [])
})

test('the soup made with coconut milk and rice flour is free of dairy and gluten', () => {
  const menu = createMenu()
  const result = menu.assess('mushroom-soup', ['dairy', 'gluten'])
  assert.equal(result.status, 'safe')
  assert.deepEqual(result.contains, [])
})

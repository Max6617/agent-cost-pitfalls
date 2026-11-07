import test from 'node:test'
import assert from 'node:assert/strict'
import { createMenu } from '../src/index.js'

test('croutons count only when the order asks for them', () => {
  const menu = createMenu()
  assert.equal(menu.assess('garden-salad', ['gluten']).status, 'safe')
  assert.equal(menu.assess('garden-salad', ['gluten'], { includeOptional: true }).status, 'unsafe')
})

test('the peanut garnish makes the satay unsafe when it is ordered', () => {
  const menu = createMenu()
  const result = menu.assess('satay', ['peanut'], { includeOptional: true })
  assert.equal(result.status, 'unsafe')
})

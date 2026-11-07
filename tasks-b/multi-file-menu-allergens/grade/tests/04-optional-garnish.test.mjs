// Sub-problem 4: an optional extra counts only when the order asks for it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createMenu } from '../src/index.js'

test('croutons count only when the order asks for them', () => {
  const menu = createMenu()
  const byDefault = menu.assess('garden-salad', ['gluten'])
  assert.equal(byDefault.status, 'safe')
  assert.deepEqual(byDefault.contains, ['mustard'])

  const asked = menu.assess('garden-salad', ['gluten'], { includeOptional: true })
  assert.equal(asked.status, 'unsafe')
  assert.deepEqual(asked.contains, ['gluten', 'mustard'])
  assert.deepEqual(asked.matched, ['gluten'])
})

test('the walnut crust counts only when the order asks for it', () => {
  const menu = createMenu()
  const byDefault = menu.assess('grilled-salmon', ['tree-nut'])
  assert.equal(byDefault.status, 'safe')
  assert.deepEqual(byDefault.contains, ['dairy', 'fish'])

  const asked = menu.assess('grilled-salmon', ['tree-nut'], { includeOptional: true })
  assert.equal(asked.status, 'unsafe')
  assert.deepEqual(asked.matched, ['tree-nut'])
})

test('the peanut garnish is the only peanut the satay carries when ordered', () => {
  const menu = createMenu()
  const result = menu.assess('satay', ['peanut'], { includeOptional: true })
  assert.equal(result.status, 'unsafe')
  assert.deepEqual(result.contains, ['peanut'])
  assert.deepEqual(result.matched, ['peanut'])
})

test('the default pad thai only warns a peanut guest', () => {
  const menu = createMenu()
  const result = menu.assess('pad-thai', ['peanut'])
  assert.equal(result.status, 'warning')
  assert.deepEqual(result.contains, ['egg', 'soy'])
  assert.deepEqual(result.matched, [])
  assert.deepEqual(result.warnings, ['peanut'])
})

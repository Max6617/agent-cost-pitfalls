// Sub-problem 1: a substitution replaces the ingredient. The dish carries the
// substitute's allergens, and the swapped-out ingredient's allergens are gone.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createMenu } from '../src/index.js'

test('both swaps on the soup clear its contains set', () => {
  const menu = createMenu()
  assert.deepEqual(menu.assess('mushroom-soup', []).contains, [])
})

test('only the swaps in force apply', () => {
  const menu = createMenu({ substitutions: [{ dish: 'mushroom-soup', replace: 'cream', with: 'coconut-milk' }] })
  assert.deepEqual(menu.assess('mushroom-soup', []).contains, ['gluten'])
})

test('a guest is not matched against a swapped-out ingredient', () => {
  const menu = createMenu()
  const result = menu.assess('mushroom-soup', ['dairy', 'gluten'])
  assert.deepEqual(result.matched, [])
  assert.deepEqual(result.contains, [])
})

test('the dairy board refuses the butter dishes but not the soup', () => {
  const menu = createMenu()
  assert.deepEqual(menu.safeMenu(['dairy']), {
    safe: ['garden-salad', 'mushroom-soup', 'pad-thai', 'prawn-toast', 'satay', 'steamed-rice'],
    warning: [],
    excluded: ['fried-chicken', 'grilled-salmon'],
  })
})

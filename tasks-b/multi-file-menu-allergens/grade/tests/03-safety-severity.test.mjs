// Sub-problem 3: the severity ladder - a contains allergen refuses the dish, a
// trace only warns - and the shape of the guest board.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createMenu } from '../src/index.js'

test('a trace match warns instead of refusing the dish', () => {
  const menu = createMenu()
  const result = menu.assess('fried-chicken', ['sesame'])
  assert.equal(result.status, 'warning')
  assert.deepEqual(result.matched, [])
  assert.deepEqual(result.warnings, ['sesame'])
})

test('a contains match refuses the dish', () => {
  const menu = createMenu()
  const result = menu.assess('prawn-toast', ['shellfish'])
  assert.equal(result.status, 'unsafe')
  assert.deepEqual(result.matched, ['shellfish'])
  assert.deepEqual(result.warnings, [])
})

test('a guest with no allergies sees a clean board', () => {
  const menu = createMenu()
  assert.deepEqual(menu.safeMenu([]), {
    safe: ['fried-chicken', 'garden-salad', 'grilled-salmon', 'mushroom-soup', 'pad-thai', 'prawn-toast', 'satay', 'steamed-rice'],
    warning: [],
    excluded: [],
  })
})

test('the sesame board warns on the fryer and refuses only the prawn toast', () => {
  const menu = createMenu()
  assert.deepEqual(menu.safeMenu(['sesame']), {
    safe: ['garden-salad', 'grilled-salmon', 'mushroom-soup', 'pad-thai', 'satay', 'steamed-rice'],
    warning: ['fried-chicken'],
    excluded: ['prawn-toast'],
  })
})

test('assessing a dish that is not on the menu is an error', () => {
  const menu = createMenu()
  assert.throws(() => menu.assess('lobster-thermidor', []), /unknown dish: lobster-thermidor/)
})

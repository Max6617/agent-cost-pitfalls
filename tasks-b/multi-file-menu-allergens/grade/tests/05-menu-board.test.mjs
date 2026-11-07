// Sub-problem 5: the whole board, where the rules meet - substitutions,
// stations, severity and extras all decide which list a dish lands in.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createMenu } from '../src/index.js'

test('the peanut board refuses nothing and warns only on the pad thai', () => {
  const menu = createMenu()
  assert.deepEqual(menu.safeMenu(['peanut']), {
    safe: ['fried-chicken', 'garden-salad', 'grilled-salmon', 'mushroom-soup', 'prawn-toast', 'satay', 'steamed-rice'],
    warning: ['pad-thai'],
    excluded: [],
  })
})

test('the gluten board refuses the two breaded dishes only', () => {
  const menu = createMenu()
  assert.deepEqual(menu.safeMenu(['gluten']), {
    safe: ['garden-salad', 'grilled-salmon', 'mushroom-soup', 'pad-thai', 'satay', 'steamed-rice'],
    warning: [],
    excluded: ['fried-chicken', 'prawn-toast'],
  })
})

test('the shellfish board warns on everything the grill touches', () => {
  const menu = createMenu()
  assert.deepEqual(menu.safeMenu(['shellfish']), {
    safe: ['fried-chicken', 'garden-salad', 'mushroom-soup', 'pad-thai', 'steamed-rice'],
    warning: ['grilled-salmon', 'satay'],
    excluded: ['prawn-toast'],
  })
})

test('without swaps in force the gluten board also refuses the soup and the pad thai', () => {
  const menu = createMenu({ substitutions: [] })
  assert.deepEqual(menu.safeMenu(['gluten']), {
    safe: ['garden-salad', 'grilled-salmon', 'satay', 'steamed-rice'],
    warning: [],
    excluded: ['fried-chicken', 'mushroom-soup', 'pad-thai', 'prawn-toast'],
  })
})

test('ordering every extra rewrites the peanut board', () => {
  const menu = createMenu()
  assert.deepEqual(menu.safeMenu(['peanut'], { includeOptional: true }), {
    safe: ['fried-chicken', 'garden-salad', 'grilled-salmon', 'mushroom-soup', 'prawn-toast', 'steamed-rice'],
    warning: [],
    excluded: ['pad-thai', 'satay'],
  })
})

test('an allergy nothing in the kitchen carries matches nothing', () => {
  const menu = createMenu()
  assert.deepEqual(menu.safeMenu(['sulphites']), {
    safe: ['fried-chicken', 'garden-salad', 'grilled-salmon', 'mushroom-soup', 'pad-thai', 'prawn-toast', 'satay', 'steamed-rice'],
    warning: [],
    excluded: [],
  })
})

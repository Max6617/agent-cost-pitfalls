// Sub-problem 2: traces come from the stations the dish is actually prepared
// on - its own equipment list - never from the kitchen at large.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createMenu } from '../src/index.js'

test('the satay picks up the grill traces and no others', () => {
  const menu = createMenu()
  assert.deepEqual(menu.assess('satay', []).traces, ['fish', 'shellfish'])
})

test('a dish with no stations has no traces', () => {
  const menu = createMenu()
  assert.deepEqual(menu.assess('garden-salad', []).traces, [])
})

test('a dedicated allergen-free station adds no traces', () => {
  const menu = createMenu()
  assert.deepEqual(menu.assess('steamed-rice', []).traces, [])
})

test('an allergen the dish contains is not also reported as a trace', () => {
  const menu = createMenu()
  const result = menu.assess('fried-chicken', [])
  assert.deepEqual(result.contains, ['dairy', 'egg', 'gluten'])
  assert.deepEqual(result.traces, ['sesame'])
})

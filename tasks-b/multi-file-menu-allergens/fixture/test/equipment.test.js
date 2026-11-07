import test from 'node:test'
import assert from 'node:assert/strict'
import { createMenu } from '../src/index.js'

test('a salad that never leaves the prep table carries no fryer traces', () => {
  const menu = createMenu()
  const result = menu.assess('garden-salad', ['sesame'])
  assert.equal(result.status, 'safe')
  assert.deepEqual(result.traces, [])
})

test('steamed rice carries no traces from the fryer or the grill', () => {
  const menu = createMenu()
  const result = menu.assess('steamed-rice', ['gluten'])
  assert.equal(result.status, 'safe')
  assert.deepEqual(result.traces, [])
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, toHex } from '../src/index.js'

test('a positive hue lands on its sector', () => {
  assert.equal(toHex(parse('hsl(120, 100%, 50%)')), '#00ff00')
})

test('a negative hue wraps around the wheel', () => {
  assert.equal(toHex(parse('hsl(-120, 100%, 50%)')), '#0000ff')
})

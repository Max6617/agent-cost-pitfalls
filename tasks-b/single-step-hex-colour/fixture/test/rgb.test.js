import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/index.js'

test('integer channels are taken literally', () => {
  assert.deepEqual(parse('rgb(255, 136, 0)'), { r: 255, g: 136, b: 0, a: 1 })
})

test('percentage channels are percentages of 255', () => {
  assert.deepEqual(parse('rgb(0%, 75%, 100%)'), { r: 0, g: 191, b: 255, a: 1 })
})

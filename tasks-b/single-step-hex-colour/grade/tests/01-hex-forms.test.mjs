// Sub-problem 1: hex notation - #rgb, #rgba, #rrggbb, #rrggbbaa, short-form
// expansion and refusal of what is not hex.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, toHex } from '../src/index.js'

test('#rgb expands each nibble by duplicating it', () => {
  assert.deepEqual(parse('#4fa'), { r: 68, g: 255, b: 170, a: 1 })
  assert.equal(toHex(parse('#4fa')), '#44ffaa')
  assert.equal(toHex(parse('#f80')), '#ff8800')
})

test('#rgba expands the alpha nibble the same way', () => {
  assert.deepEqual(parse('#4fa8'), { r: 68, g: 255, b: 170, a: 136 / 255 })
  assert.deepEqual(parse('#4FA8'), { r: 68, g: 255, b: 170, a: 136 / 255 })
  assert.deepEqual(parse('#4fa8'), parse('#44ffaa88'))
})

test('a short form and its long form are the same colour', () => {
  assert.equal(toHex(parse('#f008')), '#ff000088')
  assert.equal(toHex(parse('#4fa')), toHex(parse('#44ffaa')))
  assert.deepEqual(parse('#3c80f2cc'), { r: 60, g: 128, b: 242, a: 204 / 255 })
  assert.equal(toHex(parse('#3c80f2cc')), '#3c80f2cc')
})

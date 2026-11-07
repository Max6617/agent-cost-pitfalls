import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, toHex } from '../src/index.js'

test('#rgb expands each nibble by duplicating it', () => {
  assert.deepEqual(parse('#4fa'), { r: 68, g: 255, b: 170, a: 1 })
  assert.equal(toHex(parse('#4fa')), '#44ffaa')
})

test('#rgba expands the alpha nibble the same way', () => {
  assert.equal(parse('#4fa8').a, 136 / 255)
  assert.equal(toHex(parse('#f008')), '#ff000088')
})

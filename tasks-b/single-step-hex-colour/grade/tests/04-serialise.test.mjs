// Sub-problem 4: serialisation - the canonical form, and when the alpha earns
// two more digits.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, toHex } from '../src/index.js'

test('an opaque colour drops its alpha; a translucent one keeps two digits', () => {
  assert.equal(toHex(parse('rgb(255, 136, 0)')), '#ff8800')
  assert.equal(toHex(parse('#FF8800')), '#ff8800')
  assert.equal(toHex({ r: 255, g: 0, b: 0, a: 0.999 }), '#ff0000ff')
})

test('the alpha byte rounds half up', () => {
  assert.equal(toHex({ r: 0, g: 0, b: 0, a: 0.5 }), '#00000080')
  assert.equal(toHex({ r: 0, g: 0, b: 0, a: 0.25 }), '#00000040')
  assert.equal(toHex({ r: 0, g: 0, b: 0, a: 0.002 }), '#00000001')
  assert.equal(toHex(parse('rgba(255, 255, 255, 0.65)')), '#ffffffa6')
})

test('channels round and clamp, and bytes pad to two digits', () => {
  assert.equal(toHex({ r: 254.6, g: 0.4, b: 16, a: 1 }), '#ff0010')
  assert.equal(toHex({ r: 300, g: -4, b: 2, a: 2 }), '#ff0002')
  assert.equal(toHex({ r: 18, g: 52, b: 86, a: 0.1 }), '#1234561a')
})

test('a colour survives a serialise and parse round trip', () => {
  const hex = toHex(parse('rgba(92, 181, 44, 0.65)'))
  assert.equal(hex, '#5cb52ca6')
  assert.deepEqual(parse(hex), { r: 92, g: 181, b: 44, a: 166 / 255 })
  assert.equal(toHex(parse(hex)), hex)
})

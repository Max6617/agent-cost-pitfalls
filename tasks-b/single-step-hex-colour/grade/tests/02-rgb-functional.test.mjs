// Sub-problem 2: rgb()/rgba() - integer and percentage channels, clamping
// versus refusal, and the alpha channel.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, toHex } from '../src/index.js'

test('integer channels are taken literally and clamp to the byte range', () => {
  assert.deepEqual(parse('rgb(64, 128, 255)'), { r: 64, g: 128, b: 255, a: 1 })
  assert.deepEqual(parse('rgb(300, -5, 12)'), { r: 255, g: 0, b: 12, a: 1 })
  assert.equal(parse('rgb(1, 2)'), null)
  assert.equal(parse('rgb(1, 2, 3, 4, 5)'), null)
  assert.equal(parse('rgb(10, two, 30)'), null)
  assert.equal(parse('rgb(1.5, 2, 3)'), null)
})

test('percentage channels are percentages of 255', () => {
  assert.deepEqual(parse('rgb(75%, 35%, 0%)'), { r: 191, g: 89, b: 0, a: 1 })
  assert.deepEqual(parse('rgb(80%, 55%, 95%)'), { r: 204, g: 140, b: 242, a: 1 })
  assert.deepEqual(parse('rgb(62.5%, 0%, 0%)'), { r: 159, g: 0, b: 0, a: 1 })
})

test('a declaration may mix integers and percentages', () => {
  assert.deepEqual(parse('rgb(255, 75%, 0)'), { r: 255, g: 191, b: 0, a: 1 })
  assert.equal(toHex(parse('rgba(53%, 0, 0, 1)')), '#870000')
})

test('alpha takes a fraction or a percentage and clamps', () => {
  assert.equal(parse('rgba(10, 20, 30, 25%)').a, 0.25)
  assert.equal(parse('rgba(10, 20, 30, 2)').a, 1)
  assert.equal(parse('rgba(10, 20, 30, -0.5)').a, 0)
  assert.deepEqual(parse('RGB(10, 20, 30)'), { r: 10, g: 20, b: 30, a: 1 })
  assert.equal(toHex(parse('rgba(10, 20, 30, 25%)')), '#0a141e40')
})

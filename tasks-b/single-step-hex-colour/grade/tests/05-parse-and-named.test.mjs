// Sub-problem 5: parse() itself - dispatch, refusal, the named table, and the
// places where the notations meet.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, toHex } from '../src/index.js'

test('names resolve case-insensitively against the documented table', () => {
  assert.deepEqual(parse('green'), { r: 0, g: 128, b: 0, a: 1 })
  assert.deepEqual(parse('RebeccaPurple'), { r: 102, g: 51, b: 153, a: 1 })
  assert.equal(toHex(parse('TOMATO')), '#ff6347')
  assert.equal(toHex(parse('blue')), '#0000ff')
})

test('parse trims its input and refuses what it cannot read', () => {
  assert.deepEqual(parse('  #4fa8\n'), { r: 68, g: 255, b: 170, a: 136 / 255 })
  assert.equal(parse(''), null)
  assert.equal(parse('   '), null)
  assert.equal(parse('blurple'), null)
  assert.equal(parse('#12345'), null)
  assert.equal(parse('#abcde'), null)
  assert.equal(parse('#gg0000'), null)
  assert.equal(parse('rgb(1 2 3)'), null)
  assert.equal(parse(null), null)
  assert.equal(parse(42), null)
})

test('the same colour in two notations parses alike', () => {
  assert.deepEqual(parse('rgb(100%, 53%, 0%)'), parse('#ff8700'))
  assert.equal(toHex(parse('rgba(100%, 0%, 0%, 50%)')), '#ff000080')
})

test('a negative hue still lands on the right named neighbour', () => {
  assert.equal(toHex(parse('hsl(-240, 100%, 25%)')), toHex(parse('green')))
  assert.equal(toHex(parse('hsl(-120, 100%, 50%)')), toHex(parse('blue')))
})

test('alpha from any notation serialises to the same byte', () => {
  assert.equal(toHex(parse('#ff00ff80')), '#ff00ff80')
  assert.equal(toHex(parse('hsla(300, 100%, 50%, 0.5)')), '#ff00ff80')
  assert.equal(toHex(parse('rgba(255, 0, 255, 50%)')), '#ff00ff80')
})

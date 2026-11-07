// Sub-problem 3: hsl()/hsla() - the hue is an angle, saturation and lightness
// are percentages, channels round half up.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, toHex } from '../src/index.js'

test('the hue sectors produce the primaries and secondaries, and grey rounds half up', () => {
  assert.equal(toHex(parse('hsl(0, 100%, 50%)')), '#ff0000')
  assert.equal(toHex(parse('hsl(60, 100%, 50%)')), '#ffff00')
  assert.equal(toHex(parse('hsl(120, 100%, 50%)')), '#00ff00')
  assert.equal(toHex(parse('hsl(180, 100%, 50%)')), '#00ffff')
  assert.equal(toHex(parse('hsl(240, 100%, 50%)')), '#0000ff')
  assert.equal(toHex(parse('hsl(300, 100%, 50%)')), '#ff00ff')
  assert.equal(toHex(parse('hsl(0, 0%, 50%)')), '#808080')
})

test('the hue is an angle: 360 and beyond come back around', () => {
  assert.equal(toHex(parse('hsl(480, 100%, 50%)')), '#00ff00')
  assert.equal(toHex(parse('hsl(780, 100%, 50%)')), '#ffff00')
  assert.equal(toHex(parse('hsl(-120, 100%, 50%)')), '#0000ff')
})

test('a negative hue wraps instead of running off the wheel', () => {
  assert.equal(toHex(parse('hsl(-30, 100%, 50%)')), '#ff0080')
  assert.equal(toHex(parse('hsl(-240, 100%, 50%)')), '#00ff00')
  assert.equal(toHex(parse('hsl(-900, 100%, 50%)')), '#00ffff')
  assert.equal(toHex(parse('hsl(-0.5, 100%, 50%)')), '#ff0002')
})

test('saturation and lightness clamp, and must carry the % sign', () => {
  assert.equal(toHex(parse('hsl(-60, 150%, 50%)')), '#ff00ff')
  assert.equal(toHex(parse('hsl(120, 100%, -10%)')), '#000000')
  assert.equal(parse('hsl(120, 1, 0.5)'), null)
  assert.equal(parse('hsl(120deg, 100%, 50%)'), null)
})

test('hsla carries its alpha through the conversion', () => {
  assert.deepEqual(parse('hsla(240, 100%, 50%, 0.5)'), { r: 0, g: 0, b: 255, a: 0.5 })
  assert.equal(toHex(parse('hsla(240, 100%, 50%, 0.5)')), '#0000ff80')
  assert.equal(toHex(parse('hsl(240, 100%, 50%, 25%)')), '#0000ff40')
})

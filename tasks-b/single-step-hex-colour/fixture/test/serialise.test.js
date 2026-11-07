import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, toHex } from '../src/index.js'

test('an opaque colour serialises as six lowercase digits', () => {
  assert.equal(toHex(parse('rgb(255, 136, 0)')), '#ff8800')
})

test('an alpha below one adds two more digits, rounded to the nearest byte', () => {
  assert.equal(toHex(parse('rgba(255, 0, 0, 0.5)')), '#ff000080')
})

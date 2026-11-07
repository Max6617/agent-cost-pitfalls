import test from 'node:test'
import assert from 'node:assert/strict'
import { add, sub, sum, mul } from '../src/index.js'

test('amounts and the rates applied to them are exact', () => {
  assert.equal(add('0.1', '0.2'), '0.3')
  assert.equal(add('1.10', '2.20'), '3.3')
  assert.equal(sub('1', '0.9'), '0.1')
  assert.equal(sum(['0.01', '0.02', '0.04']), '0.07')
  assert.equal(mul('1.005', '100'), '100.5')
  assert.equal(mul('0.005', '1.09'), '0.00545')
  assert.equal(mul('0.1', '0.1'), '0.01')
})

test('a running total of small charges does not drift', () => {
  const lines = ['0.07', '0.01', '0.29', '1.13', '0.50']
  assert.equal(sum(lines), '2')
  assert.equal(sum(['1.005', '2.005', '-3.01']), '0')
})

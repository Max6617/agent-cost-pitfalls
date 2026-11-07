import test from 'node:test'
import assert from 'node:assert/strict'
import { add, sub } from '../src/calc.js'

test('adds positives', () => assert.equal(add(2, 3), 5))
test('adds negatives', () => assert.equal(add(-2, -3), -5))
test('subtracts', () => assert.equal(sub(2, 3), -1))

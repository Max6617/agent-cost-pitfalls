import test from 'node:test'
import assert from 'node:assert/strict'
import { allocate, sum } from '../src/index.js'

test('the parts of a split add back up to the invoice total', () => {
  const parts = allocate('100.00', ['1', '2', '3'])
  assert.deepEqual(parts, ['16.67', '33.33', '50.00'])
  assert.equal(sum(parts), '100')
  assert.equal(sum(allocate('0.01', ['1', '1', '1'])), '0.01')
})

test('the odd unit goes to the share that was rounded hardest', () => {
  assert.deepEqual(allocate('0.11', ['1', '2', '3']), ['0.02', '0.04', '0.05'])
  // a line with no weight is not handed a share of the charge
  assert.deepEqual(allocate('0.10', ['0', '1', '1', '1']), ['0.00', '0.04', '0.03', '0.03'])
})

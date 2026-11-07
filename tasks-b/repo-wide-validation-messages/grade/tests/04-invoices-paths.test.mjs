// Sub-problem 4: invoice line paths are dotted - the index is part of the
// dotted path, in any position, alongside the root fields.
import test from 'node:test'
import assert from 'node:assert/strict'
import { validateInvoice } from '../src/index.js'

test('a negative line amount is reported on the dotted line path', () => {
  assert.deepEqual(
    validateInvoice({
      number: 'INV-2024-001', issued: '2024-01-31',
      lines: [{ description: 'Consulting', amount: -5 }],
    }),
    [{ field: 'lines.0.amount', code: 'min', message: 'must be at least 0' }],
  )
})

test('issues across several lines come in line order', () => {
  assert.deepEqual(
    validateInvoice({
      number: 'INV-2024-001', issued: '2024-01-31',
      lines: [
        { description: 'First job', amount: 10 },
        { description: 'x', amount: 10 },
        { description: 'Third job', amount: '10' },
      ],
    }),
    [
      { field: 'lines.1.description', code: 'min-length', message: 'must be at least 3 characters' },
      { field: 'lines.2.amount', code: 'type', message: 'must be of type number' },
    ],
  )
})

test('a blank line description is missing, reported on the dotted line path', () => {
  assert.deepEqual(
    validateInvoice({
      number: 'INV-2024-001', issued: '2024-01-31',
      lines: [{ description: '', amount: 5 }],
    }),
    [{ field: 'lines.0.description', code: 'required', message: 'is required' }],
  )
})

test('root fields precede line issues in documented field order', () => {
  assert.deepEqual(
    validateInvoice({
      number: 'INV-2024-001', issued: '2024-01-31', due: 'tomorrow',
      lines: [{ description: 'ok desc', amount: -1 }],
    }),
    [
      { field: 'due', code: 'format', message: 'is not a valid date (YYYY-MM-DD)' },
      { field: 'lines.0.amount', code: 'min', message: 'must be at least 0' },
    ],
  )
})

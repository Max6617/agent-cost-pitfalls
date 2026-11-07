import { issue } from './registry.js'
import { isPlainObject } from './util/type.js'

const NUMBER = /^INV-\d{4}-\d{3}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const missing = (v) => v === undefined || v === null || v === ''

// Line paths come out the way the legacy PDF exporter prints them.
const lineField = (i, name) => 'lines[' + i + '].' + name

export function validateInvoice(input) {
  if (!isPlainObject(input)) return [issue('', 'type', { type: 'object' })]
  const issues = []

  if (missing(input.number)) issues.push(issue('number', 'required'))
  else if (typeof input.number !== 'string') issues.push(issue('number', 'type', { type: 'string' }))
  else if (!NUMBER.test(input.number)) issues.push(issue('number', 'format', { kind: 'invoice number' }))

  if (missing(input.issued)) issues.push(issue('issued', 'required'))
  else if (typeof input.issued !== 'string') issues.push(issue('issued', 'type', { type: 'string' }))
  else if (!DATE.test(input.issued)) issues.push(issue('issued', 'format', { kind: 'date (YYYY-MM-DD)' }))

  if (!missing(input.due)) {
    if (typeof input.due !== 'string') issues.push(issue('due', 'type', { type: 'string' }))
    else if (!DATE.test(input.due)) issues.push(issue('due', 'format', { kind: 'date (YYYY-MM-DD)' }))
  }

  if (missing(input.lines)) issues.push(issue('lines', 'required'))
  else if (!Array.isArray(input.lines)) issues.push(issue('lines', 'type', { type: 'array' }))
  else if (input.lines.length < 1) issues.push(issue('lines', 'min', { min: 1 }))
  else {
    input.lines.forEach((line, i) => {
      if (!isPlainObject(line)) {
        issues.push(issue('lines[' + i + ']', 'type', { type: 'object' }))
        return
      }
      if (missing(line.description)) issues.push(issue(lineField(i, 'description'), 'required'))
      else if (typeof line.description !== 'string') issues.push(issue(lineField(i, 'description'), 'type', { type: 'string' }))
      else if (line.description.length < 3) issues.push(issue(lineField(i, 'description'), 'min-length', { min: 3 }))
      if (missing(line.amount)) issues.push(issue(lineField(i, 'amount'), 'required'))
      else if (typeof line.amount !== 'number') issues.push(issue(lineField(i, 'amount'), 'type', { type: 'number' }))
      else if (line.amount < 0) issues.push(issue(lineField(i, 'amount'), 'min', { min: 0 }))
    })
  }

  return issues
}

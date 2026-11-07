// Sub-problem 4: the string keywords, in code points.
import test from 'node:test'
import assert from 'node:assert/strict'
import { validate, SchemaError } from '../src/index.js'

const pairs = (report) => report.errors.map((entry) => [entry.path, entry.keyword])

test('a length limit counts code points, not UTF-16 units', () => {
  const label = { type: 'string', maxLength: 3 }
  assert.equal(validate(label, '😀😀😀').valid, true)
  assert.equal(validate(label, 'a😀').valid, true)

  const long = validate(label, '😀😀😀😀')
  assert.equal(long.valid, false)
  assert.deepEqual(pairs(long), [['', 'maxLength']])

  const short = validate({ type: 'string', minLength: 2 }, '😀')
  assert.equal(short.valid, false)
  assert.deepEqual(pairs(short), [['', 'minLength']])

  assert.equal(validate({ type: 'string', minLength: 2 }, '😀a').valid, true)
  assert.equal(validate({ type: 'string', minLength: 5 }, '👨‍👩‍👧').valid, true)
  assert.equal(validate({ type: 'string', maxLength: 4 }, '👨‍👩‍👧').valid, false)
})

test('the length boundaries themselves are inclusive', () => {
  const code = { type: 'string', minLength: 3, maxLength: 3 }
  assert.equal(validate(code, 'abc').valid, true)

  const short = validate(code, 'ab')
  assert.equal(short.valid, false)
  assert.deepEqual(pairs(short), [['', 'minLength']])

  const long = validate(code, 'abcd')
  assert.equal(long.valid, false)
  assert.deepEqual(pairs(long), [['', 'maxLength']])
})

test('pattern searches the string, and a broken pattern is a schema bug', () => {
  assert.equal(validate({ type: 'string', pattern: 'b' }, 'abc').valid, true)
  assert.equal(validate({ type: 'string', pattern: 'c$' }, 'abc').valid, true)

  const anchored = validate({ type: 'string', pattern: '^b' }, 'abc')
  assert.equal(anchored.valid, false)
  assert.deepEqual(pairs(anchored), [['', 'pattern']])

  assert.throws(() => validate({ type: 'string', pattern: '(unclosed' }, 'abc'), SchemaError)
})

test('format is an annotation and never rejects a payload', () => {
  assert.equal(validate({ type: 'string', format: 'email' }, 'not-an-email').valid, true)
  assert.equal(validate({ type: 'string', format: 'date' }, '2024-13-45').valid, true)
  assert.equal(validate({ type: 'string', format: 'uuid' }, 'x').valid, true)
  assert.equal(validate({ type: 'string', format: 'nothing-we-know' }, 'x').valid, true)
})

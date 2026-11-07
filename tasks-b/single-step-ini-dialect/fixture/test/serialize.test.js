import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, serialize } from '../src/index.js'

test('a round trip preserves values with edge whitespace', () => {
  const doc = parse('k = " pad "\n')
  assert.deepEqual(parse(serialize(doc)), doc)
})

test('clean values serialize bare in canonical form', () => {
  const doc = parse('title = app\n\n[server]\nhost = example.com\n')
  assert.equal(serialize(doc), 'title = app\n\n[server]\nhost = example.com\n')
})

test('a value containing a quote is quoted and escaped on output', () => {
  const doc = { globals: { motto: 'say "hi"' }, sections: [] }
  assert.equal(serialize(doc), 'motto = "say \\"hi\\""\n')
})

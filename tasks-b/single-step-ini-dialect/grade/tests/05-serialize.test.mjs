// Sub-problem 5: the canonical writer and the round trip.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, serialize } from '../src/index.js'

test('a clean document serializes in canonical form', () => {
  const doc = parse('title = app\n\n[server]\nhost = example.com\nport = 8080\n')
  assert.equal(serialize(doc), 'title = app\n\n[server]\nhost = example.com\nport = 8080\n')
})

test('a value that needs quoting is quoted and escaped', () => {
  const doc = { globals: { motto: 'say "hi"' }, sections: [] }
  assert.equal(serialize(doc), 'motto = "say \\"hi\\""\n')
})

test('a marker without preceding whitespace stays bare', () => {
  const doc = { globals: { expr: 'a;b', lang: 'C#x' }, sections: [] }
  assert.equal(serialize(doc), 'expr = a;b\nlang = C#x\n')
})

test('edge whitespace and the empty value are quoted and survive the round trip', () => {
  const doc = { globals: { k: ' pad ', e: '' }, sections: [] }
  assert.equal(serialize(doc), 'k = " pad "\ne = ""\n')
  assert.deepEqual(parse(serialize(doc)), doc)
})

test('control characters and a trailing backslash escape on output and round-trip', () => {
  const doc = {
    globals: { multiline: 'a\nb', tabbed: 'x\ty', trailing: 'end\\' },
    sections: [],
  }
  assert.equal(serialize(doc), 'multiline = "a\\nb"\ntabbed = "x\\ty"\ntrailing = "end\\\\"\n')
  assert.deepEqual(parse(serialize(doc)), doc)
})

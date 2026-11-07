import test from 'node:test'
import assert from 'node:assert/strict'
import { get, has, parsePointer, unescapeToken, escapeToken, buildPointer, decodeFragment, arrayIndex } from '../src/pointer.js'
import { applyPatch, PatchError } from '../src/patch.js'
import { ConfigService } from '../src/service.js'

const doc = {
  name: 'ingest',
  limits: { maxInflight: 4, tags: ['a', 'b'] },
  'a/b': 1,
  'c~d': 2,
  '~1': 3,
}

function fresh() {
  return JSON.parse(JSON.stringify(doc))
}

test('the empty pointer is the whole document', () => {
  assert.equal(get(doc, ''), doc)
  assert.equal(has(doc, ''), true)
})

test('a pointer addresses a member', () => {
  assert.equal(get(doc, '/name'), 'ingest')
  assert.equal(get(doc, '/limits/maxInflight'), 4)
})

test('a pointer addresses an array element by index', () => {
  assert.equal(get(doc, '/limits/tags/0'), 'a')
  assert.equal(get(doc, '/limits/tags/1'), 'b')
})

test('a pointer into a missing path resolves to nothing', () => {
  assert.equal(get(doc, '/nope'), undefined)
  assert.equal(get(doc, '/limits/nope'), undefined)
  assert.equal(get(doc, '/limits/tags/9'), undefined)
  assert.equal(get(doc, '/name/deeper'), undefined)
})

test('a pointer that does not start with a separator is rejected', () => {
  assert.throws(() => parsePointer('name'), /must start with/)
})

test('the escape character is decoded as a literal', () => {
  assert.equal(get(doc, '/a~1b'), 1)
  assert.equal(get(doc, '/c~0d'), 2)
})

test('the escape sequences decode in the right order', () => {
  assert.equal(unescapeToken('~01'), '~1')
  assert.equal(unescapeToken('~1'), '/')
  assert.equal(unescapeToken('~0'), '~')
  assert.equal(get(doc, '/~01'), 3)
})

test('a key is escaped on the way back out', () => {
  assert.equal(escapeToken('a/b'), 'a~1b')
  assert.equal(escapeToken('c~d'), 'c~0d')
  assert.equal(buildPointer(['limits', 'tags', '0']), '/limits/tags/0')
  assert.equal(buildPointer([]), '')
})

test('a fragment pointer is decoded once', () => {
  assert.deepEqual(parsePointer('/a~1b'), ['a/b'])
  assert.deepEqual(decodeFragment('%2Fa~1b'), ['a/b'])
})

test('array indices are validated strictly', () => {
  assert.equal(arrayIndex('0'), 0)
  assert.equal(arrayIndex('12'), 12)
  assert.equal(arrayIndex('01'), null)
  assert.equal(arrayIndex('+1'), null)
  assert.equal(arrayIndex('-1'), null)
  assert.equal(arrayIndex('-'), null)
})

test('add sets a new member', () => {
  const next = applyPatch(fresh(), [{ op: 'add', path: '/topic', value: 'orders' }])
  assert.equal(next.topic, 'orders')
})

test('add overwrites an existing member', () => {
  const next = applyPatch(fresh(), [{ op: 'add', path: '/name', value: 'other' }])
  assert.equal(next.name, 'other')
})

test('add inserts into an array without replacing the element there', () => {
  const next = applyPatch(fresh(), [{ op: 'add', path: '/limits/tags/1', value: 'x' }])
  assert.deepEqual(next.limits.tags, ['a', 'x', 'b'])
})

test('add appends when the token is a dash', () => {
  const next = applyPatch(fresh(), [{ op: 'add', path: '/limits/tags/-', value: 'z' }])
  assert.deepEqual(next.limits.tags, ['a', 'b', 'z'])
})

test('add past the end of an array is refused', () => {
  assert.throws(() => applyPatch(fresh(), [{ op: 'add', path: '/limits/tags/7', value: 'z' }]), PatchError)
})

test('remove takes a member out', () => {
  const next = applyPatch(fresh(), [{ op: 'remove', path: '/limits/maxInflight' }])
  assert.deepEqual(next.limits.tags, ['a', 'b'])
  assert.equal('maxInflight' in next.limits, false)
})

test('remove takes an array element out and shortens the array', () => {
  const next = applyPatch(fresh(), [{ op: 'remove', path: '/limits/tags/0' }])
  assert.deepEqual(next.limits.tags, ['b'])
})

test('remove of a missing member is an error', () => {
  assert.throws(() => applyPatch(fresh(), [{ op: 'remove', path: '/limits/nope' }]), PatchError)
})

test('replace swaps the value in place', () => {
  const next = applyPatch(fresh(), [{ op: 'replace', path: '/limits/tags/1', value: 'B' }])
  assert.deepEqual(next.limits.tags, ['a', 'B'])
})

test('replace of a missing member is an error', () => {
  assert.throws(() => applyPatch(fresh(), [{ op: 'replace', path: '/limits/nope', value: 1 }]), PatchError)
})

test('move takes the value from the source', () => {
  const next = applyPatch(fresh(), [{ op: 'move', from: '/name', path: '/limits/title' }])
  assert.equal(next.limits.title, 'ingest')
  assert.equal('name' in next, false)
})

test('move within an array lands where the spec says it does', () => {
  const next = applyPatch({ list: ['a', 'b', 'c', 'd'] }, [{ op: 'move', from: '/list/0', path: '/list/3' }])
  assert.deepEqual(next.list, ['b', 'c', 'd', 'a'])
})

test('move of a missing source is an error', () => {
  assert.throws(() => applyPatch(fresh(), [{ op: 'move', from: '/nope', path: '/x' }]), PatchError)
})

test('copy leaves the source alone', () => {
  const next = applyPatch(fresh(), [{ op: 'copy', from: '/name', path: '/limits/title' }])
  assert.equal(next.limits.title, 'ingest')
  assert.equal(next.name, 'ingest')
})

test('copy is a deep copy, not an alias', () => {
  const next = applyPatch(fresh(), [{ op: 'copy', from: '/limits', path: '/other' }])
  next.other.tags.push('c')
  assert.deepEqual(next.limits.tags, ['a', 'b'])
})

test('test passes on an equal value and fails otherwise', () => {
  const ok = applyPatch(fresh(), [{ op: 'test', path: '/name', value: 'ingest' }])
  assert.equal(ok.name, 'ingest')
  assert.throws(() => applyPatch(fresh(), [{ op: 'test', path: '/name', value: 'other' }]), PatchError)
})

test('test compares whole structures', () => {
  assert.doesNotThrow(() =>
    applyPatch(fresh(), [{ op: 'test', path: '/limits/tags', value: ['a', 'b'] }]),
  )
})

test('an unknown operation is refused', () => {
  assert.throws(() => applyPatch(fresh(), [{ op: 'frobnicate', path: '/name' }]), PatchError)
})

test('a failed patch leaves the caller document untouched', () => {
  const original = fresh()
  const before = JSON.stringify(original)
  assert.throws(() =>
    applyPatch(original, [
      { op: 'add', path: '/topic', value: 'x' },
      { op: 'remove', path: '/nope' },
    ]),
  )
  assert.equal(JSON.stringify(original), before)
})

test('operations apply in order', () => {
  const next = applyPatch(fresh(), [
    { op: 'add', path: '/limits/tags/-', value: 'c' },
    { op: 'move', from: '/limits/tags/0', path: '/limits/tags/2' },
  ])
  assert.deepEqual(next.limits.tags, ['b', 'c', 'a'])
})

test('the service stores a successful patch and bumps the revision', () => {
  const service = new ConfigService(fresh())
  const result = service.patch([{ op: 'add', path: '/topic', value: 'orders' }])
  assert.equal(result.ok, true)
  assert.equal(result.revision, 2)
  assert.equal(service.read('/topic'), 'orders')
})

test('the service keeps the document when a patch fails half way', () => {
  const service = new ConfigService(fresh())
  const result = service.patch([
    { op: 'add', path: '/topic', value: 'orders' },
    { op: 'remove', path: '/not-here' },
  ])
  assert.equal(result.ok, false)
  assert.match(result.error, /not-here/)
  assert.equal(service.read('/topic'), undefined)
  assert.equal(service.revision, 1)
})

test('the service lists child keys of a pointer', () => {
  const service = new ConfigService(fresh())
  assert.deepEqual(service.childKeys('/limits/tags'), ['0', '1'])
  assert.deepEqual(service.childKeys('/limits').sort(), ['maxInflight', 'tags'])
  assert.deepEqual(service.childKeys('/name'), [])
})

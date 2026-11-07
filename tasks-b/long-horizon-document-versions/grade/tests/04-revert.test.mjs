// Sub-problem 4: revert opens a NEW draft carrying the older content; the
// published history is never rewritten.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createDocumentService } from '../src/index.js'

const svc = () => {
  const s = createDocumentService()
  s.createDocument({ id: 'spec', title: 'The spec' })
  return s
}
const page = (title, ...blocks) => ({ title, blocks: [...blocks] })

const publish = (s, content) => {
  const d = s.createDraft('spec', {}).draft
  s.saveDraft('spec', d.id, { content, base: s.publishedVersion('spec') })
  return s.publishDraft('spec', d.id)
}

test('revert opens a new draft carrying the older version\'s content', () => {
  const s = svc()
  publish(s, page('one', 'a'))
  publish(s, page('two', 'b'))
  const r = s.revertTo('spec', 1)
  assert.equal(r.status, 'created')
  assert.equal(r.draft.version, 3)
  assert.equal(r.draft.base, 2)
  assert.deepEqual(r.draft.content, page('one', 'a'))
})

test('revert does not rewrite the published history', () => {
  const s = svc()
  publish(s, page('one', 'a'))
  publish(s, page('two', 'b'))
  s.revertTo('spec', 1)
  assert.equal(s.publishedVersion('spec'), 2)
  assert.deepEqual(s.getVersion('spec', 1).content, page('one', 'a'))
  assert.deepEqual(s.getVersion('spec', 2).content, page('two', 'b'))
})

test('the reverted draft publishes as a new version on top of history', () => {
  const s = svc()
  publish(s, page('one', 'a'))
  publish(s, page('two', 'b'))
  const r = s.revertTo('spec', 1)
  const p = s.publishDraft('spec', r.draft.id)
  assert.equal(p.status, 'published')
  assert.equal(p.version, 3)
  assert.deepEqual(s.getVersion('spec', 1).content, page('one', 'a'))
  assert.deepEqual(s.getVersion('spec', 2).content, page('two', 'b'))
  assert.deepEqual(s.getVersion('spec', 3).content, page('one', 'a'))
})

test('reverting to a version that was never published is refused', () => {
  const s = svc()
  assert.equal(s.revertTo('spec', 1).status, 'unknown-version')
  publish(s, page('one', 'a'))
  assert.equal(s.revertTo('spec', 7).status, 'unknown-version')
  assert.deepEqual(s.getVersion('spec', 1).content, page('one', 'a'))
})

test('a revert can be followed by a revert to an even earlier version', () => {
  const s = svc()
  publish(s, page('one', 'a'))
  publish(s, page('two', 'b'))
  publish(s, page('three', 'c'))
  const r1 = s.revertTo('spec', 2)
  assert.equal(r1.draft.version, 4)
  assert.deepEqual(r1.draft.content, page('two', 'b'))
  assert.equal(s.publishDraft('spec', r1.draft.id).status, 'published')
  const r2 = s.revertTo('spec', 1)
  assert.equal(r2.draft.version, 5)
  assert.deepEqual(r2.draft.content, page('one', 'a'))
  assert.equal(s.publishDraft('spec', r2.draft.id).status, 'published')
  assert.deepEqual(s.listVersions('spec').map((e) => [e.version, e.content.title]), [
    [1, 'one'], [2, 'two'], [3, 'three'], [4, 'two'], [5, 'one'],
  ])
})

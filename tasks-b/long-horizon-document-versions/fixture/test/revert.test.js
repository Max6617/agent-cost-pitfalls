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

test('revert opens a new draft carrying the older content', () => {
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

test('reverting to a version that was never published is refused', () => {
  const s = svc()
  assert.equal(s.revertTo('spec', 1).status, 'unknown-version')
  publish(s, page('one', 'a'))
  assert.equal(s.revertTo('spec', 7).status, 'unknown-version')
  assert.deepEqual(s.getVersion('spec', 1).content, page('one', 'a'))
})

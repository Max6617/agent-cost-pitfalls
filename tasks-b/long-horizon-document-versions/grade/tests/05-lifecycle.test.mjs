// Sub-problem 5: the lifecycle as a whole - the pinned order of the version
// list, the delete rules, and a full playback across every rule at once.
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

test('the list is pinned: numbers ascending, published ahead of same-numbered drafts, drafts in order', () => {
  const s = svc()
  publish(s, page('one', 'a'))
  const d1 = s.createDraft('spec', {}).draft
  const d2 = s.createDraft('spec', {}).draft
  s.saveDraft('spec', d1.id, { content: page('two', 'b'), base: 1 })
  s.saveDraft('spec', d2.id, { content: page('two-b', 'c'), base: 1 })
  s.publishDraft('spec', d1.id)
  s.publishDraft('spec', d2.id)
  const d3 = s.createDraft('spec', {}).draft
  assert.deepEqual(
    s.listVersions('spec').map((e) => [e.kind, e.version, e.id ?? null]),
    [['published', 1, null], ['published', 2, null], ['draft', 2, d2.id], ['draft', 3, d3.id]],
  )
})

test('published versions cannot be deleted', () => {
  const s = svc()
  publish(s, page('one', 'a'))
  assert.equal(s.deleteVersion('spec', 1).status, 'not-a-draft')
  assert.equal(s.deleteVersion('spec', 9).status, 'unknown-version')
  assert.deepEqual(s.getVersion('spec', 1).content, page('one', 'a'))
})

test('end to end: draft, publish, race, rebase, revert, and the list still pins its order', () => {
  const s = svc()
  const a = s.createDraft('spec', { author: 'ana' }).draft
  assert.equal(a.id, 'spec#1')
  assert.equal(a.version, 1)
  s.saveDraft('spec', a.id, { content: page('one', 'a'), base: null })
  s.publishDraft('spec', a.id)

  const b = s.createDraft('spec', {}).draft
  const c = s.createDraft('spec', {}).draft
  s.saveDraft('spec', b.id, { content: page('two', 'b'), base: 1 })
  s.saveDraft('spec', c.id, { content: page('two-c', 'cc'), base: 1 })
  assert.equal(s.publishDraft('spec', b.id).status, 'published')
  assert.equal(s.publishDraft('spec', c.id).status, 'stale-base')

  assert.equal(s.deleteDraft('spec', c.id).status, 'deleted')
  const d = s.createDraft('spec', {}).draft
  assert.equal(d.id, 'spec#4')
  assert.equal(d.version, 3)

  const r = s.revertTo('spec', 1)
  assert.equal(r.status, 'created')
  assert.equal(r.draft.version, 3)
  s.deleteDraft('spec', d.id)
  assert.equal(s.publishDraft('spec', r.draft.id).status, 'published')
  assert.equal(s.publishedVersion('spec'), 3)
  assert.deepEqual(s.listVersions('spec').map((e) => [e.kind, e.version, e.content.title]), [
    ['published', 1, 'one'], ['published', 2, 'two'], ['published', 3, 'one'],
  ])
})

test('a draft opened after a revert still numbers off the published version, and loses the race', () => {
  const s = svc()
  publish(s, page('one', 'a'))
  publish(s, page('two', 'b'))
  const r = s.revertTo('spec', 1)
  const d = s.createDraft('spec', {}).draft
  assert.equal(d.version, 3)
  assert.equal(s.publishDraft('spec', r.draft.id).status, 'published')
  const lost = s.publishDraft('spec', d.id)
  assert.equal(lost.status, 'stale-base')
  assert.equal(lost.current, 3)
  assert.deepEqual(s.getVersion('spec', 3).content, page('one', 'a'))
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { createDocumentService } from '../src/index.js'

const svc = () => {
  const s = createDocumentService()
  s.createDocument({ id: 'spec', title: 'The spec' })
  return s
}
const page = (title, ...blocks) => ({ title, blocks: [...blocks] })

test('a new draft is numbered off the published version and starts as its copy', () => {
  const s = svc()
  const first = s.createDraft('spec', {}).draft
  assert.equal(first.version, 1)
  assert.equal(first.base, null)
  assert.deepEqual(first.content, {})
  s.saveDraft('spec', first.id, { content: page('one', 'a'), base: null })
  s.publishDraft('spec', first.id)

  const next = s.createDraft('spec', {}).draft
  assert.equal(next.version, 2)
  assert.equal(next.base, 1)
  assert.deepEqual(next.content, page('one', 'a'))
})

test('saving against a base that is no longer current conflicts', () => {
  const s = svc()
  const a = s.createDraft('spec', {}).draft
  s.saveDraft('spec', a.id, { content: page('one', 'a'), base: null })
  s.publishDraft('spec', a.id)

  const d1 = s.createDraft('spec', {}).draft
  const d2 = s.createDraft('spec', {}).draft
  s.saveDraft('spec', d1.id, { content: page('two', 'x'), base: 1 })
  s.publishDraft('spec', d1.id)

  const r = s.saveDraft('spec', d2.id, { content: page('two-b', 'y'), base: 1 })
  assert.equal(r.status, 'stale-base')
  assert.equal(r.current, 2)
})

test('a refused save leaves the draft exactly as it was', () => {
  const s = svc()
  const a = s.createDraft('spec', {}).draft
  s.saveDraft('spec', a.id, { content: page('one', 'a'), base: null })
  s.publishDraft('spec', a.id)

  const d1 = s.createDraft('spec', {}).draft
  const d2 = s.createDraft('spec', {}).draft
  s.saveDraft('spec', d2.id, { content: page('work in progress', 'w'), base: 1 })
  s.saveDraft('spec', d1.id, { content: page('two', 'x'), base: 1 })
  s.publishDraft('spec', d1.id)
  s.saveDraft('spec', d2.id, { content: page('clobber', 'c'), base: 1 })

  const after = s.getDraft('spec', d2.id)
  assert.deepEqual(after.content, page('work in progress', 'w'))
  assert.equal(after.version, 2)
  assert.equal(after.base, 1)
})

test('published versions cannot be deleted', () => {
  const s = svc()
  const a = s.createDraft('spec', {}).draft
  s.saveDraft('spec', a.id, { content: page('one', 'a'), base: null })
  s.publishDraft('spec', a.id)
  assert.equal(s.deleteVersion('spec', 1).status, 'not-a-draft')
  assert.deepEqual(s.getVersion('spec', 1).content, page('one', 'a'))
})

// Sub-problem 3: saving against a base that is no longer current is a
// documented conflict; saving against the current base re-bases the draft.
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

test('saving against a base that is no longer current conflicts and names the current version', () => {
  const s = svc()
  publish(s, page('one', 'a'))
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
  publish(s, page('one', 'a'))
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

test('saving with the current base re-bases the draft onto it', () => {
  const s = svc()
  publish(s, page('one', 'a'))
  const d1 = s.createDraft('spec', {}).draft
  const d2 = s.createDraft('spec', {}).draft
  s.saveDraft('spec', d1.id, { content: page('two', 'x'), base: 1 })
  s.publishDraft('spec', d1.id)
  const r = s.saveDraft('spec', d2.id, { content: page('three', 'z'), base: 2 })
  assert.equal(r.status, 'saved')
  assert.equal(r.draft.base, 2)
  assert.equal(r.draft.version, 3)
})

test('a re-based draft saves and publishes cleanly', () => {
  const s = svc()
  publish(s, page('one', 'a'))
  const d1 = s.createDraft('spec', {}).draft
  const d2 = s.createDraft('spec', {}).draft
  s.saveDraft('spec', d1.id, { content: page('two', 'x'), base: 1 })
  s.publishDraft('spec', d1.id)
  assert.equal(s.saveDraft('spec', d2.id, { content: page('three', 'z'), base: 2 }).status, 'saved')
  const r = s.publishDraft('spec', d2.id)
  assert.equal(r.status, 'published')
  assert.equal(r.version, 3)
  assert.equal(s.publishedVersion('spec'), 3)
  assert.deepEqual(s.getVersion('spec', 2).content, page('two', 'x'))
})

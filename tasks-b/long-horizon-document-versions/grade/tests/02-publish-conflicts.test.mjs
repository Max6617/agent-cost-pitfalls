// Sub-problem 2: concurrent publish is first-wins; the loser conflicts and can
// re-base to become the next version.
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

// v1 published, then two drafts both based on it, carrying different content.
const race = (s) => {
  publish(s, page('one', 'a'))
  const d1 = s.createDraft('spec', {}).draft
  const d2 = s.createDraft('spec', {}).draft
  s.saveDraft('spec', d1.id, { content: page('first', 'f'), base: 1 })
  s.saveDraft('spec', d2.id, { content: page('second', 's'), base: 1 })
  return { d1, d2 }
}

test('two drafts racing for the same version: the first publish wins', () => {
  const s = svc()
  const { d1, d2 } = race(s)
  const r1 = s.publishDraft('spec', d1.id)
  const r2 = s.publishDraft('spec', d2.id)
  assert.equal(r1.status, 'published')
  assert.equal(r1.version, 2)
  assert.equal(r2.status, 'stale-base')
  assert.equal(r2.current, 2)
})

test('the loser of a race does not replace the winner', () => {
  const s = svc()
  const { d1, d2 } = race(s)
  s.publishDraft('spec', d1.id)
  s.publishDraft('spec', d2.id)
  assert.equal(s.publishedVersion('spec'), 2)
  assert.deepEqual(s.getVersion('spec', 2).content, page('first', 'f'))
})

test('the losing draft can re-base and publish as the next version', () => {
  const s = svc()
  const { d1, d2 } = race(s)
  s.publishDraft('spec', d1.id)
  s.publishDraft('spec', d2.id)
  const saved = s.saveDraft('spec', d2.id, { content: page('second', 's'), base: 2 })
  assert.equal(saved.status, 'saved')
  assert.equal(saved.draft.version, 3)
  const r = s.publishDraft('spec', d2.id)
  assert.equal(r.status, 'published')
  assert.equal(r.version, 3)
  assert.deepEqual(s.getVersion('spec', 2).content, page('first', 'f'))
  assert.deepEqual(s.getVersion('spec', 3).content, page('second', 's'))
})

test('a published draft is consumed: publishing it again reports unknown-draft', () => {
  const s = svc()
  const d = s.createDraft('spec', {}).draft
  s.saveDraft('spec', d.id, { content: page('one', 'a'), base: null })
  assert.equal(s.publishDraft('spec', d.id).status, 'published')
  assert.equal(s.publishDraft('spec', d.id).status, 'unknown-draft')
})

test('the race for the very first version is first-wins as well', () => {
  const s = svc()
  const d1 = s.createDraft('spec', {}).draft
  const d2 = s.createDraft('spec', {}).draft
  s.saveDraft('spec', d1.id, { content: page('first', 'f'), base: null })
  s.saveDraft('spec', d2.id, { content: page('second', 's'), base: null })
  const r1 = s.publishDraft('spec', d1.id)
  const r2 = s.publishDraft('spec', d2.id)
  assert.equal(r1.status, 'published')
  assert.equal(r2.status, 'stale-base')
  assert.equal(r2.current, 1)
  assert.deepEqual(s.getVersion('spec', 1).content, page('first', 'f'))
})

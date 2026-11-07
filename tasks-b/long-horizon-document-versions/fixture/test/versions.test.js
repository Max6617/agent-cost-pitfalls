import test from 'node:test'
import assert from 'node:assert/strict'
import { createDocumentService } from '../src/index.js'

const svc = () => {
  const s = createDocumentService()
  s.createDocument({ id: 'spec', title: 'The spec' })
  return s
}
const page = (title, ...blocks) => ({ title, blocks: [...blocks] })

test('publishing lands the saved content under the next number', () => {
  const s = svc()
  const { draft } = s.createDraft('spec', { author: 'ana' })
  assert.equal(draft.version, 1)
  assert.equal(s.saveDraft('spec', draft.id, { content: page('one', 'a'), base: null }).status, 'saved')
  const r = s.publishDraft('spec', draft.id)
  assert.equal(r.status, 'published')
  assert.equal(r.version, 1)
  assert.deepEqual(s.getVersion('spec', 1).content, page('one', 'a'))
})

test('a published version is frozen even when the caller keeps the object it saved', () => {
  const s = svc()
  const { draft } = s.createDraft('spec', {})
  const kept = page('one', 'a')
  s.saveDraft('spec', draft.id, { content: kept, base: null })
  s.publishDraft('spec', draft.id)
  kept.title = 'rewritten'
  kept.blocks.push('b')
  assert.deepEqual(s.getVersion('spec', 1).content, page('one', 'a'))
})

test('two drafts racing for the same version: the first publish wins', () => {
  const s = svc()
  const a = s.createDraft('spec', {}).draft
  s.saveDraft('spec', a.id, { content: page('one', 'a'), base: null })
  s.publishDraft('spec', a.id)

  const d1 = s.createDraft('spec', {}).draft
  const d2 = s.createDraft('spec', {}).draft
  s.saveDraft('spec', d1.id, { content: page('first', 'f'), base: 1 })
  s.saveDraft('spec', d2.id, { content: page('second', 's'), base: 1 })
  assert.equal(s.publishDraft('spec', d1.id).status, 'published')
  const loser = s.publishDraft('spec', d2.id)
  assert.equal(loser.status, 'stale-base')
  assert.equal(loser.current, 2)
})

test('the loser of a race does not replace the winner', () => {
  const s = svc()
  const a = s.createDraft('spec', {}).draft
  s.saveDraft('spec', a.id, { content: page('one', 'a'), base: null })
  s.publishDraft('spec', a.id)

  const d1 = s.createDraft('spec', {}).draft
  const d2 = s.createDraft('spec', {}).draft
  s.saveDraft('spec', d1.id, { content: page('first', 'f'), base: 1 })
  s.saveDraft('spec', d2.id, { content: page('second', 's'), base: 1 })
  s.publishDraft('spec', d1.id)
  s.publishDraft('spec', d2.id)
  assert.equal(s.publishedVersion('spec'), 2)
  assert.deepEqual(s.getVersion('spec', 2).content, page('first', 'f'))
})

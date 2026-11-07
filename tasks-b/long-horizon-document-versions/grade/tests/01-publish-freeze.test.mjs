// Sub-problem 1: publishing freezes content; the service never aliases a
// caller's objects - copies in, copies out.
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

test('the happy path: publishing lands the saved content under the next number', () => {
  const s = svc()
  const d = s.createDraft('spec', {}).draft
  assert.equal(d.version, 1)
  assert.equal(d.base, null)
  assert.equal(s.saveDraft('spec', d.id, { content: page('one', 'a'), base: null }).status, 'saved')
  const r = s.publishDraft('spec', d.id)
  assert.equal(r.status, 'published')
  assert.equal(r.version, 1)
  assert.equal(s.publishedVersion('spec'), 1)
  assert.deepEqual(s.getVersion('spec', 1).content, page('one', 'a'))
})

test('a published version is frozen even when the caller keeps the object it saved', () => {
  const s = svc()
  const d = s.createDraft('spec', {}).draft
  const kept = page('one', 'a')
  s.saveDraft('spec', d.id, { content: kept, base: null })
  s.publishDraft('spec', d.id)
  kept.title = 'rewritten'
  kept.blocks.push('b')
  assert.deepEqual(s.getVersion('spec', 1).content, page('one', 'a'))
})

test('what getVersion hands out is a copy, not the stored record', () => {
  const s = svc()
  publish(s, page('one', 'a'))
  const leaked = s.getVersion('spec', 1)
  leaked.content.title = 'edited'
  leaked.content.blocks.push('b')
  assert.deepEqual(s.getVersion('spec', 1).content, page('one', 'a'))
})

test('a draft cannot be edited through the object getDraft returned', () => {
  const s = svc()
  publish(s, page('one', 'a'))
  const d = s.createDraft('spec', {}).draft
  s.saveDraft('spec', d.id, { content: page('two', 'x'), base: 1 })
  const leaked = s.getDraft('spec', d.id)
  leaked.content.blocks.push('y')
  s.publishDraft('spec', d.id)
  assert.deepEqual(s.getVersion('spec', 2).content, page('two', 'x'))
})

test('listVersions hands out copies as well', () => {
  const s = svc()
  publish(s, page('one', 'a'))
  const list = s.listVersions('spec')
  list[0].content.blocks.push('b')
  assert.deepEqual(s.listVersions('spec')[0].content, page('one', 'a'))
})

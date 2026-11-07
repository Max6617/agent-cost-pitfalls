// Sub-problem 6: what the diff reports, and the patch that has to undo it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { patch, diff, clone, hasOwn, REMOVED } from '../src/index.js'

test('a diff over an array of objects holding NaN and dates is not a change', () => {
  const jobsA = [{ id: 1, retryAt: new Date(1700000000000) }, { id: 2, pause: Number.NaN }]
  const jobsB = [{ id: 1, retryAt: new Date(1700000000000) }, { id: 2, pause: Number.NaN }]

  assert.equal(diff({ jobs: jobsA }, { jobs: jobsB }), null)

  const change = diff({ jobs: jobsA }, { jobs: [{ id: 1, retryAt: new Date(1700000000000) }, { id: 2, pause: 5 }] })
  assert.ok(change, 'the pause changed')
  assert.equal(Array.isArray(change.jobs), true, 'the changed array is carried whole')
  assert.equal(change.jobs[1].pause, 5)
})

test('a diff over two arrays with the same contents is not a change, a different one is', () => {
  const target = { upstreams: ['payments', 'inventory'], limits: { cpu: 1 } }
  const same = { upstreams: ['payments', 'inventory'], limits: { cpu: 1 } }
  const shorter = { upstreams: ['payments'], limits: { cpu: 1 } }

  assert.equal(diff(target, same), null)
  assert.deepEqual(diff(target, shorter), { upstreams: ['payments'] })
  assert.deepEqual(diff({ jobs: [{ at: new Date(1000) }] }, { jobs: [{ at: new Date(1000) }] }), null)
})

test('an added key and a removed key are both named, and applying the patch lands on the source', () => {
  const target = { listen: { port: 80, host: '127.0.0.1' }, name: 'checkout', drop: 1 }
  const source = { listen: { port: 8080, host: '127.0.0.1' }, name: 'checkout', added: 2 }

  const change = diff(target, source)

  assert.ok(change)
  assert.equal(change.added, 2, 'an added key carries the source value')
  assert.equal(change.drop, REMOVED, 'a removed key is marked with the removal marker')
  assert.equal(hasOwn(change, 'name'), false, 'an unchanged key is not in the patch')
  assert.deepEqual(change.listen, { port: 8080 })
  assert.equal(hasOwn(change.listen, 'host'), false, 'an unchanged key is not in the nested patch')

  const applied = patch(target, change)
  assert.deepEqual(applied, source)
  assert.deepEqual(applied.listen, source.listen)
  assert.equal(hasOwn(applied, 'drop'), false, 'the marker deletes the key')
  assert.equal(patch({ drop: 1 }, { drop: null }).drop, null, 'null is still a value')
})

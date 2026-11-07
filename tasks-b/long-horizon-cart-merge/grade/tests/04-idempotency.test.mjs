// Sub-problem 4: a guest cart merges once, ever. The merge empties it and spends
// its token; no later login - to the same account or another one - merges it
// again, and items added after the token was spent never merge anywhere.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createCartService } from '../src/index.js'

function svc() {
  return createCartService({
    catalog: [
      { sku: 'MUG', title: 'Enamel mug', priceCents: 1200 },
      { sku: 'TEA', title: 'Green tea', priceCents: 800 },
    ],
    stock: { MUG: 20, TEA: 20 },
    maxPerCustomer: 6,
  })
}

test('a second login with the same token is a no-op reported as already-merged', () => {
  const s = svc()
  s.guestAdd('g-1', { sku: 'MUG', qty: 2, addedAt: '2026-01-10' })
  const first = s.login('alice', 'g-1', '2026-01-15')
  const second = s.login('alice', 'g-1', '2026-01-16')
  assert.equal(first.status, 'merged')
  assert.equal(second.status, 'already-merged')
  assert.equal(second.couponKept, false)
  assert.equal(s.view('alice').lines.find((l) => l.sku === 'MUG').qty, 2)
})

test('a merge empties the guest cart', () => {
  const s = svc()
  s.guestAdd('g-1', { sku: 'MUG', qty: 2, addedAt: '2026-01-10' })
  s.guestAdd('g-1', { sku: 'TEA', qty: 1, addedAt: '2026-01-11' })
  s.login('alice', 'g-1', '2026-01-15')
  assert.equal(s.guestView('g-1').lines.length, 0)
})

test('a guest token spent on one account cannot merge into another', () => {
  const s = svc()
  s.guestAdd('g-1', { sku: 'MUG', qty: 2, addedAt: '2026-01-10' })
  s.login('alice', 'g-1', '2026-01-15')
  const second = s.login('bob', 'g-1', '2026-01-16')
  assert.equal(second.status, 'already-merged')
  assert.equal(s.view('bob').lines.length, 0)
  assert.equal(s.view('alice').lines.find((l) => l.sku === 'MUG').qty, 2)
})

test('a repeated login cannot push a line past the cap', () => {
  const s = svc()
  s.accountAdd('alice', { sku: 'MUG', qty: 3, addedAt: '2026-01-05' })
  s.guestAdd('g-1', { sku: 'MUG', qty: 3, addedAt: '2026-01-10' })
  s.login('alice', 'g-1', '2026-01-15')
  s.login('alice', 'g-1', '2026-01-16')
  assert.equal(s.view('alice').lines.find((l) => l.sku === 'MUG').qty, 6)
})

test('items added under a spent token never merge', () => {
  const s = svc()
  s.guestAdd('g-1', { sku: 'MUG', qty: 2, addedAt: '2026-01-10' })
  s.login('alice', 'g-1', '2026-01-15')
  s.guestAdd('g-1', { sku: 'TEA', qty: 3, addedAt: '2026-01-16' })
  const second = s.login('alice', 'g-1', '2026-01-17')
  const view = s.view('alice')
  assert.equal(second.status, 'already-merged')
  assert.equal(view.lines.find((l) => l.sku === 'MUG').qty, 2)
  assert.equal(view.lines.some((l) => l.sku === 'TEA'), false)
})

/**
 * retry.test.mjs - the preflight retry policy, tested without waiting for it.
 *
 * WHY THE POLICY IS ITS OWN MODULE. It lives in tools/collect.mjs, which runs on import - the same
 * trap the brace guard fell into yesterday. A policy that cannot be tested is a policy nobody can
 * check, so the loop is here and collect.mjs calls it.
 *
 * THE LIVE CASE. On 2026-10-05 openhands made ZERO requests to the gateway while a second collector
 * ran beside ours (two openhands instances cannot coexist), and the matrix correctly refused to
 * start. The condition was transient; the pipeline had no way to wait it out.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { retry } from './retry.mjs'

const noSleep = { sleep: async () => {} }

test('a success on the first attempt is returned immediately', async () => {
  const calls = []
  const r = await retry(3, 1000, async (n) => { calls.push(n); return { ok: true, n } }, noSleep)
  assert.equal(r.ok, true)
  assert.equal(r.n, 1)
  assert.equal(r.attempts, 1)
  assert.deepEqual(calls, [1], 'a success must not be retried')
})

test('a transient failure is retried until it succeeds, and the attempt count is reported', async () => {
  const calls = []
  const r = await retry(3, 1000, async (n) => { calls.push(n); return { ok: n === 3 } }, noSleep)
  assert.equal(r.ok, true)
  assert.equal(r.attempts, 3)
  assert.deepEqual(calls, [1, 2, 3])
})

test('a persistent failure gives up after the cap, with the LAST result', async () => {
  let calls = 0
  const r = await retry(3, 1000, async (n) => { calls++; return { ok: false, n } }, noSleep)
  assert.equal(r.ok, false)
  assert.equal(r.attempts, 3)
  assert.equal(calls, 3, 'exactly the cap, not one more')
  assert.equal(r.n, 3, 'the caller gets the last attempt, not the first')
})

test('the delay is applied BETWEEN attempts and not after the last', async () => {
  const slept = []
  const sleep = async (ms) => { slept.push(ms) }
  await retry(3, 5000, async () => ({ ok: false }), { sleep })
  assert.deepEqual(slept, [5000, 5000], 'two waits for three attempts')
})

test('attempts start at 1 and the callback can use the number (it names the probe directory)', async () => {
  const seen = []
  await retry(2, 1, async (n) => { seen.push(n); return { ok: false } }, noSleep)
  assert.deepEqual(seen, [1, 2])
})
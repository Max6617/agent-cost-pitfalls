/**
 * prefix-retention.test.mjs - PROPERTY tests for the cache-prefix mechanism analysis.
 *
 * The two properties below are the traps this analysis actually fell into while it was being
 * built, and each produced a confident, wrong number:
 *
 *  1. DSH sends an AUXILIARY request (max_tokens 64, one message, ~50 input tokens) that is not
 *     part of the conversation. Counting it in the retention sequence reads a cache hit against a
 *     tiny denominator and reports retention ABOVE 1 - the first probe reported a mean of 5.18.
 *  2. Retention must be measured against the RUNNING MAXIMUM prefix, not the previous request,
 *     because the conversation only ever grows. It is a fraction and cannot exceed 1.
 *
 * A third trap is why the classifier is STRUCTURAL: no request field separates an auxiliary call
 * from a real one across providers. maxTokens is 64 for DSH's auxiliary call, null for most GLM
 * records and absent entirely for OpenAI's, so any field-based rule either keeps the auxiliary
 * calls or deletes every OpenAI request.
 *
 * Run: node --test tools/prefix-retention.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { armClass, retentionSequence, growthFraction, pairByTask } from './prefix-retention.mjs'

const req = (inputTokens, cacheHitTokens, requestBytes, extra = {}) => ({
  usage: { inputTokens, cacheHitTokens, cacheMissTokens: inputTokens - cacheHitTokens },
  requestBytes, ...extra,
})
const AUX = { messages: 1, tools: null, maxTokens: 64 }

test('retention never exceeds 1', () => {
  const reqs = [
    req(2000, 0, 9000),
    req(2600, 2000, 11500),
    req(50, 0, 400, AUX),
    req(3400, 2600, 13200),
    req(60, 0, 420, AUX),
    req(4100, 3400, 14100),
  ]
  for (const r of retentionSequence(reqs)) assert.ok(r <= 1.0000001, 'retention above 1: ' + r)
})

test('an auxiliary call neither contributes a transition nor moves the running prefix', () => {
  const withAux = [req(2000, 0, 9000), req(2600, 2000, 11500), req(50, 0, 400, AUX), req(3400, 2600, 13200)]
  const withoutAux = [withAux[0], withAux[1], withAux[3]]
  assert.deepEqual(retentionSequence(withAux), retentionSequence(withoutAux),
    'the auxiliary call changed the measured retention sequence')
  assert.equal(retentionSequence(withAux).length, 2, 'one transition per genuine continuation')
})

test('a continuation carrying no conversation is not a transition', () => {
  // The structural rule: a continuation carries a substantial share of the prefix it continues.
  const reqs = [req(9000, 0, 40000), req(50, 0, 400, { messages: 1 }), req(12000, 9000, 52000)]
  assert.equal(retentionSequence(reqs).length, 1)
})

test('a genuine continuation is measured against the largest prefix seen so far', () => {
  const reqs = [req(2000, 0, 9000), req(2600, 2000, 11500), req(3400, 2600, 13200)]
  const ret = retentionSequence(reqs)
  assert.equal(ret.length, 2)
  assert.ok(Math.abs(ret[1] - 1) < 1e-9, 'second transition retention = ' + ret[1])
})

test('a shrink is visible to the growth fraction', () => {
  assert.equal(growthFraction([req(2000, 0, 9000), req(2600, 0, 11500), req(3000, 0, 11000)]), 0.5)
})

test('arm classes', () => {
  assert.equal(armClass('dsh:ptc'), 'ptc')
  assert.equal(armClass('dsh:native'), 'native')
  assert.equal(armClass('goose'), 'external')
})

test('pairing keeps only tasks where both presentation arms exist', () => {
  const rows = [
    { task: 'a', cls: 'ptc', value: 0.9 }, { task: 'a', cls: 'native', value: 0.8 },
    { task: 'b', cls: 'ptc', value: 0.7 },
  ]
  const pairs = pairByTask(rows)
  assert.equal(pairs.length, 1)
  assert.deepEqual(pairs[0], { task: 'a', ptc: 0.9, native: 0.8 })
})

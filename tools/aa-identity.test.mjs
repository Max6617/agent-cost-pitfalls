/**
 * aa-identity.test.mjs - the A/A byte-identity gate passes identical copies and stops on a difference.
 *
 * Run: node --test tools/aa-identity.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { identityReport } from './aa-identity.mjs'

const run = (task, seed, arm, runId) => ({ task, seed, arm, runId })
const req = (runId, ts, hash, aux = false, status = 200) => ({
  syntheticKey: 'exp-dsh-' + runId, ts, requestHash: hash, status, requestBytes: hash.length,
  maxTokens: aux ? 64 : 32768, tools: aux ? 0 : 24,
})

test('identical first main and auxiliary requests pass', () => {
  const runs = [run('t', 1, 'dsh:native', 'm-dsh-t-dshnative-s1'), run('t', 1, 'dsh:native-twin', 'm-dsh-t-dshnativetwin-s1')]
  const gw = [
    req('m-dsh-t-dshnative-s1', '1', 'aaaa'), req('m-dsh-t-dshnative-s1', '2', 'xx', true),
    req('m-dsh-t-dshnativetwin-s1', '3', 'aaaa'), req('m-dsh-t-dshnativetwin-s1', '4', 'xx', true),
    // later requests may differ (the model's own continuation): only the FIRST is the identity check
    req('m-dsh-t-dshnative-s1', '5', 'later-1'), req('m-dsh-t-dshnativetwin-s1', '6', 'later-2'),
  ]
  const r = identityReport(runs, gw)
  assert.equal(r.mainIdentical, 1)
  assert.equal(r.auxIdentical, 1)
  assert.equal(r.pass, true)
})

test('a differing first main request fails the gate', () => {
  const runs = [run('t', 1, 'dsh:native', 'a'), run('t', 1, 'dsh:native-twin', 'b')]
  const r = identityReport(runs, [req('a', '1', 'h1'), req('b', '2', 'h2')])
  assert.equal(r.mainDiffers, 1)
  assert.equal(r.pass, false)
})

test('a block without requests, or without its twin, cannot pass', () => {
  assert.equal(identityReport([run('t', 1, 'dsh:native', 'a')], [req('a', '1', 'h')]).pass, false)
  assert.equal(identityReport([run('t', 1, 'dsh:native', 'a'), run('t', 1, 'dsh:native-twin', 'b')], []).pass, false)
  assert.equal(identityReport([], []).pass, false)
})

test('failed requests are not compared: the first SUCCESSFUL request is', () => {
  const runs = [run('t', 1, 'dsh:native', 'a'), run('t', 1, 'dsh:native-twin', 'b')]
  const gw = [req('a', '1', 'bad', false, 429), req('a', '2', 'h'), req('b', '3', 'h')]
  assert.equal(identityReport(runs, gw).pass, true)
})

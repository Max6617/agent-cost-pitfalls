/**
 * study-window-retention.test.mjs - one window, every reader.
 *
 * The cut-off in tools/study-window.mjs was wired into cost-panel but NOT into prefix-retention, and
 * a rebuild exposed it: luna|external.cont read 6272 instead of the signed-off 6257, because the 15
 * records a runaway process appended after sign-off were still being counted. One window, honoured by
 * one tool, is not a window - it is a coincidence.
 *
 * Run: node --test tools/study-window-retention.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const OUT = 'results/_scratch/prefix-retention-window-test.json'

test('REAL DATA: prefix-retention honours the cut-off, so luna|external is the signed-off value', () => {
  const stdout = execFileSync(process.execPath, ['tools/prefix-retention.mjs', '--json', OUT], { encoding: 'utf8' })
  const doc = JSON.parse(readFileSync(OUT, 'utf8'))
  assert.equal(doc.aggregate['gpt-6-luna|external'].cont, 6257,
    'the 15 post-sign-off records must not be counted as continuations')
  assert.match(stdout, /cut[- ]off|excluded/i, 'the exclusion must be REPORTED, never silent')
})

test('REAL DATA: the two Anthropic models, which the drift never touched, are unchanged', () => {
  const doc = JSON.parse(readFileSync(OUT, 'utf8'))
  assert.equal(doc.aggregate['claude-haiku-4.5|external'].cont, 9591)
  assert.equal(doc.aggregate['claude-sonnet-5.5|external'].cont, 3333)
})

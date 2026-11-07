/**
 * arg-guard.test.mjs - the harness command line must not carry an unsubstituted TEMPLATE placeholder,
 * and a PROMPT is data.
 *
 * THE DEFECT. tools/run-experiment.mjs scanned every substituted argument for /\{[a-zA-Z]+\}/ and
 * refused to launch when it matched. tasks-b/multi-file-locale-fallback is a task about placeholder
 * leaking, so its prompt says 'Placeholders like {name} are also leaking into rendered pages'. The
 * guard read that as an unsubstituted template variable and refused to launch on all four external
 * harnesses, both seeds: 8 cells of every matrix, and the verify stage then refused the sign-off
 * because the records carry an error. DSH escaped only because its branch returns before the guard.
 *
 * Written before the module existed.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertNoUnsubstituted, TEMPLATE_PLACEHOLDER } from './arg-guard.mjs'

const PROMPT = 'Translation complaints are piling up: placeholders like {name} are leaking into pages.'

test('a prompt containing {name} is DATA and must not fail the guard', () => {
  assert.doesNotThrow(() => assertNoUnsubstituted(['--prompt', PROMPT], ['--prompt', PROMPT]))
})

test('a prompt containing a template-shaped token is still data', () => {
  const p = 'the harness asked for {model} and {key} in its own error message'
  assert.doesNotThrow(() => assertNoUnsubstituted(['--prompt'], [p]))
})

test('an unsubstituted TEMPLATE placeholder still fails: that is the whole job', () => {
  assert.throws(() => assertNoUnsubstituted(['-k', '{key}'], ['-k', '{key}']), /unsubstituted placeholder/)
  assert.throws(() => assertNoUnsubstituted(['{prompt}'], ['{prompt}']), /unsubstituted placeholder/)
  assert.throws(() => assertNoUnsubstituted(['--base-url', '{baseUrl}'], ['--base-url', '{baseUrl}']), /unsubstituted/)
})

test('a template placeholder that WAS substituted passes', () => {
  assert.doesNotThrow(() => assertNoUnsubstituted(['-k', '{key}'], ['-k', 'exp-dsh-run01']))
  assert.doesNotThrow(() => assertNoUnsubstituted(['{prompt}'], [PROMPT]))
})

test('the known template placeholders are exactly the ones substitution handles', () => {
  for (const tok of ['prompt', 'model', 'provider', 'key', 'baseUrl', 'configDir', 'timeoutSec', 'workdir']) {
    assert.ok(TEMPLATE_PLACEHOLDER.test('{' + tok + '}'), tok + ' must be a recognised template placeholder')
  }
  assert.ok(!TEMPLATE_PLACEHOLDER.test('{name}'), 'a prompt-shaped token is not a template placeholder')
})
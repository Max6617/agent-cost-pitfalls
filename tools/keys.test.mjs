/**
 * keys.test.mjs - one implementation of "which key file wins", and it must ignore templates.
 *
 * THE BUG THIS EXISTS FOR, found 2026-10-02 when the GLM matrix refused to start with
 * "no usable key for zai in .keys.json / FILL-IN-KEYS.json" - while tools/check-providers.mjs,
 * running one stage earlier, had just reached z.ai and reported it FUNDED.
 *
 * There are two key stores on disk:
 *   .keys.json          the real keys
 *   FILL-IN-KEYS.json   a TEMPLATE, shipped with PASTE_..._HERE placeholders
 *
 * tools/keys.mjs merged them correctly: sort by mtime, later write wins, a PASTE_ placeholder
 * counts as absent. tools/collect.mjs had its own copy of the merge which did
 * { ...keys.json, ...FILL-IN-KEYS.json } - so the template's placeholders sat ON TOP of the
 * real keys, every provider resolved to nothing, and the pipeline stopped. It stopped safely,
 * which is the only reason this cost ten minutes instead of 620 dead cells.
 *
 * Run: node --test tools/keys.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, utimesSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadKeys, resolveUpstreamKey } from './keys.mjs'

const REAL = 'sk-real-0123456789abcdef'
const REAL2 = 'sk-other-0123456789abcdef'
const PLACEHOLDER = 'PASTE_ZAI_KEY_HERE'

let n = 0
function dir () {
  const d = join(tmpdir(), 'dsh-exp-keys-test-' + Date.now().toString(36) + '-' + (n++))
  mkdirSync(d, { recursive: true })
  return d
}
/** Two files written in the same millisecond sort unstably; force a real order. */
function writeKeys (d, target, obj, ageSecs) {
  const p = join(d, target)
  writeFileSync(p, JSON.stringify(obj))
  const t = new Date(Date.now() - ageSecs * 1000)
  utimesSync(p, t, t)
  return p
}

test('a PASTE_ placeholder in the template never shadows a real key', () => {
  const d = dir()
  writeKeys(d, '.keys.json', { zai: REAL }, 10)
  writeKeys(d, 'FILL-IN-KEYS.json', { zai: PLACEHOLDER }, 0) // newer, so it would win on mtime
  assert.equal(loadKeys(d).zai, REAL,
    'FILL-IN-KEYS.json is a template; its placeholder must count as absent, not as a key')
})

test('the later-written key file wins when both hold real keys', () => {
  const d = dir()
  writeKeys(d, '.keys.json', { zai: REAL }, 10)
  writeKeys(d, 'FILL-IN-KEYS.json', { zai: REAL2 }, 0)
  assert.equal(loadKeys(d).zai, REAL2, 'the newer file wins')
  const d2 = dir()
  writeKeys(d2, 'FILL-IN-KEYS.json', { zai: REAL }, 10)
  writeKeys(d2, '.keys.json', { zai: REAL2 }, 0)
  assert.equal(loadKeys(d2).zai, REAL2, '.keys.json wins when it is the newer one')
})

test('resolveUpstreamKey finds the key the placeholder was hiding', () => {
  const d = dir()
  writeKeys(d, '.keys.json', { zai: REAL, qwen: REAL2 }, 10)
  writeKeys(d, 'FILL-IN-KEYS.json', { zai: PLACEHOLDER, qwen: 'PASTE_QWEN_KEY_HERE' }, 0)
  const dshHome = join(d, 'no-such-home')
  assert.equal(resolveUpstreamKey('zai', { repo: d, dshHome }), REAL)
  assert.equal(resolveUpstreamKey('qwen', { repo: d, dshHome }), REAL2)
})

test('resolveUpstreamKey falls back to the DSH credential store', () => {
  const d = dir()
  writeKeys(d, '.keys.json', {}, 0)
  const dshHome = join(d, 'home', '.dsh')
  mkdirSync(dshHome, { recursive: true })
  writeFileSync(join(dshHome, '.credentials.yaml'), 'DEEPSEEK_API_KEY: ' + REAL + '\n')
  assert.equal(resolveUpstreamKey('deepseek', { repo: d, dshHome }), REAL,
    'DeepSeek is not in .keys.json; its key lives in ~/.dsh/.credentials.yaml')
})

test('resolveUpstreamKey returns null rather than a placeholder', () => {
  const d = dir()
  writeKeys(d, 'FILL-IN-KEYS.json', { zai: PLACEHOLDER }, 0)
  assert.equal(resolveUpstreamKey('zai', { repo: d, dshHome: join(d, 'none') }), null,
    'a placeholder must never be handed to a gateway as a key')
})

test('a provider entry that shares an account resolves to that account key', () => {
  // 'anthropic-sonnet' is a second entry for the SAME Anthropic account, so that Sonnet's matrix
  // gets its own dataset directory. Without an alias, resolveUpstreamKey looks for a key named
  // "anthropic-sonnet" - and for an env var ANTHROPIC-SONNET_API_KEY, which is not even a legal
  // name - finds nothing, and returns null. A null key is fatal by design: a gateway with no
  // upstream key 503s every run, which then reads as a harness failure.
  const d = dir()
  writeKeys(d, '.keys.json', { anthropic: REAL }, 5)
  const opts = { repo: d, dshHome: join(d, 'no-such-dsh') }
  assert.equal(resolveUpstreamKey('anthropic', opts), REAL)
  assert.equal(resolveUpstreamKey('anthropic-sonnet', opts), REAL,
    'the Sonnet entry shares the Anthropic account and must resolve to its key')
})

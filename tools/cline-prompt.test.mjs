/**
 * cline-prompt.test.mjs - a prompt must reach cline byte-identical.
 *
 * notes/defects/LIVE-DEFECTS-2026-10-04.md section 3: hard-task prompts contain double quotes, cline is the only
 * harness driven through a .cmd shim, and cmd.exe cannot carry a quote inside a quoted argument.
 * cline answered 'Unknown command or unquoted prompt', exited 1 and made ZERO requests - which is
 * how the hard-suite pilot stopped at preflight.
 *
 * These tests assert the property, not today's output: the command must not go through a shell, and
 * the prompt must be ONE argv element with nothing escaped, doubled or stripped.
 *
 * Run: node --test tools/cline-prompt.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { clineBinJs, clineCommand } from './harnesses.mjs'

// The exact characters that broke it: the quote is from the real edge-cron-parser prompt.
const PROMPT = 'Scheduling has drifted: answered with "no next run" %PATH% & ^caret^ `tick` \'single\''
const ARGS = ['--config', 'C:/x/.cline-config', '-P', 'openai-compatible', '-k', 'exp-cline-r1',
  '-m', 'deepseek-flash', '--json', '--auto-approve', 'true', PROMPT]

test('cline does NOT go through a shell - that is the whole fix', () => {
  const c = clineCommand(ARGS)
  assert.equal(c.shell, false, 'a shell reintroduces cmd.exe quoting, which cannot carry a quote')
  assert.equal(c.cmd, process.execPath, 'the entry is JS, so it runs on the same node as the runner')
})

test('the prompt arrives as one argv element, byte-identical', () => {
  const c = clineCommand(ARGS)
  const hits = c.args.filter((a) => a === PROMPT)
  assert.equal(hits.length, 1, 'the prompt must survive as exactly one argument')
  assert.equal(hits[0], PROMPT, 'no escaping, no doubling, no stripping')
})

test('the prompt is not quoted, doubled or shell-escaped in any form', () => {
  const c = clineCommand(ARGS)
  for (const a of c.args) {
    assert.ok(!a.includes('""'), 'the old path doubled quotes the MSVC way; cmd.exe does not honour it')
    assert.ok(!a.includes('^"'), 'caret-escaping is a cmd.exe workaround, not needed once the shell is gone')
  }
})

test('the pinned JS entry exists, and the command points at it', () => {
  assert.ok(existsSync(clineBinJs()), 'pinned cline entry missing: ' + clineBinJs())
  assert.equal(clineCommand(ARGS).args[0], clineBinJs())
})

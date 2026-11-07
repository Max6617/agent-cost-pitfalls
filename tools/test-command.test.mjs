/**
 * test-command.test.mjs — a repo-relative grader path must survive a temp workdir.
 *
 * tasks-hard/task.json stores `node tasks-hard/_grade/run.mjs <id>`. The runner executes
 * that string with cwd set to a temp copy of fixture/, so the relative path has to be
 * rewritten against the repository before the shell sees it. `node --test` must not be
 * rewritten: that command belongs to the workdir.
 *
 * Run: node --test tools/test-command.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolveTestCommand } from './test-command.mjs'

const repo = join(tmpdir(), 'dsh-exp-testcmd-' + Date.now().toString(36))
mkdirSync(join(repo, 'tasks-hard', '_grade'), { recursive: true })
writeFileSync(join(repo, 'tasks-hard', '_grade', 'run.mjs'), '// grader\n')

test('a repo-relative grader path is rewritten to an absolute path', () => {
  const out = resolveTestCommand('node tasks-hard/_grade/run.mjs edge-cron-parser', repo)
  const abs = join(repo, 'tasks-hard', '_grade', 'run.mjs').split('\\').join('/')
  assert.equal(out, 'node ' + abs + ' edge-cron-parser')
})

test('node --test is left for the workdir', () => {
  assert.equal(resolveTestCommand('node --test', repo), 'node --test')
})

test('an absolute command is left alone', () => {
  const cmd = 'node /tmp/somewhere/run.mjs spec-csv-dialect'
  assert.equal(resolveTestCommand(cmd, repo), cmd)
})

test('a relative script that is not in the repo is left alone', () => {
  const cmd = 'node fixture/grade.js'
  assert.equal(resolveTestCommand(cmd, repo), cmd)
})

test('a path with spaces is quoted', () => {
  const spaced = join(tmpdir(), 'dsh exp space ' + Date.now().toString(36))
  mkdirSync(join(spaced, 'tasks-hard', '_grade'), { recursive: true })
  writeFileSync(join(spaced, 'tasks-hard', '_grade', 'run.mjs'), '// grader\n')
  const out = resolveTestCommand('node tasks-hard/_grade/run.mjs lh-ledger-replay', spaced)
  assert.match(out, /^node "[^"]+" lh-ledger-replay$/)
})

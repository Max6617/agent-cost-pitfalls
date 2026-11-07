/**
 * anthropic-pilot.test.mjs - the Anthropic-native retention pilot's plan and its harness entries.
 *
 * Run: node --test tools/anthropic-pilot.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { RETENTION_PILOT_PLAN, RETENTION_PILOT_SMOKE, RETENTION_PILOT_SMOKE_OPENCODE, RETENTION_PILOT_CONTROL, PILOT_TASKS, PILOT_HARNESSES } from './retention-pilot-plan.mjs'
import { HARNESSES } from './harnesses.mjs'

const STRATA = ['fetch-heavy', 'long-horizon', 'multi-file', 'repo-wide', 'single-step']

test('the plan is 10 tasks x 1 runnable harness x 1 seed = 10 cells', () => {
  // ONE harness, not two: cline's CLI refuses a base URL for its Anthropic provider (measured
  // 2026-10-10), so the filed two-harness design depends on an amendment. See the pre-declaration.
  assert.equal(PILOT_TASKS.length, 10)
  assert.equal(PILOT_HARNESSES.length, 1)
  assert.equal(RETENTION_PILOT_PLAN.tasks, 10)
  assert.equal(RETENTION_PILOT_PLAN.seeds, 1)
  assert.equal(RETENTION_PILOT_PLAN.tasks * RETENTION_PILOT_PLAN.armsList.length * RETENTION_PILOT_PLAN.seeds, 10)
})

test('harness ids carry no dash: the synthetic key splits on the first one', () => {
  for (const id of Object.keys(HARNESSES)) {
    assert.ok(!id.includes('-'), id + ' must not contain a dash, or tools/attribute.mjs re-attributes it')
  }
})

test('the sample is two tasks per stratum and every task exists', () => {
  for (const s of STRATA) {
    const n = PILOT_TASKS.filter((t) => t.startsWith(s + '-')).length
    assert.equal(n, 2, s + ' must contribute exactly two pre-declared tasks')
  }
  assert.equal(new Set(PILOT_TASKS).size, 10, 'no duplicates')
  for (const t of PILOT_TASKS) assert.ok(existsSync('tasks/' + t + '/task.json'), t + ' must exist')
})

test('the pilot harnesses are new, Anthropic-native clones; the study entries are untouched', () => {
  for (const id of PILOT_HARNESSES) {
    assert.ok(HARNESSES[id], id + ' must be declared')
    assert.equal(HARNESSES[id].anthropicNative, true, id + ' must be marked anthropicNative')
    assert.equal(HARNESSES[id].verified, 'unverified', 'nothing is verified until the smoke passes')
  }
  assert.equal(HARNESSES.opencode.anthropicNative, undefined, 'the study opencode entry must not change')
  assert.equal(HARNESSES.cline.anthropicNative, undefined, 'the study cline entry must not change')
  // The study entries keep the OpenAI-compatible provider and the /v1 base.
  assert.ok(HARNESSES.cline.auth.join(' ').includes('-p openai'))
  assert.ok(HARNESSES.cline.auth.join(' ').includes('{baseUrl}/v1'))
  // The pilot cline entry names the native provider and the gateway ROOT.
  // The pilot cline entry is kept ON THE RECORD as blocked: -p anthropic is named, but cline
  // 3.0.65's CLI rejects -b for that provider, so no plan that expects requests may use it.
  assert.ok(HARNESSES.clineanthropic, 'the blocked cline pilot entry stays declared')
  const pilotAuth = HARNESSES.clineanthropic.auth.join(' ')
  assert.ok(pilotAuth.includes('-p anthropic'), 'pilot cline names the anthropic provider')
  assert.ok(/-b \{baseUrl\}$/.test(pilotAuth), 'pilot cline passes the base URL that its CLI rejects')
})

test('smoke and control plans run the cell counts they declare', () => {
  assert.equal(RETENTION_PILOT_SMOKE.tasks * RETENTION_PILOT_SMOKE.armsList.length * RETENTION_PILOT_SMOKE.seeds, 1)
  assert.deepEqual(RETENTION_PILOT_SMOKE.tasksList, ['example-fix'])
  assert.equal(RETENTION_PILOT_CONTROL.tasks * RETENTION_PILOT_CONTROL.armsList.length * RETENTION_PILOT_CONTROL.seeds, 1)
  assert.deepEqual(RETENTION_PILOT_CONTROL.armsList, ['dsh:native'])
  assert.equal(RETENTION_PILOT_SMOKE_OPENCODE.armsList.length, 1, 'the diagnostic smoke runs one harness')
})

test('the collector carries the plan by reference and passes the pre-declared task list', () => {
  const src = readFileSync('tools/collect.mjs', 'utf8')
  assert.match(src, /retentionpilot: RETENTION_PILOT_PLAN/, 'the plan must be wired into PLANS')
  assert.match(src, /plan\.tasksList\) args\.push\('--task-list'/, 'the matrix stage must pass --task-list')
  const runner = readFileSync('tools/run-experiment.mjs', 'utf8')
  assert.match(runner, /--task-list/, 'the runner must accept --task-list')
  assert.match(runner, /anthropicNative \? '@ai-sdk\/anthropic'/, 'the runner must switch the opencode provider')
})

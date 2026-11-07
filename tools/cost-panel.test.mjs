/**
 * cost-panel.test.mjs - the panel's admission rules, which decide what a cell's number IS.
 *
 * Both defects this covers were silent: a cell whose first record was excluded had its surviving
 * record marked `dup`, so the primary-only view dropped the cell; and a record the gateway never
 * logged was skipped BEFORE rule 9 saw it, which made the rule's no-requests clause unreachable.
 * Neither changes a printout, which is why nothing caught them.
 *
 * Run from the repo root: node --test tools/cost-panel.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPanel, recordVerdict, summarise } from './cost-panel.mjs'

const { panel, meta } = buildPanel()

test('rule 9 sees a record with no gateway usage: the no-requests clause is reachable', () => {
  const unsolved = { task: 't', arm: 'goose', seed: 1, solved: false, stdoutTail: '', stderrTail: '' }
  const v = recordVerdict(unsolved, undefined)
  assert.equal(v.excluded, true, 'an unsolved run that reached the provider zero times measured nothing')
  assert.equal(v.cause, 'no-requests')
  assert.equal(v.half, 'status')
})

test('rule 9 keeps its solved-guard on the no-usage path', () => {
  const solved = { task: 't', arm: 'goose', seed: 1, solved: true, stdoutTail: '', stderrTail: '' }
  assert.equal(recordVerdict(solved, undefined).excluded, false, 'a solved run is never excluded for missing usage')
})

test('rule 9 still prefers the text half, then the all-4xx half', () => {
  const unsolved = { task: 't', arm: 'goose', seed: 1, solved: false, stdoutTail: '', stderrTail: '' }
  assert.equal(recordVerdict(unsolved, { requests: [{ status: 400 }, { status: 500 }] }).cause, 'all-requests-failed')
  assert.equal(recordVerdict({ ...unsolved, stderrTail: 'dsh: MALFORMED_RESPONSE: bad tool json' },
    { requests: [{ status: 200 }] }).cause, 'malformed', 'one 200 means the text rule decides, not the status rule')
})

test('every carried cell has exactly one primary row', () => {
  const carried = new Map()
  const primaries = new Map()
  for (const r of panel) {
    const k = r.dataset + '|' + r.cell
    carried.set(k, (carried.get(k) ?? 0) + 1)
    if (r.primary) primaries.set(k, (primaries.get(k) ?? 0) + 1)
  }
  assert.ok(carried.size > 2000, 'the panel must have loaded the four matrices')
  assert.equal(primaries.size, carried.size, 'a carried cell has no primary row at all')
  for (const [k, n] of primaries) assert.equal(n, 1, 'cell ' + k + ' has ' + n + ' primary rows')
})

test('the primary-only view keeps every cell the full view carries', () => {
  const key = (r) => r.model + '|' + r.arm
  const full = new Set(summarise(panel).map(key))
  const prim = new Set(summarise(panel, { primaryOnly: true }).map(key))
  for (const k of full) assert.ok(prim.has(k), 'the primary-only view silently dropped ' + k)
})

test('the qwen infrastructure-failure + retry pair keeps its solving record', () => {
  const rows = panel.filter((r) => r.dataset === 'qwen-full' && r.cell === 'multi-file-feature-flags|dsh:native|2')
  assert.equal(rows.length, 1, 'exactly one record of the pair is carried')
  assert.equal(rows[0].primary, true, 'the carried record must claim the cell, not be marked dup')
  assert.equal(rows[0].solved, true)
  assert.equal(meta['qwen-full'].excluded, 1, 'the malformed run is still excluded by rule 9')
})

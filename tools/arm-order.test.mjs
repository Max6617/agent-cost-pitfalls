/**
 * arm-order.test.mjs - the runner's arm order must depend on the MATRIX, and must not favour an arm.
 *
 * THE DEFECT THIS EXISTS FOR. The seed was `taskName | seed`, so all five tasks-b matrices assigned the
 * identical position to every arm in all 320 blocks. The first test below is the one that would have
 * caught it: with two matrix ids, a given arm must land in a given position about a tenth of the time,
 * not all of the time.
 *
 * Run: node --test tools/arm-order.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { armOrder, orderSeed, counterbalancedFirst, counterbalancedOrder } from './arm-order.mjs'

const ARMS = ['dsh:native', 'dsh:native-opt', 'dsh:native-terse', 'dsh:ptc', 'dsh:ptc-opt', 'dsh:ptc-terse', 'opencode', 'cline', 'openhands', 'goose']
const TASKS = Array.from({ length: 400 }, (_, i) => 'task-' + i)
const positionOf = (order, arm) => order.indexOf(arm)

test('the order is a permutation of the arms, and every arm appears once', () => {
  const o = armOrder(ARMS, 'mA', 'task-1', 1)
  assert.equal(o.length, ARMS.length)
  assert.deepEqual([...o].sort(), [...ARMS].sort())
})

test('the same (matrix, task, seed) always gives the same order - a resume must be reproducible', () => {
  for (const t of ['alpha', 'beta', 'gamma']) {
    assert.deepEqual(armOrder(ARMS, 'mA', t, 2), armOrder(ARMS, 'mA', t, 2))
  }
  assert.equal(orderSeed('mA', 'alpha', 2), orderSeed('mA', 'alpha', 2))
})

test('THE DEFECT: the seed depends on the matrix, not only on (task, seed)', () => {
  let differ = 0
  for (const t of TASKS) if (orderSeed('matrixA', t, 1) !== orderSeed('matrixB', t, 1)) differ++
  assert.ok(differ > TASKS.length * 0.95, 'the matrix must change the stream, got ' + differ + '/' + TASKS.length)
})

test('THE CONSEQUENCE: two matrices place a given arm in the same slot about a tenth of the time', () => {
  const arm = 'dsh:ptc'
  let same = 0
  for (const t of TASKS) {
    if (positionOf(armOrder(ARMS, 'matrixA', t, 1), arm) === positionOf(armOrder(ARMS, 'matrixB', t, 1), arm)) same++
  }
  // Under the old rule this is 400 of 400. Under independence it is ~40, with sd ~6, so 100 is far
  // outside chance while leaving room for a hash that is merely imperfect.
  assert.ok(same < 100, 'the two matrices agree too often: ' + same + '/' + TASKS.length)
  assert.ok(same > 5, 'too few agreements is as suspicious as too many: ' + same)
})

test('no arm is systematically favoured: each occupies each slot about equally', () => {
  const counts = new Map(ARMS.map((a) => [a, new Array(ARMS.length).fill(0)]))
  let blocks = 0
  for (const t of TASKS) {
    for (const seed of [1, 2]) {
      blocks++
      armOrder(ARMS, 'matrixA', t, seed).forEach((a, i) => { counts.get(a)[i]++ })
    }
  }
  const expected = blocks / ARMS.length   // 80 per (arm, slot) at 800 blocks
  let worst = 0
  for (const [, c] of counts) for (const v of c) worst = Math.max(worst, Math.abs(v - expected))
  // sd = sqrt(80 * 0.9) ~ 8.5, so 35 is beyond four standard deviations and still fails loudly if an
  // arm is pinned to a slot the way dsh:ptc was pinned to slot 0 in the pre-loss data (31 of 62).
  assert.ok(worst < 35, 'an arm is pinned to a slot: worst deviation ' + worst + ' against an expectation of ' + expected)
})

test('changing the seed changes the order, so a block is not one frozen permutation', () => {
  let differ = 0
  for (const t of TASKS.slice(0, 200)) {
    const a = armOrder(ARMS, 'matrixA', t, 1).join(',')
    const b = armOrder(ARMS, 'matrixA', t, 2).join(',')
    if (a !== b) differ++
  }
  assert.ok(differ > 190, 'seed 1 and seed 2 must differ, got ' + differ + '/200')
})
// ---- the re-run's counterbalanced two-arm order (notes/plans/RERUN-PLAN.md section 3) -------------------------

const blocksOf = (tasks, seeds) => tasks.flatMap((t) => seeds.map((s) => t + '|' + s))

test('COUNTERBALANCED: exactly half the blocks put the first arm first, for every suite size the re-run uses', () => {
  for (const [nTasks, label] of [[31, 'batch 1'], [40, 'tasks-b'], [1, 'smoke']]) {
    const blocks = blocksOf(Array.from({ length: nTasks }, (_, i) => 't' + i), [1, 2])
    const first = counterbalancedFirst(blocks, 'rerun-b1-deepseek')
    assert.equal(first.size, blocks.length, label + ': every block gets an assignment')
    const zero = [...first.values()].filter((v) => v === 0).length
    assert.equal(zero, blocks.length / 2, label + ': ' + zero + ' of ' + blocks.length + ' blocks put arm 0 first')
  }
})

test('COUNTERBALANCED: deterministic for a matrix (a --resume must reproduce it), independent of input order', () => {
  const blocks = blocksOf(['a', 'b', 'c', 'd'], [1, 2])
  const x = counterbalancedFirst(blocks, 'm1')
  const y = counterbalancedFirst([...blocks].reverse(), 'm1')
  for (const k of blocks) assert.equal(x.get(k), y.get(k), k)
})

test('COUNTERBALANCED: two matrices draw different assignments', () => {
  const blocks = blocksOf(Array.from({ length: 40 }, (_, i) => 't' + i), [1, 2])
  const a = counterbalancedFirst(blocks, 'rerun-b-deepseek')
  const b = counterbalancedFirst(blocks, 'rerun-b-glm-flash')
  const same = blocks.filter((k) => a.get(k) === b.get(k)).length
  assert.ok(same > 20 && same < 60, 'two matrices agree on ' + same + '/80 blocks; independence gives ~40')
})

test('COUNTERBALANCED ORDER: a permutation of exactly two arms, first arm per the assignment', () => {
  assert.deepEqual(counterbalancedOrder(['n', 'p'], 0), ['n', 'p'])
  assert.deepEqual(counterbalancedOrder(['n', 'p'], 1), ['p', 'n'])
  assert.throws(() => counterbalancedOrder(['a', 'b', 'c'], 0), /exactly two arms/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { missingDependencies, depthOf, depths, topological } from '../src/graph.js'
import { planOrder, mustPlan, waves } from '../src/scheduler.js'
import { Runner } from '../src/runner.js'

/** A small graph: `report` needs both extracts, each extract is independent. */
const JOBS = [
  { name: 'report', needs: ['extract-a', 'extract-b'], priority: 9 },
  { name: 'extract-a', needs: ['snapshot'], priority: 2 },
  { name: 'extract-b', needs: ['snapshot'], priority: 1 },
  { name: 'snapshot', priority: 1 },
  { name: 'cleanup', priority: 5 },
]

/** Position of a name in a list, or -1. */
const at = (list, name) => list.indexOf(name)

test('a dependency that names nothing is reported', () => {
  assert.deepEqual(missingDependencies([{ name: 'a', needs: ['ghost'] }]), [{ job: 'a', need: 'ghost' }])
  assert.deepEqual(missingDependencies(JOBS), [])
})

test('depth counts the dependencies underneath a job', () => {
  assert.equal(depthOf('snapshot', JOBS), 0)
  assert.equal(depthOf('extract-a', JOBS), 1)
  assert.equal(depthOf('report', JOBS), 2)
  assert.equal(depthOf('ghost', JOBS), 0)
})

test('depths are reported for every job', () => {
  const map = depths(JOBS)
  assert.equal(map.get('cleanup'), 0)
  assert.equal(map.get('report'), 2)
})

test('the topological order never puts a job before its needs', () => {
  const order = topological(JOBS).map((j) => j.name)
  for (const job of JOBS) {
    for (const need of job.needs ?? []) assert.ok(at(order, need) < at(order, job.name), need + ' before ' + job.name)
  }
})

test('a plan never runs a job before something it needs, whatever the priorities', () => {
  const { plan } = planOrder(JOBS)
  for (const job of JOBS) {
    for (const need of job.needs ?? []) {
      assert.ok(at(plan, need) < at(plan, job.name), need + ' must run before ' + job.name + ' in ' + plan)
    }
  }
})

test('a higher priority is taken first when it is not blocked', () => {
  const { plan } = planOrder(JOBS)
  assert.ok(at(plan, 'cleanup') < at(plan, 'extract-a'), 'cleanup has priority 5 and nothing to wait for')
})

test('a blocked high-priority job still waits', () => {
  const { plan } = planOrder(JOBS)
  assert.ok(at(plan, 'snapshot') < at(plan, 'report'), 'report has the top priority but needs the extracts')
  assert.ok(at(plan, 'extract-a') < at(plan, 'report'))
  assert.ok(at(plan, 'extract-b') < at(plan, 'report'))
})

test('equal priorities keep the order the operator wrote', () => {
  const plan = mustPlan([
    { name: 'first', priority: 0 },
    { name: 'second', priority: 0 },
    { name: 'third', priority: 0 },
  ])
  assert.deepEqual(plan, ['first', 'second', 'third'])
})

test('an independent job with a higher priority jumps the queue', () => {
  const plan = mustPlan([
    { name: 'low', priority: 0 },
    { name: 'high', priority: 10 },
  ])
  assert.deepEqual(plan, ['high', 'low'])
})

test('priority never overrides a dependency, only the order among the ready', () => {
  const plan = mustPlan([
    { name: 'build', needs: ['fetch'], priority: 0 },
    { name: 'fetch', priority: 0 },
    { name: 'unrelated', priority: 100 },
  ])
  assert.ok(at(plan, 'fetch') < at(plan, 'build'))
  assert.equal(plan[0], 'unrelated')
})

test('a dependency in the middle of the list still wins', () => {
  const plan = mustPlan([
    { name: 'c', needs: ['b'], priority: 0 },
    { name: 'b', needs: ['a'], priority: 0 },
    { name: 'a', priority: 0 },
  ])
  assert.deepEqual(plan, ['a', 'b', 'c'])
})

test('a diamond runs the shared dependency once, first', () => {
  const plan = mustPlan([
    { name: 'top', needs: ['left', 'right'] },
    { name: 'left', needs: ['base'] },
    { name: 'right', needs: ['base'] },
    { name: 'base' },
  ])
  assert.equal(plan.filter((n) => n === 'base').length, 1)
  assert.equal(plan[0], 'base')
  assert.equal(plan[3], 'top')
})

test('a plan is stable: the same input gives the same order', () => {
  assert.deepEqual(mustPlan(JOBS), mustPlan(JOBS))
})

test('a cycle is reported rather than ordered', () => {
  const result = planOrder([
    { name: 'a', needs: ['b'] },
    { name: 'b', needs: ['a'] },
  ])
  assert.deepEqual(result.cycle.sort(), ['a', 'b'])
  assert.throws(() => mustPlan([{ name: 'a', needs: ['b'] }, { name: 'b', needs: ['a'] }]), /cycle/)
})

test('an unknown dependency stops the plan instead of being ignored', () => {
  assert.throws(() => mustPlan([{ name: 'a', needs: ['ghost'] }]), /ghost/)
})

test('an empty job list plans to nothing', () => {
  assert.deepEqual(mustPlan([]), [])
})

test('the waves group jobs by depth', () => {
  assert.deepEqual(waves(JOBS), [
    ['cleanup', 'snapshot'],
    ['extract-a', 'extract-b'],
    ['report'],
  ])
})

test('a runner executes the plan in order', () => {
  const seen = []
  const runner = new Runner({ jobs: JOBS, run: (name) => seen.push(name) })
  const result = runner.execute()
  assert.deepEqual(result.executed, mustPlan(JOBS))
  assert.equal(seen.length, JOBS.length)
})

test('a failing job stops the batch where it stands', () => {
  const seen = []
  const runner = new Runner({
    jobs: JOBS,
    run: (name) => {
      seen.push(name)
      if (name === 'extract-b') throw new Error('boom')
    },
  })
  const result = runner.execute()
  assert.equal(result.failed.name, 'extract-b')
  assert.equal(result.executed.includes('report'), false)
  assert.equal(seen.includes('report'), false)
})

test('the runner reports the failure through the logger', () => {
  const events = []
  const runner = new Runner({ jobs: [{ name: 'only' }], run: () => { throw new Error('nope') }, logger: (e) => events.push(e) })
  runner.execute()
  assert.deepEqual(events, [{ event: 'job.failed', name: 'only', message: 'nope' }])
})

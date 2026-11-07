/**
 * dataset-selection.test.mjs - the panel can now be pointed at a second suite, and these are the
 * properties that make that safe to do.
 *
 * WHY THIS EXISTS. tools/cost-panel.mjs pools its datasets BY MODEL. Adding the tasks-b matrices
 * under the same model ids (deepseek-flash, ...) would silently merge a replication suite into the
 * six-model panel and move every filed number - the paper's A2 row for DeepSeek is a pooled mean
 * over every dataset that maps to that model. So selection is explicit, the default is pinned, and
 * a non-default selection may not write to a filed analysis path.
 *
 * Written before the implementation, per the house rule.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import {
  DATASETS, DEFAULT_DATASETS, SUITES, selectDatasets, refuseFiledWrite, filedPaths, buildPanel,
  selectionFromArgv,
} from './cost-panel.mjs'

const FILED_SIX = ['ds-full', 'glm-flash', 'qwen-full', 'haiku-full', 'sonnet-full', 'luna-full']

test('the default population is the batch-1 datasets, in registry order, and nothing else', () => {
  assert.deepEqual(DEFAULT_DATASETS, DATASETS.filter((d) => d.suite === 'batch1').map((d) => d.id))
  assert.equal(DEFAULT_DATASETS.length, 9, 'the nine batch-1 datasets, including the three glm extras')
  for (const id of FILED_SIX) assert.ok(DEFAULT_DATASETS.includes(id), id + ' must stay in the default panel')
  assert.equal(selectDatasets([]).join(','), DEFAULT_DATASETS.join(','), 'no selection means the default')
})

test('no batchb dataset can reach the default panel', () => {
  const byId = new Map(DATASETS.map((d) => [d.id, d]))
  for (const id of SUITES.batchb) {
    assert.ok(byId.has(id), 'registry must carry ' + id)
    assert.equal(byId.get(id).suite, 'batchb')
    assert.ok(!DEFAULT_DATASETS.includes(id),
      id + ' is in the default panel - that would move every filed model-level number')
  }
  assert.deepEqual(selectDatasets(['batchb']), SUITES.batchb)
})

test('selection accepts ids and suite names together, and refuses anything unknown', () => {
  assert.deepEqual(selectDatasets(['ds-full', 'luna-full']), ['ds-full', 'luna-full'])
  assert.deepEqual(selectDatasets(['batchb', 'ds-full']).slice(-1), ['ds-full'])
  assert.throws(() => selectDatasets(['batch-c']), /unknown dataset or suite/)
  assert.throws(() => selectDatasets(['batch-c']), /ds-full/)// the message must list what IS known
})

test('the batchb runs paths are the ones collect.mjs --plan batchb --name-prefix batchb- writes', () => {
  // collect.mjs maps provider -> HISTORICAL_DIR name and prepends --name-prefix:
  //   deepseek->ds-full  zai->glm-flash  qwen->qwen-full  openai->luna-full
  //   anthropic->haiku-full  anthropic-sonnet->sonnet-full
  const want = {
    'batchb-deepseek': 'results/batchb-ds-full/runs.jsonl',
    'batchb-glm-flash': 'results/batchb-glm-flash/runs.jsonl',
    'batchb-qwen': 'results/batchb-qwen-full/runs.jsonl',
    'batchb-luna': 'results/batchb-luna-full/runs.jsonl',
    'batchb-haiku': 'results/batchb-haiku-full/runs.jsonl',
    'batchb-sonnet': 'results/batchb-sonnet-full/runs.jsonl',
  }
  assert.deepEqual(SUITES.batchb.sort(), Object.keys(want).sort(), 'the tasks-b design is 4 cheap + 2 Anthropic')
  for (const [id, p] of Object.entries(want)) {
    const d = DATASETS.find((x) => x.id === id)
    assert.equal(d.runs, p, id + ' must read the matrix the collector writes')
    assert.equal(d.gateways, undefined,
      id + ' must not list gateway filenames: they are DISCOVERED, and a stale name is silent')
  }
})

test('--datasets with no value is an error, never a silent fallback to the default panel', () => {
  assert.deepEqual(selectionFromArgv([]), DEFAULT_DATASETS, 'absent flag -> the default population')
  assert.deepEqual(selectionFromArgv(['--datasets', 'batchb']), SUITES.batchb)
  assert.deepEqual(selectionFromArgv(['--datasets', 'ds-full,luna-full']), ['ds-full', 'luna-full'])
  assert.throws(() => selectionFromArgv(['--datasets']), /needs a value/)
  assert.throws(() => selectionFromArgv(['--datasets', '--json', 'x']), /needs a value/)
  assert.throws(() => selectionFromArgv(['--datasets', '']), /needs a value/)
})

test('a non-default selection may not write to a filed analysis path', () => {
  const filed = filedPaths()
  assert.ok(filed.includes('analysis/panel-analysis.json'), 'the witness must be a filed path')
  const batchb = selectDatasets(['batchb'])
  const dflt = selectDatasets([])
  for (const p of filed) {
    assert.throws(() => refuseFiledWrite(p, batchb, dflt), /refus/, 'batchb -> ' + p + ' must be refused')
  }
  // the default selection may still write its own filed output - that is how they were produced
  for (const p of filed) assert.doesNotThrow(() => refuseFiledWrite(p, dflt, dflt))
  // and a new path is always fine, which is what notes/plans/PLAN.md section 6 prescribes
  assert.doesNotThrow(() => refuseFiledWrite('analysis/panel-analysis-batchb-2026-10-06.json', batchb, dflt))
  assert.doesNotThrow(() => refuseFiledWrite('results/_scratch/tmp/panel.json', batchb, dflt))
})

test('REAL DATA: the default panel is still exactly the shipped six-model population', () => {
  const shipped = JSON.parse(readFileSync('analysis/panel-analysis-6model-2026-10-03.json', 'utf8'))
  const { meta } = buildPanel()
  const ids = Object.keys(meta).sort()
  assert.deepEqual(ids, [...DEFAULT_DATASETS].sort(), 'the default panel must carry every batch-1 dataset')
  for (const id of FILED_SIX) {
    assert.equal(meta[id].rows, shipped.meta[id].rows, id + ': row count must not move')
    assert.equal(meta[id].cells, shipped.meta[id].cells, id + ': cell count must not move')
    assert.equal(meta[id].excluded, shipped.meta[id].excluded, id + ': exclusions must not move')
  }
})

test('REAL DATA: selecting one dataset yields one model, and an uncollected suite says so', () => {
  const { panel, meta } = buildPanel({ datasets: ['ds-full'] })
  assert.deepEqual(Object.keys(meta), ['ds-full'])
  assert.deepEqual([...new Set(panel.map((r) => r.model))], ['deepseek-flash'])
  assert.ok(panel.length > 0, 'ds-full must still produce rows')
  // tasks-b has not been collected, so this is the state every launch will see first. It must read
  // as ABSENT, not as an empty matrix: `missing` is the marker, and it never appears on a dataset
  // that exists, so no shipped meta entry changes shape.
  // THE PROPERTY, NOT THE SNAPSHOT. The first version asserted that every tasks-b dataset is reported
  // missing, which was true only until the first matrix landed - it went red the moment
  // results/batchb-ds-full existed. That was a defect in the test, not in the code. What must hold at
  // any time is: a selected dataset is reported missing exactly when its runs file is absent.
  const b = buildPanel({ datasets: selectDatasets(['batchb']) })
  assert.deepEqual(Object.keys(b.meta).sort(), [...SUITES.batchb].sort())
  for (const id of SUITES.batchb) {
    const d = DATASETS.find((x) => x.id === id)
    assert.equal(b.missing.includes(id), !existsSync(d.runs),
      id + ': missing must track whether ' + d.runs + ' exists')
  }
  for (const id of SUITES.batchb) if (b.missing.includes(id)) assert.equal(b.meta[id].rows, 0, id + ' is missing, so it has no rows')
  // The panel carries ADMITTED rows, which rule 9 can drop below the record count - so the property
  // is not equality with meta.rows but locality: every panel row belongs to a dataset that exists.
  const present = new Set(SUITES.batchb.filter((id) => !b.missing.includes(id)))
  for (const row of b.panel) assert.ok(present.has(row.dataset),
    'a panel row from ' + row.dataset + ' exists even though its runs file is absent')
  assert.ok(b.panel.length <= SUITES.batchb.reduce((n, id) => n + b.meta[id].rows, 0))
  // The marker lives beside meta, never inside it: the shipped datasets' meta entries must keep the
  // exact shape a regeneration has always produced.
  const shipped = buildPanel()
  for (const id of DEFAULT_DATASETS) assert.equal('missing' in shipped.meta[id], false, id + ': meta shape must not change')
  assert.deepEqual(shipped.missing, ['glm-terse', 'glm-harness', 'glm53'],
    'the three collapsed glm shards have no runs.jsonl and are the only batch-1 datasets absent on disk')
})

test('an unknown dataset id passed to buildPanel is an error, never an empty panel', () => {
  assert.throws(() => buildPanel({ datasets: ['nope'] }), /unknown dataset/)
})
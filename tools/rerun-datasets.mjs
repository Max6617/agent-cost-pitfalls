/**
 * rerun-datasets.mjs - the re-run's matrices as datasets, registered AT RUN TIME.
 *
 * The study's registry (tools/cost-panel.mjs DATASETS) pools datasets by model, so adding these under
 * the batch-1 model ids would merge them into the filed six-model panel and move every filed number.
 * Like the A/A passes (tools/aa-analysis.mjs registerPasses), they are added only by the tools that
 * analyse the re-run, under their own suites, and never enter the default population.
 *
 * Paths are what `collect.mjs --plan <plan> --providers <p> --name-prefix <plan>-` writes
 * (tools/rerun-plans.mjs): --name-prefix + the historical provider directory.
 */
import { DATASETS, SUITES } from './cost-panel.mjs'

const DIR = { 'deepseek-flash': 'ds-full', 'glm-5.3-flash': 'glm-flash', 'qwen3.8-flash': 'qwen-full', 'gpt-6-luna': 'luna-full', 'claude-haiku-4.5': 'haiku-full' }
const SHORT = { 'deepseek-flash': 'deepseek', 'glm-5.3-flash': 'glm-flash', 'qwen3.8-flash': 'qwen', 'gpt-6-luna': 'luna', 'claude-haiku-4.5': 'haiku' }
const CHEAP = ['deepseek-flash', 'glm-5.3-flash', 'qwen3.8-flash', 'gpt-6-luna']

const entry = (suite, model, note) => ({
  id: suite + '-' + SHORT[model], suite, model, runs: 'results/' + suite + '-' + DIR[model] + '/runs.jsonl', note,
})

export const RERUN_DATASETS = [
  ...CHEAP.map((m) => entry('rerun-b1', m, 'randomised-order re-run, batch 1, 31 x 2 x 2')),
  entry('rerun-b1', 'claude-haiku-4.5', 'randomised-order re-run, batch 1, 31 x 2 x 2 (block C)'),
  ...CHEAP.map((m) => entry('rerun-b', m, 'randomised-order re-run, tasks-b, 40 x 2 x 2')),
  entry('rerun-aa', 'deepseek-flash', 'interleaved A/A, 31 x native and twin x 2'),
]

/** The filed suite each re-run suite repeats, for the comparison. */
export const ORIGINAL_SUITE = { 'rerun-b1': 'batch1', 'rerun-b': 'batchb' }

/** Idempotent: registers each dataset and suite once. Returns the suite -> ids map it added. */
export function registerRerun () {
  for (const d of RERUN_DATASETS) if (!DATASETS.some((x) => x.id === d.id)) DATASETS.push({ ...d })
  for (const suite of ['rerun-b1', 'rerun-b', 'rerun-aa']) {
    SUITES[suite] = RERUN_DATASETS.filter((d) => d.suite === suite).map((d) => d.id)
  }
  return Object.fromEntries(['rerun-b1', 'rerun-b', 'rerun-aa'].map((s) => [s, SUITES[s]]))
}

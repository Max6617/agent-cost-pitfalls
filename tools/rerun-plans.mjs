/**
 * rerun-plans.mjs - the randomised-order re-run's plans (notes/plans/RERUN-PLAN.md), as data, so the cell
 * arithmetic and the arm lists can be tested rather than read off a command line.
 *
 * Every plan runs DSH only (`harnesses: ['dsh']`), so preflight does not spend on the four external
 * harnesses the re-run does not use. The contrast plans run exactly the paper's central pair,
 * counterbalanced; the A/A plan runs one arm twice inside one matrix, interleaved (tools/run-plan.mjs).
 *
 * Output directories follow collect.mjs's rule, --name-prefix + the historical provider directory:
 *
 *   node tools/collect.mjs --plan rerun-b1 --providers deepseek --name-prefix rerun-b1-   -> results/rerun-b1-ds-full
 *   node tools/collect.mjs --plan rerun-b  --providers zai      --name-prefix rerun-b-    -> results/rerun-b-glm-flash
 *   node tools/collect.mjs --plan rerun-aa --providers deepseek --name-prefix rerun-aa-   -> results/rerun-aa-ds-full
 *
 * and tools/rerun-datasets.mjs registers exactly those paths for the analysis.
 */
export const RERUN_ARMS = ['dsh:native', 'dsh:ptc']

export const RERUN_PLANS = {
  'rerun-b1': {
    label: 'randomised-order re-run, batch 1 (notes/plans/RERUN-PLAN.md)',
    tasksDir: 'tasks', tasks: 31, seeds: 2,
    armsList: RERUN_ARMS, counterbalance: true, harnesses: ['dsh'],
    note: '31 tasks x 2 arms (dsh:native, dsh:ptc) x 2 seeds = 124 cells, order counterbalanced per matrix',
    // The filed DSH-only cost per cell, where the collector's generic per-run figure is wrong for this
    // plan. Anthropic's generic figure is the Haiku+Sonnet mean over all five harnesses ($0.362/run),
    // so block C read $44.89 against its filed $18.84 and the $31 ceiling refused it. Haiku's DSH
    // native and PTC cells cost $0.119707 and $0.184156 (analysis/quality-guard-2026-10-10.json).
    costPerCell: { anthropic: (0.119707 + 0.184156) / 2 },
  },
  'rerun-b': {
    label: 'randomised-order re-run, tasks-b (notes/plans/RERUN-PLAN.md)',
    tasksDir: 'tasks-b', tasks: 40, seeds: 2,
    armsList: RERUN_ARMS, counterbalance: true, harnesses: ['dsh'],
    note: '40 tasks x 2 arms (dsh:native, dsh:ptc) x 2 seeds = 160 cells, order counterbalanced per matrix',
  },
  'rerun-aa': {
    label: 'interleaved A/A (notes/plans/RERUN-PLAN.md block B)',
    tasksDir: 'tasks', tasks: 31, seeds: 2,
    armsList: ['dsh:native'], twin: true, counterbalance: true, aaWorkdir: true, harnesses: ['dsh'],
    note: '31 tasks x dsh:native and its identical twin x 2 seeds = 124 cells, interleaved, which copy leads counterbalanced',
  },
  // The smoke for each plan: one task, both seeds, so both lead assignments occur. Pennies.
  'rerun-smoke': {
    label: 'randomised-order re-run smoke',
    tasksDir: 'tasks', tasks: 1, seeds: 2, only: 'example-fix',
    armsList: RERUN_ARMS, counterbalance: true, harnesses: ['dsh'],
    note: '1 task x 2 arms x 2 seeds = 4 cells; records land, cost is non-zero, each arm leads once',
  },
  'rerun-aa-smoke': {
    label: 'interleaved A/A smoke',
    tasksDir: 'tasks', tasks: 1, seeds: 2, only: 'example-fix',
    armsList: ['dsh:native'], twin: true, counterbalance: true, aaWorkdir: true, harnesses: ['dsh'],
    note: '1 task x dsh:native and its twin x 2 seeds = 4 cells; the byte-identity check before the full run',
  },
}

/** Cells = tasks x arms (twice for a twin plan) x seeds. One rule, so ceiling, runner and verify agree. */
export function rerunCells (plan) {
  return plan.tasks * plan.armsList.length * (plan.twin ? 2 : 1) * plan.seeds
}

/** The per-cell estimate for a provider: the plan's filed DSH figure if it has one, else the generic. */
export function rerunCostPerCell (plan, provider, generic) {
  return plan.costPerCell?.[provider] ?? generic
}

/** The flags collect.mjs forwards to tools/run-experiment.mjs for a re-run plan. */
export function rerunRunnerFlags (plan) {
  const f = []
  if (plan.counterbalance) f.push('--counterbalance')
  if (plan.twin) f.push('--aa-twin')
  return f
}

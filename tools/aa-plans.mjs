/**
 * aa-plans.mjs - the corrected A/A placebo: its plan, its cell arithmetic, its workdir rule.
 *
 * WHY THIS EXISTS. Limitation 9 records that the study has no measured noise floor. The run it
 * used to call a placebo compared two arms whose prompts differed by the arm-id string - 30 and 20
 * bytes, one copy inside the working-directory path the model sees (DEFECT-position-confound
 * 2026-10-04 section 3; REVIEW-3 section 4.18) - so it was not a control. The correct measurement
 * is a REPEATED BASELINE: the same arm, same tasks, same seeds, collected twice. Treatment
 * identity is then true by construction, and the only thing that differs between the passes is
 * the time at which they ran and the run's unique id.
 *
 * THE RULE THIS MODULE OWNS. A run id may stay unique (it is the record's key and it is how the
 * gateway attributes usage), but WHAT THE MODEL SEES must be identical. In normal mode the runner
 * builds the workdir as tmpdir/dsh-exp-<runId>-<random6>, and runId contains the arm id and the
 * matrix id; the harness reports that path to the model. In AA mode the workdir is a deterministic
 * function of (harness, task, seed) alone - no arm id, no matrix id, no random suffix - so both
 * passes see the same string. The module stays inside tmpdir and keeps the dsh-exp- prefix so
 * tools/safe-fs.mjs (the only module allowed to delete anything) may still clean it.
 */
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** The one arm under test. The A/A comparison is between PASSES, not between arms. */
export const AA_ARM = 'dsh:native'

export const AA_PLANS = {
  aaplacebo: {
    label: 'A/A placebo (repeated baseline)',
    tasksDir: 'tasks', tasks: 31, seeds: 2, passes: 2,
    armsList: [AA_ARM],
    aaWorkdir: true,
    note: '31 tasks x 1 arm x 2 seeds x 2 passes = 124 cells, DeepSeek only; the passes differ only in time',
  },
  'aaplacebo-smoke': {
    label: 'A/A placebo smoke (one task, both passes)',
    tasksDir: 'tasks', tasks: 1, seeds: 2, passes: 2,
    armsList: [AA_ARM],
    aaWorkdir: true,
    only: 'example-fix',
    note: '1 task x 1 arm x 2 seeds x 2 passes = 4 cells; the byte-identity gate before the full run',
  },
}

/** Cells = tasks x arms x seeds x passes. One rule, so the ceiling and the verify agree. */
export function aaCells (plan) {
  return plan.tasks * (plan.armsList ? plan.armsList.length : 0) * plan.seeds * (plan.passes ?? 1)
}

/**
 * The workdir string an AA-mode run uses, deterministic in (harness, task, seed).
 * Same inputs -> same string; different task or seed -> different string.
 */
export function aaWorkdir ({ harness, task, seed, tmp = tmpdir() }) {
  return join(tmp, 'dsh-exp-aa-' + harness + '-' + task + '-s' + seed)
}

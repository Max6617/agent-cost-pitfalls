/**
 * retention-pilot-plan.mjs - the external-harness retention pilot's plan, as data.
 *
 * WHY THIS IS A MODULE. The collector's PLANS live inside a CLI script that runs on import, so a
 * plan defined there cannot be tested. This one is data, and tools/anthropic-pilot.test.mjs pins
 * its arithmetic and its pre-declared sample (notes/records/RETENTION-PILOT-2026-10-10.md).
 *
 * WHAT IT IS. Route (b) of notes/plans/RETENTION-PILOT-SCOPE.md: the same installed opencode and cline binaries
 * pointed at the study gateway's NATIVE /v1/messages path, where tools/measure-gateway.mjs injects
 * cache_control and logs the cache split. The harness ids are pilot-only clones
 * (tools/harnesses.mjs, anthropicNative: true); nothing about the study's OpenAI-compatible
 * configuration changes. The wire protocol differs from the matrices, and the pre-declaration says
 * so: this measures retention when the harness is GIVEN declared caching.
 */

/** Two per stratum, chosen alphabetically before the first request. */
export const PILOT_TASKS = [
  'fetch-heavy-content-negotiation', 'fetch-heavy-duration-parse',
  'long-horizon-billing-tiers', 'long-horizon-job-ordering',
  'multi-file-cache-invalidation', 'multi-file-config-precedence',
  'repo-wide-config-defaults-sweep', 'repo-wide-error-type-migration',
  'single-step-csv-quoting', 'single-step-date-month-end',
]

// Flat ids, no dashes: the synthetic key is exp-<harness>-<runId> and tools/attribute.mjs splits it
// on the first dash, so a dashed id re-attributes requests to the study's plain opencode harness.
export const PILOT_HARNESSES = ['opencodeanthropic']

/**
 * The smoke: the same two harnesses on ONE task, as its own plan so the planned cell count equals
 * what actually runs (the verify stage compares the two). example-fix is the study's cheapest task.
 */
export const RETENTION_PILOT_SMOKE = {
  label: 'retention pilot smoke (one task, both harnesses)',
  tasksDir: 'tasks', tasks: 1, seeds: 1,
  armsList: PILOT_HARNESSES,
  harnesses: PILOT_HARNESSES,
  tasksList: ['example-fix'],
  note: '1 task x 2 Anthropic-native harnesses x 1 seed = 2 cells; the cache-split gate before the matrix',
}

/**
 * One-harness diagnostic smoke. It exists because cline turned out to be unconfigurable on this
 * build (its CLI refuses a base URL for the Anthropic provider), and the opencode base-URL bug had
 * to be re-tested without paying for a second harness. It is NOT the pre-declared matrix: an
 * amendment decides the final design.
 */
export const RETENTION_PILOT_SMOKE_OPENCODE = {
  label: 'retention pilot smoke (opencode-anthropic only)',
  tasksDir: 'tasks', tasks: 1, seeds: 1,
  armsList: ['opencodeanthropic'],
  harnesses: ['opencodeanthropic'],
  tasksList: ['example-fix'],
  note: '1 task x opencode-anthropic x 1 seed = 1 cell; diagnostic re-test of the /v1 base URL',
}

/**
 * The control: the study's own dsh:native arm on the same task and model through the same gateway.
 * Its retention is the acceptance gate (the DSH field is 0.994-1.000); if the new org's cache
 * semantics differ, this shows it BEFORE the matrix is paid for.
 */
export const RETENTION_PILOT_CONTROL = {
  label: 'retention pilot control (dsh:native, one task)',
  tasksDir: 'tasks', tasks: 1, seeds: 1,
  armsList: ['dsh:native'],
  harnesses: ['dsh'],
  tasksList: ['example-fix'],
  note: '1 task x dsh:native x 1 seed = 1 cell; retention must be ~0.99 or the pilot stops',
}

export const RETENTION_PILOT_PLAN = {
  label: 'external-harness retention pilot (Anthropic-native)',
  tasksDir: 'tasks', tasks: PILOT_TASKS.length, seeds: 1,
  armsList: PILOT_HARNESSES,
  harnesses: PILOT_HARNESSES,
  tasksList: PILOT_TASKS,
  note: PILOT_TASKS.length + ' pre-declared tasks x ' + PILOT_HARNESSES.length +
    ' Anthropic-native harnesses x 1 seed = ' + (PILOT_TASKS.length * PILOT_HARNESSES.length) +
    ' cells, haiku (claude-haiku-4.5), --native-messages --auto-cache; cap $25',
}

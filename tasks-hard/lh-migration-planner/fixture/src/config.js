/**
 * Planner configuration.
 *
 * The tunables live in config/planner.config.json so that the release process
 * can move the lock budget without a code change. They are read from this
 * checkout - never from the current working directory - so the planner behaves
 * the same from the CLI, from the release job and from a test.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

/** This checkout: src/ sits directly inside it. */
export const repoRoot = resolve(here, '..')

/** The values the release process agreed on, before the file is read. */
export const DEFAULT_CONFIG = Object.freeze({
  overheadMs: 250,
  tableSetupMs: 1500,
  batchOverheadMs: 10,
  batchLockMs: 40,
  lockBudgetMs: 2000,
  rowsPerSecond: 20000,
  defaultBatchSize: 5000,
})

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/** `DEFAULT_CONFIG` overlaid with whatever the checkout's config file says. */
export function loadConfig() {
  return { ...DEFAULT_CONFIG, ...readJson(join(repoRoot, 'config', 'planner.config.json')) }
}

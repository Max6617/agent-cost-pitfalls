/**
 * Configuration and data loading.
 *
 * Paths are resolved against the checkout the module lives in, not the process
 * working directory: the close job runs from a container root and the importer
 * runs from wherever the operator happened to be.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const repoRoot = join(here, '..')

export function readJson(relativePath) {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8'))
}

export function loadConfig() {
  const config = readJson('config/ledger.config.json')
  return {
    ...config,
    accounts: readJson(config.paths.accounts),
    rateTable: readJson(config.paths.rates),
  }
}

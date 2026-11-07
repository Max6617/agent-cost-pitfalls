/**
 * Configuration loading.
 *
 * Paths are resolved against the checkout the module lives in, not the
 * process working directory: the gateway runs from a container root and the
 * reconciler runs from wherever the operator happened to be.
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
  return readJson('config/quota.config.json')
}

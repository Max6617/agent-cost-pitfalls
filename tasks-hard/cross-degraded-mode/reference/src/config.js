/**
 * Configuration and route definitions.
 *
 * Paths resolve against the checkout this module lives in, not the process
 * working directory: the service runs from a container root and the operator's
 * shell may be anywhere.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const repoRoot = join(here, '..')

export function readJson(relativePath) {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8'))
}

/** The dependency registry, the breaker tuning and the route table. */
export function loadConfig() {
  return readJson('config/service.config.json')
}

/** The steps of one route, in the order they must run. */
export function routeSteps(config, route) {
  return config.routes?.[route]?.steps ?? []
}

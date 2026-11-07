/**
 * Configuration and the seeded data files.
 *
 * The service is configured from `config/service.json` and seeded from
 * `data/records.json`. Both are read from this checkout, so a test that wants a
 * different world passes an override instead of editing files.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

export function repoRoot() {
  return resolve(here, '..')
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function loadConfig(root = repoRoot()) {
  const file = readJson(join(root, 'config', 'service.json'))
  const records = readJson(join(root, 'data', 'records.json'))
  return {
    ...file,
    records: records.records,
  }
}

/** A clock that never reads the system time. Time is injected, always. */
export function createFixedClock(start = 1_000, step = 1) {
  let ticks = 0
  return {
    now() {
      ticks += 1
      return start + (ticks - 1) * step
    },
    get ticks() {
      return ticks
    },
  }
}

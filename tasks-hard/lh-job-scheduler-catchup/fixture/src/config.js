/**
 * Configuration and data files.
 *
 * Paths are resolved from this module, never from the working directory, so the
 * scheduler behaves the same whether it is run from the checkout, from a
 * released copy, or from a harness that staged it somewhere else.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOffsetTable } from './offsets.js'

export function repoRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..')
}

export function readJson(relativePath) {
  return JSON.parse(readFileSync(join(repoRoot(), relativePath), 'utf8'))
}

export function loadConfig(overrides = {}) {
  return { ...readJson('config/scheduler.config.json'), ...overrides }
}

export function loadOffsets() {
  return createOffsetTable(readJson('data/offsets.json'))
}

export function loadJobs() {
  const data = readJson('data/jobs.json')
  return (data.jobs ?? []).map((job) => ({ ...job }))
}

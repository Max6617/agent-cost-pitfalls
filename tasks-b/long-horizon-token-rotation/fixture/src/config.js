/**
 * config - policy loading.
 *
 * Paths resolve against the checkout the module lives in, not the process
 * working directory: the gateway and the tests both run from elsewhere.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

export function loadPolicy() {
  const raw = JSON.parse(readFileSync(join(here, '..', 'config', 'auth.config.json'), 'utf8'))
  return {
    absoluteTtlMs: Number(raw.absoluteTtlMs),
    idleTtlMs: Number(raw.idleTtlMs),
    accessTtlMs: Number(raw.accessTtlMs),
  }
}

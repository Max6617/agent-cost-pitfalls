import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DEFAULTS = JSON.parse(readFileSync(join(here, '..', 'config', 'gateway.config.json'), 'utf8'))

/**
 * Config is a plain object; anything the caller passes wins over the checkout's
 * config/gateway.config.json, which wins over the compiled-in defaults.
 */
export function resolveConfig(overrides = {}) {
  const cfg = {
    ...DEFAULTS,
    ...overrides,
    retry: { ...DEFAULTS.retry, ...(overrides.retry ?? {}) },
    cache: { ...DEFAULTS.cache, ...(overrides.cache ?? {}) },
  }
  if (!Number.isFinite(cfg.timeoutMs) || cfg.timeoutMs <= 0) throw new Error('timeoutMs must be positive')
  return cfg
}

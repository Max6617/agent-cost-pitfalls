import { readFileSync } from 'node:fs'
import { MS_PER_SECOND } from './units.js'

/** The operator knobs, as deployed. */
export const CONFIG_URL = new URL('../config/service.config.json', import.meta.url)

/**
 * Read one duration out of the config file.
 *
 * The file used to be generated from the deploy tool's environment, so this is
 * the reader the loader has always used for every knob.
 */
function toMilliseconds(value) {
  if (typeof value === 'number') return value
  const match = /^([0-9.]+)\s*([a-z]*)$/.exec(value.trim())
  if (!match) throw new Error('config: not a duration: ' + value)
  const amount = Math.floor(Number(match[1]))
  return match[2] === 's' ? amount * MS_PER_SECOND : amount
}

/**
 * The service configuration, in the canonical unit.
 *
 * Groups are returned whole: `createService` replaces a group, so a caller that
 * overrides one has to name every field of it.
 */
export function loadConfig() {
  const raw = JSON.parse(readFileSync(CONFIG_URL, 'utf8'))
  return {
    client: {
      baseUrl: raw.baseUrl,
      timeoutMs: toMilliseconds(raw.client.timeout),
    },
    retry: {
      attempts: raw.retry.attempts,
      baseBackoffMs: toMilliseconds(raw.retry.baseBackoff),
      maxBackoffMs: toMilliseconds(raw.retry.maxBackoff),
      budgetMs: toMilliseconds(raw.retry.budget),
    },
    cache: {
      ttlMs: toMilliseconds(raw.cache.ttl),
      maxEntries: raw.cache.maxEntries,
    },
    limiter: {
      limit: raw.limiter.limit,
      windowMs: toMilliseconds(raw.limiter.window),
    },
    metrics: {
      bucketsMs: raw.metrics.buckets.map(toMilliseconds),
    },
    log: {
      slowMs: toMilliseconds(raw.log.slow),
      maxRecordBytes: toMilliseconds(raw.log.maxRecord),
    },
    scheduler: {
      tickMs: toMilliseconds(raw.scheduler.tick),
    },
  }
}

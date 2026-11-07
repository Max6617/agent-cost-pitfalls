import { readFileSync } from 'node:fs'
import { parseDuration, parseSize } from './units.js'

/** The operator knobs, as deployed. */
export const CONFIG_URL = new URL('../config/service.config.json', import.meta.url)

/**
 * The service configuration, in the canonical unit.
 *
 * The file is written by humans, so every duration and every size in it is read
 * by the unit module and nothing else: this is the inbound boundary, and it is
 * the only place in the service where text becomes a number.
 *
 * Groups are returned whole: `createService` replaces a group, so a caller that
 * overrides one has to name every field of it.
 */
export function loadConfig() {
  const raw = JSON.parse(readFileSync(CONFIG_URL, 'utf8'))
  return {
    client: {
      baseUrl: raw.baseUrl,
      timeoutMs: parseDuration(raw.client.timeout),
    },
    retry: {
      attempts: raw.retry.attempts,
      baseBackoffMs: parseDuration(raw.retry.baseBackoff),
      maxBackoffMs: parseDuration(raw.retry.maxBackoff),
      budgetMs: parseDuration(raw.retry.budget),
    },
    cache: {
      ttlMs: parseDuration(raw.cache.ttl),
      maxEntries: raw.cache.maxEntries,
    },
    limiter: {
      limit: raw.limiter.limit,
      windowMs: parseDuration(raw.limiter.window),
    },
    metrics: {
      bucketsMs: raw.metrics.buckets.map((bucket) => parseDuration(bucket)),
    },
    log: {
      slowMs: parseDuration(raw.log.slow),
      maxRecordBytes: parseSize(raw.log.maxRecord),
    },
    scheduler: {
      tickMs: parseDuration(raw.scheduler.tick),
    },
  }
}

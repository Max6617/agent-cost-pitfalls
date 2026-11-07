import { loadConfig } from './config.js'
import { HttpClient } from './http-client.js'
import { RetryPolicy } from './retry.js'
import { Cache } from './cache.js'
import { RateLimiter } from './ratelimit.js'
import { Histogram } from './metrics.js'
import { LogWriter } from './log.js'
import { Scheduler } from './scheduler.js'

/** Wire one planner around one configuration. */
function wire(config) {
  return {
    config,
    client: new HttpClient(config.client),
    retry: new RetryPolicy(config.retry),
    cache: new Cache(config.cache),
    limiter: new RateLimiter(config.limiter),
    metrics: new Histogram(config.metrics),
    log: new LogWriter(config.log),
    scheduler: new Scheduler(config.scheduler),
  }
}

let planner = null

/**
 * The planner this checkout is configured for.
 *
 * Wiring the stack is the expensive part of startup and the configuration does
 * not change while the process runs, so the default planner is built once and
 * handed out again.
 *
 * `overrides` replaces configuration *groups*, not fields: pass
 * `{ cache: { ttlMs: 1000, maxEntries: 8 } }` to work against a different cache.
 * Every value in an override is already canonical.
 */
export function createService(overrides = {}) {
  if (Object.keys(overrides).length === 0) {
    planner ??= wire(loadConfig())
    return planner
  }
  return wire({ ...loadConfig(), ...overrides })
}

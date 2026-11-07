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

/**
 * A planner for this checkout's configuration file.
 *
 * Every call builds a new one: the configuration is read again and the planner
 * owns its own cache, limiter, histogram, log writer and scheduler, so nothing
 * one planner has done can change what the next one is built from.
 *
 * `overrides` replaces configuration *groups*, not fields: pass
 * `{ cache: { ttlMs: 1000, maxEntries: 8 } }` to work against a different cache.
 * Every value in an override is already canonical.
 */
export function createService(overrides = {}) {
  return wire({ ...loadConfig(), ...overrides })
}

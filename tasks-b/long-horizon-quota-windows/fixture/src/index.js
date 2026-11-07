/**
 * quota — public surface.
 *
 * Everything the gateway, the reconciler and the report builders are allowed
 * to import. Modules under src/ that are not re-exported here are internal
 * and may be reorganised freely; the names below may not.
 */
import { loadConfig } from './config.js'
import { QuotaService } from './service.js'

export { QuotaService } from './service.js'
export { normalizeEvent } from './events.js'
export { EventLog, compareEvents } from './log.js'
export { DailyWindow } from './windows/daily.js'
export { HourWindow } from './windows/hourly.js'
export { advanceWindows } from './rollover.js'
export { buildUsage } from './report.js'
export { DAY, HOUR, dayOf, bucketOf } from './util/time.js'
export { loadConfig, readJson, repoRoot } from './config.js'

/**
 * A quota service wired to this checkout's configuration.
 *
 * `overrides` exists for the reconciler's what-if runs and for tests: pass
 * `{ dailyLimit: 5 }` to work against a hypothetical allowance.
 */
export function createQuotaService(overrides = {}) {
  const config = loadConfig()
  return new QuotaService({
    dailyLimit: overrides.dailyLimit ?? config.dailyLimit,
    hourlyLimit: overrides.hourlyLimit ?? config.hourlyLimit,
    borrowLimit: overrides.borrowLimit ?? config.borrowLimit,
  })
}

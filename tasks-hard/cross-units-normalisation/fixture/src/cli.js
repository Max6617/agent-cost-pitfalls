import { formatDuration, formatSize } from './units.js'

/**
 * The operator report.
 *
 * One line per knob, in a fixed order, so that two releases can be diffed. Every
 * duration and every size is written by the unit module — the report is a
 * boundary, not a place to do arithmetic.
 */
export function renderReport(service) {
  const { client, retry, cache, limiter, metrics, log, scheduler } = service
  return [
    'client.timeout: ' + formatDuration(client.timeoutMs),
    'retry.attempts: ' + retry.attempts,
    'retry.budget: ' + formatDuration(retry.budgetMs),
    'cache.ttl: ' + formatDuration(cache.ttlMs),
    'cache.ttlSeconds: ' + cache.stats().ttlSeconds,
    'limiter.window: ' + formatDuration(limiter.windowMs),
    'metrics.buckets: ' + metrics.bucketsMs.map(formatDuration).join(', '),
    'log.slow: ' + formatDuration(log.slowMs),
    'log.slowSeconds: ' + log.stats().slowSeconds,
    'log.maxRecord: ' + formatSize(log.maxRecordBytes),
    'scheduler.tick: ' + formatDuration(scheduler.tickMs),
  ].join('\n')
}

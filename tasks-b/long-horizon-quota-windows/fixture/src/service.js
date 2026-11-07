/**
 * The quota service.
 *
 * Everything the service answers — admission decisions, per-key usage, the
 * canonical log — is derived by replaying the key's log in canonical order.
 * That is slower than keeping running counters, and it is the whole point: a
 * derivation that depends on how events happened to arrive is a derivation
 * that disagrees with itself after a late delivery.
 *
 * Admission itself is docs/quota-rules.md section 5: both windows must allow
 * the request, the daily window is consulted first, and a rejected request
 * consumes nothing in either window.
 */
import { normalizeEvent } from './events.js'
import { EventLog } from './log.js'
import { DailyWindow } from './windows/daily.js'
import { HourWindow } from './windows/hourly.js'
import { advanceWindows } from './rollover.js'
import { buildUsage } from './report.js'

export class QuotaService {
  constructor({ dailyLimit, hourlyLimit, borrowLimit } = {}) {
    this.dailyLimit = dailyLimit
    this.hourlyLimit = hourlyLimit
    this.borrowLimit = borrowLimit
    this.logs = new Map()
    this.views = new Map()
  }

  /** Ingest one event. Returns `{ id, status }`, plus `reason` when rejected. */
  admit(raw) {
    const event = normalizeEvent(raw)
    if (!this.logs.has(event.key)) this.logs.set(event.key, new EventLog())
    this.logs.get(event.key).append(event)
    const view = this.derive(event.key)
    const result = { id: event.id, status: view.statuses.get(event.id) }
    if (result.status === 'rejected') result.reason = view.reasons.get(event.id)
    return result
  }

  /** Ingest many events, in the order given. Returns one result per event. */
  admitAll(raws) {
    return (raws ?? []).map((raw) => this.admit(raw))
  }

  /** The status of an event, as the canonical replay currently decides it. */
  statusOf(id) {
    for (const key of this.logs.keys()) {
      const view = this.viewOf(key)
      if (view.statuses.has(id)) return view.statuses.get(id)
    }
    return null
  }

  /** The section 7 usage report for a key, as the stream stands now. */
  usage(key) {
    return this.viewOf(key).report
  }

  /** The key's events in canonical order. */
  log(key) {
    return this.viewOf(key).events.map((event) => ({ ...event }))
  }

  viewOf(key) {
    return this.views.get(key) ?? this.derive(key)
  }

  /** Replay the key's whole log and recompute everything derived from it. */
  derive(key) {
    const log = this.logs.get(key)
    const events = log ? log.canonical() : []
    const daily = new DailyWindow({ limit: this.dailyLimit, borrowLimit: this.borrowLimit })
    const hourly = new HourWindow()
    const statuses = new Map()
    const reasons = new Map()
    let admitted = 0
    let rejected = 0
    let lastAt = null

    for (const event of events) {
      advanceWindows(daily, hourly, event.at)
      let reason = null
      if (!daily.check(event.cost).ok) {
        reason = 'daily-limit'
      } else if (hourly.used(event.at) + event.cost > this.hourlyLimit) {
        reason = 'hourly-limit'
      }
      if (reason === null) {
        daily.commit(event.cost)
        hourly.record(event.at, event.cost)
        admitted += 1
        statuses.set(event.id, 'admitted')
      } else {
        rejected += 1
        statuses.set(event.id, 'rejected')
        reasons.set(event.id, reason)
      }
      lastAt = event.at
    }

    const view = {
      events,
      statuses,
      reasons,
      report: buildUsage({
        key,
        dailyLimit: this.dailyLimit,
        daily,
        hourly,
        lastAt,
        admitted,
        rejected,
      }),
    }
    this.views.set(key, view)
    return view
  }
}

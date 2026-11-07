/**
 * Trial periods. A trial is { start, lengthDays }: it runs for `lengthDays`
 * days from `start`, so the account rolls onto paid on day
 * `start + lengthDays`, which is handed back as `endsOn`.
 */
import { contains, duration } from './intervals.js'

/** The day the trial ends and paid service begins. */
export function trialEnd(trial) {
  return trial.start + trial.lengthDays
}

/**
 * Where the trial stands on `today`:
 *   active   - the trial covers today
 *   daysLeft - covered days remaining, today included; before the trial
 *              starts this is the whole trial
 *   endsOn   - the first day not covered
 */
export function trialStatus(trial, today) {
  const iv = { start: trial.start, end: trialEnd(trial) }
  const active = contains(iv, today)
  const daysLeft = today < iv.start ? duration(iv) : active ? iv.end - today : 0
  return { active, daysLeft, endsOn: iv.end }
}

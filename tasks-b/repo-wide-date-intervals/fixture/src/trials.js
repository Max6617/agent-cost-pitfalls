/**
 * Trial periods. A trial is { start, lengthDays }: it runs for `lengthDays`
 * days from `start`, so the account rolls onto paid on day
 * `start + lengthDays`, which is handed back as `endsOn`.
 */

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
  const end = trialEnd(trial)
  const started = today >= trial.start
  const active = started && today <= end
  const daysLeft = !started ? trial.lengthDays : active ? end - today + 1 : 0
  return { active, daysLeft, endsOn: end }
}

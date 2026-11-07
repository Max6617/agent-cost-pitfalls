/**
 * The usage report, as docs/quota-rules.md section 7 pins it.
 *
 * A report is a snapshot: it is rebuilt from the windows on every call, so a
 * report taken before more events arrive never changes under the caller.
 */
export function buildUsage({ key, dailyLimit, daily, hourly, lastAt, admitted, rejected }) {
  if (lastAt === null) {
    // A key the service has never seen reports zeros against a full allowance.
    return {
      key,
      day: null,
      usedToday: 0,
      remainingToday: dailyLimit,
      owed: 0,
      borrowed: 0,
      windowUsed: 0,
      admitted: 0,
      rejected: 0,
    }
  }
  return {
    key,
    day: daily.day,
    usedToday: daily.used,
    remainingToday: daily.remaining(),
    owed: daily.owed,
    borrowed: daily.borrowed,
    windowUsed: hourly.used(lastAt),
    admitted,
    rejected,
  }
}

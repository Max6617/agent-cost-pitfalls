/**
 * The day rule.
 *
 * A day field is *restricted* when it was written as something other than `*`
 * or `?`; that is a property of the text, not of the values it happens to
 * select. When both day fields are restricted, either of them may decide the
 * day; otherwise both have to agree.
 */
export function isRestricted(schedule, name) {
  return schedule.restricted[name] === true
}

/** Does a schedule run on the day that starts at `dayMs`? */
export function dayAllowed(schedule, dayMs) {
  const at = new Date(dayMs)
  if (!schedule.fields.month.includes(at.getUTCMonth() + 1)) return false

  const dayOfMonth = schedule.fields.dayOfMonth.includes(at.getUTCDate())
  const dayOfWeek = schedule.fields.dayOfWeek.includes(at.getUTCDay())
  if (isRestricted(schedule, 'dayOfMonth') && isRestricted(schedule, 'dayOfWeek')) {
    return dayOfMonth || dayOfWeek
  }
  return dayOfMonth && dayOfWeek
}

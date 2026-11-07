/**
 * Display helpers for the booking board by the lifts. Times are stored as
 * integer minutes past midnight; the board shows ordinary hh:mm.
 */

/** 600 -> '10:00' */
export function formatMinute(minute) {
  const hours = Math.floor(minute / 60)
  const minutes = minute % 60
  return `${hours}:${String(minutes).padStart(2, '0')}`
}

/** [600, 660) -> '10:00-11:00' */
export function formatSpan(start, end) {
  return `${formatMinute(start)}-${formatMinute(end)}`
}

/** One line on the board: 'oak 10:00-11:00 (12)' */
export function bookingLabel(booking) {
  return `${booking.room} ${formatSpan(booking.start, booking.end)} (${booking.attendees})`
}

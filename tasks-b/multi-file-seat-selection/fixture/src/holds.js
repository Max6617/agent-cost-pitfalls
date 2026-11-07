/**
 * holds.js - courtesy holds.
 *
 * A hold reserves a block of seats for `ttl` minutes from the moment it is
 * placed; confirming a hold turns it into a sale. Time is never read from
 * the clock: every call takes `now` from the caller (the kiosk's session
 * clock, the batch expiry job, the tests), and everything here is a pure
 * function of the holds placed and the `now` it is asked about.
 */
export function createHoldStore() {
  const holds = new Map()
  const booked = new Set()

  const isActive = (hold, now) => now <= hold.expiresAt

  const place = ({ id, seats, ttl }, now) => {
    if (holds.has(id)) return { status: 'conflict' }
    const hold = { id, seats: [...seats], placedAt: now, ttl, expiresAt: now + ttl }
    holds.set(id, hold)
    return { status: 'ok', expiresAt: hold.expiresAt }
  }

  const activeHolds = (now) => [...holds.values()].filter((h) => isActive(h, now))

  /** Labels nobody else can take right now: booked seats plus active holds. */
  const blockedSeats = (now) => {
    const blocked = new Set(booked)
    for (const h of holds.values()) {
      if (isActive(h, now)) for (const s of h.seats) blocked.add(s)
    }
    return blocked
  }

  /** Turn a hold into a sale. Booked seats stay blocked for everyone, for good. */
  const confirm = (id, now) => {
    const hold = holds.get(id)
    if (!hold) return { status: 'unknown-hold' }
    if (!isActive(hold, now)) return { status: 'hold-expired' }
    holds.delete(id)
    for (const s of hold.seats) booked.add(s)
    return { status: 'confirmed', seats: [...hold.seats] }
  }

  const release = (id) => {
    if (!holds.delete(id)) return { status: 'unknown-hold' }
    return { status: 'released' }
  }

  return {
    isActive,
    place,
    activeHolds,
    blockedSeats,
    confirm,
    release,
    get: (id) => holds.get(id) ?? null,
    isBooked: (label) => booked.has(label),
  }
}

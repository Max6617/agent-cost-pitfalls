import { nextId } from './util/ids.js'

/**
 * A concurrent-request limiter. `capacity` requests may be in flight for one
 * bucket at a time; each of them holds a slot until it releases it.
 *
 * The slot is a leak waiting to happen, which is why docs/pipeline-policy.md
 * section 6 spells out that a cancelled request gives its slot back: a request
 * that is never answered must not keep the limiter full for ever.
 */
export function createRateLimiter(options = {}) {
  const capacity = options.capacity ?? 4
  const held = new Map()

  const bucket = (key) => held.get(key) ?? 0

  return {
    capacity,
    held: bucket,
    allowed(key) {
      return bucket(key) < capacity
    },
    consume(key) {
      if (bucket(key) >= capacity) return null
      held.set(key, bucket(key) + 1)
      return {
        key,
        id: nextId('slot'),
        release() {
          const left = Math.max(0, bucket(key) - 1)
          if (left === 0) held.delete(key)
          else held.set(key, left)
        },
      }
    },
    restore() {
      // The caller has already been told how to give its slot back.
    },
  }
}

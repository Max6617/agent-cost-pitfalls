/** Shared helpers for the sync worker. Nothing here performs I/O. */

/** Throw the shape the worker's classifier understands. */
export function fail(status, message) {
  const error = new Error(message ?? 'upstream failure')
  error.status = status
  return error
}

/** A promise that resolves after `ms`. Replaced in tests. */
export function realSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Keep only the last `n` entries of a list. */
export function tail(list, n) {
  return list.slice(Math.max(0, list.length - n))
}

/** A monotonically increasing id, for log correlation. */
export function makeIdFactory(prefix = 'job') {
  let seq = 0
  return () => prefix + '-' + ++seq
}

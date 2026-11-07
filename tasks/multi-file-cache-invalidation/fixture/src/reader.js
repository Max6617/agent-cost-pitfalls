/**
 * A reader over an in-memory fixture. The real one is a SQL query; this is the
 * seam the tests replace.
 */
export function memoryReader(rows) {
  return {
    calls: 0,
    read() {
      this.calls += 1
      return rows.map((row) => ({ ...row }))
    },
  }
}

/** A reader that fails the first `times` calls, for the retry path. */
export function flakyReader(rows, times) {
  let failures = times
  return {
    calls: 0,
    read() {
      this.calls += 1
      if (failures > 0) {
        failures -= 1
        throw new Error('reader unavailable')
      }
      return rows.map((row) => ({ ...row }))
    },
  }
}

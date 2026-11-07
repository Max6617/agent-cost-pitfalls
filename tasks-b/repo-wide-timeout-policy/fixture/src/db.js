/**
 * Database statement plans.
 *
 * `query` is the read path, `exec` the DDL/migration path. The driver we
 * deploy against treats a timeout of 0 as "wait as long as it takes", which
 * the nightly report runners rely on, so the value the caller asks for is
 * passed through untouched. The default below was tuned for the old cluster.
 */

const DEFAULT_STATEMENT_TIMEOUT_MS = 1_500

export function createDb() {
  const plan = (sql, params, timeout) => ({
    sql,
    params,
    timeoutMs: timeout === undefined ? DEFAULT_STATEMENT_TIMEOUT_MS : timeout,
  })

  return {
    /** A read statement: rows come back. */
    query(sql, params = [], { timeout } = {}) {
      return plan(sql, params, timeout)
    },
    /** A statement with no result set: vacuum, migrate, grant. */
    exec(sql, { timeout } = {}) {
      return plan(sql, [], timeout)
    },
  }
}

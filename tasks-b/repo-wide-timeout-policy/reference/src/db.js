/**
 * Database statement plans.
 *
 * `query` is the read path, `exec` the DDL/migration path. Both resolve
 * their own operation through the policy; the driver never sees a value the
 * policy did not produce.
 */
export function createDb({ policy }) {
  const plan = (operation, sql, params, timeout) => ({
    sql,
    params,
    timeoutMs: policy.resolve(operation, timeout),
  })

  return {
    /** A read statement: rows come back. */
    query(sql, params = [], { timeout } = {}) {
      return plan('db.query', sql, params, timeout)
    },
    /** A statement with no result set: vacuum, migrate, grant. */
    exec(sql, { timeout } = {}) {
      return plan('db.exec', sql, [], timeout)
    },
  }
}

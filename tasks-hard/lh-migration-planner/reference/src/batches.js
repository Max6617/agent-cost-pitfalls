/**
 * Batched statements.
 *
 * A backfill holds the write lock while it runs, so a statement that touches
 * many rows is applied a batch at a time. The batch size comes from the ticket,
 * or from the planner configuration when the ticket does not say.
 */
import { DEFAULT_CONFIG } from './config.js'

/** The rows per batch this migration runs with. */
export function batchSizeOf(migration, config = DEFAULT_CONFIG) {
  const size = migration.batchSize ?? config.defaultBatchSize
  return size > 0 ? size : config.defaultBatchSize
}

/** How many batches the statement is split into. */
export function batchCount(migration, config = DEFAULT_CONFIG) {
  if (!(migration.rows > 0)) return 0
  // The batches are whole, and the last one carries whatever is left over, so
  // the division is rounded up: rounding it to the nearest batch drops the tail
  // of every backfill that does not divide evenly.
  return Math.ceil(migration.rows / batchSizeOf(migration, config))
}

/** `{ index, rows }` per batch, in the order they are applied. */
export function expandBatches(migration, config = DEFAULT_CONFIG) {
  const size = batchSizeOf(migration, config)
  const count = batchCount(migration, config)
  const batches = []
  let left = migration.rows ?? 0
  for (let index = 0; index < count; index++) {
    const rows = Math.min(size, left)
    batches.push({ index, rows })
    left -= rows
  }
  return batches
}

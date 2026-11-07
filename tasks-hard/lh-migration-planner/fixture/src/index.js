/**
 * planner - public surface.
 *
 * Everything the release tooling and the change-ticket importer are allowed to
 * import. Modules under src/ that are not re-exported here are internal and may
 * be reorganised freely; the names below may not.
 */
export { planMigrations, configFor, STATUSES } from './planner.js'
export { applyPlan, resumeFrom } from './resume.js'
export { renderPlan } from './report.js'
export { loadConfig, DEFAULT_CONFIG, repoRoot, readJson } from './config.js'
export { normalizeMigration, normalizeAll, tableOf } from './migrations.js'
export { orderMigrations } from './order.js'
export { findCycle, missingDependencies } from './graph.js'
export { isDestructive, destructiveFindings, DESTRUCTIVE_OPERATIONS } from './danger.js'
export { batchCount, batchSizeOf, expandBatches } from './batches.js'
export { lockWindowMs, lockFindings } from './locks.js'
export { estimatePlan, stepEstimateMs, rowsMs } from './estimate.js'
export { rollbackPlan } from './rollback.js'

/**
 * approvals - public surface.
 *
 * Everything the intake jobs and the status screens are allowed to import.
 * Modules under src/ that are not re-exported here are internal and may be
 * reorganised freely; the names below may not.
 */
import { ApprovalService } from './service.js'

export { ApprovalService }

/**
 * A service with an empty flow registry and no documents. Flows are defined
 * with defineFlow(), documents are submitted against them with submit().
 */
export function createApprovalService() {
  return new ApprovalService()
}

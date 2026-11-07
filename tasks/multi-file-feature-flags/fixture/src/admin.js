import { Evaluator } from './evaluate.js'
import { FlagAudit } from './audit.js'

/**
 * The admin surface.
 *
 * Reads and writes go through here so that a change is always audited: the
 * evaluator itself has no idea who is calling it.
 */
export class FlagAdmin {
  constructor({ evaluator = new Evaluator(), audit = new FlagAudit(), actor = 'system' } = {}) {
    this.evaluator = evaluator
    this.audit = audit
    this.actor = actor
  }

  /** Turn a flag on or off for one subject, and record who did it. */
  override(flag, subject, value) {
    this.evaluator.override(flag, subject, value)
    this.audit.record('override', flag, this.actor, { subject, value })
    return this
  }

  /** The value plus the explanation, for the debug page. */
  explain(flag, subject) {
    return this.evaluator.explain(flag, subject)
  }

  /** Everything on for one subject. */
  snapshot(subject) {
    return this.evaluator.all(subject)
  }
}

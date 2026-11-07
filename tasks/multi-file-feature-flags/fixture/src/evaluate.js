import { FLAGS, isDefined, percentOf } from './flags.js'
import { inRollout, bucketOf } from './bucketing.js'

/**
 * Evaluation.
 *
 * Precedence, highest first:
 *
 *   1. an explicit override for this subject
 *   2. the flag's own definition
 *   3. off — an unknown flag is off, never on
 *
 * An override applies to one subject and is recorded so the audit log can show
 * who was let in early and by whom.
 */
export class Evaluator {
  /** @param {{ overrides?: Record<string, Record<string, boolean>>, logger?: Function }} [options] */
  constructor({ overrides = {}, logger = () => {} } = {}) {
    this.overrides = overrides
    this.logger = logger
  }

  /** Turn a flag on or off for one subject. */
  override(flagName, subject, value) {
    this.overrides[flagName] = this.overrides[flagName] ?? {}
    this.overrides[flagName].default = value
    this.logger({ event: 'flag.overridden', flag: flagName, subject, value })
    return this
  }

  /**
   * Is the flag on for this subject?
   *
   * @param {string} flagName
   * @param {string} subject
   */
  isOn(flagName, subject = 'anonymous') {
    const forced = this.overrides[flagName]?.default
    if (forced !== undefined) return forced

    if (!isDefined(flagName)) return false

    const flag = FLAGS[flagName]
    if (flag.kind === 'boolean') return flag.enabled

    const percent = percentOf(flagName)
    if (percent === null) return false
    return inRollout(flagName, subject, percent)
  }

  /**
   * Every flag's value for one subject.
   *
   * Flags the subject is not in are reported as false rather than omitted, so
   * the client can cache the whole map.
   */
  all(subject = 'anonymous') {
    const out = {}
    for (const name of Object.keys(FLAGS)) out[name] = this.isOn(name, subject)
    return out
  }

  /** Why a flag came out the way it did, for the debug endpoint. */
  explain(flagName, subject = 'anonymous') {
    const forced = this.overrides[flagName]?.default
    if (forced !== undefined) return { value: forced, reason: 'override' }
    if (!isDefined(flagName)) return { value: false, reason: 'unknown-flag' }

    const flag = FLAGS[flagName]
    if (flag.kind === 'boolean') return { value: flag.enabled, reason: 'definition' }
    return {
      value: inRollout(flagName, subject, flag.percent),
      reason: 'rollout',
      bucket: bucketOf(flagName, subject),
      percent: flag.percent,
    }
  }
}

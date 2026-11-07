import { classify } from './classify.js'
import { delayFor, rateLimitDelay } from './backoff.js'

/**
 * The sync worker.
 *
 * `attempt()` returns a result or throws. The worker turns each throw into a
 * verdict via `classify` and either waits out the schedule or gives up
 * immediately. `sleep` is injected so tests do not have to wait in real time.
 */
export class Worker {
  constructor({ config, attempt, sleep = async () => {}, logger = () => {} }) {
    this.config = config
    this.attempt = attempt
    this.sleep = sleep
    this.logger = logger
    this.waits = []
    this.verdicts = []
  }

  /** Run `attempt` until it succeeds, or until the policy says stop. */
  async run(input) {
    let attemptNo = 0

    for (;;) {
      try {
        const result = await this.attempt(input, attemptNo)
        return { ok: true, result, attempts: attemptNo + 1, waits: [...this.waits] }
      } catch (error) {
        const verdict = classify(error)
        this.verdicts.push(verdict)

        if (verdict.kind === 'fatal') {
          return { ok: false, fatal: true, error, attempts: attemptNo + 1, waits: [...this.waits] }
        }

        if (attemptNo + 1 >= this.config.attempts) {
          return { ok: false, fatal: false, error, attempts: attemptNo + 1, waits: [...this.waits] }
        }

        const wait = verdict.status === 429 ? rateLimitDelay(this.config, attemptNo) : delayFor(this.config, attemptNo)
        this.waits.push(wait)
        this.logger({ event: 'retry.scheduled', attempt: attemptNo, wait })
        await this.sleep(wait)
        attemptNo += 1
      }
    }
  }
}

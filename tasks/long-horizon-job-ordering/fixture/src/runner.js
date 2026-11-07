import { planOrder, mustPlan, waves } from './scheduler.js'

/**
 * The runner.
 *
 * Executes a plan one job at a time, recording what happened. A job that throws
 * stops the batch: a later job almost always reads what the failed one was
 * meant to write.
 */
export class Runner {
  /**
   * @param {{ jobs: object[], run: (name: string, job: object) => unknown,
   *           logger?: (event: object) => void }} deps
   */
  constructor({ jobs, run, logger = () => {} }) {
    this.jobs = jobs
    this.run = run
    this.logger = logger
    this.executed = []
    this.failed = null
  }

  /** Run the whole batch. */
  execute() {
    const plan = mustPlan(this.jobs)
    const byName = new Map(this.jobs.map((j) => [j.name, j]))

    for (const name of plan) {
      const job = byName.get(name)
      try {
        const result = this.run(name, job)
        this.executed.push(name)
        this.logger({ event: 'job.done', name, result })
      } catch (error) {
        this.failed = { name, error }
        this.logger({ event: 'job.failed', name, message: String(error?.message ?? error) })
        break
      }
    }

    return { executed: [...this.executed], failed: this.failed }
  }

  /** The wave structure, for the progress bar. */
  progress() {
    return waves(this.jobs)
  }
}

export { planOrder, mustPlan, waves }

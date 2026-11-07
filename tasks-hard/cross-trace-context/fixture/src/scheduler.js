/**
 * The scheduler tick.
 *
 * A tick wakes up, finds out what is due, and hands each job to the worker. The
 * tick is one span - it is the unit the operator watches for "did the schedule
 * fire at all" - and the jobs it starts are separate traces, because a job that
 * failed at 03:00 is looked up by itself, not by finding the tick that started
 * it.
 */
import { rootSpan, runInSpan } from './tracing.js'

export function createScheduler({ worker, events, clock, jobs = [], idGen } = {}) {
  if (!worker || typeof worker.run !== 'function') throw new TypeError('createScheduler needs a worker')
  let ticks = 0

  const runInTickSpan = (span, operation) => runInSpan(span, operation)

  return {
    /** Run everything that is due under `now`. Returns one result per job. */
    async tick({ now, due } = {}) {
      ticks += 1
      const at = now ?? (clock ? clock.now() : undefined)
      const schedule = due ?? jobs
      const span = rootSpan({ idGen })
      const started = []

      await runInTickSpan(span, async () => {
        events?.emit({ name: 'scheduler.tick', meta: { at, jobs: schedule.length } })
        for (const job of schedule) {
          started.push(worker.run({ name: job.name, payload: job.payload ?? {}, due: at }))
        }
      })

      const settled = await Promise.allSettled(started)
      return settled.map((s) => (s.status === 'fulfilled' ? { ok: true, value: s.value } : { ok: false, error: s.reason }))
    },

    get ticks() {
      return ticks
    },
  }
}

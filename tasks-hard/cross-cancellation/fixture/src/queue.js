import { nextId } from './util/ids.js'

/**
 * The submission queue in front of the workers.
 *
 * `submit` puts a job in `pending`. A worker claims it later - which in this
 * checkout means the caller calls `dequeue()` - and that moves it to `started`.
 * Until a job is started, nothing about it is irreversible, and
 * docs/pipeline-policy.md section 7 says a cancelled request's job must be gone
 * from both lists rather than left sitting in the queue.
 */
export function createQueue() {
  const pending = []
  const started = new Map()
  const removed = new Map()

  return {
    pending() {
      return pending.slice()
    },
    started() {
      return [...started.values()]
    },
    removed() {
      return [...removed.values()]
    },
    has(id) {
      return pending.some((j) => j.id === id)
    },

    submit(job) {
      const entry = {
        id: nextId('job'),
        ref: job.ref,
        payload: job.payload ?? null,
      }
      pending.push(entry)
      return entry.id
    },

    /** Pull the oldest waiting job. Returns null when there is nothing to do. */
    dequeue() {
      const entry = pending[0]
      if (!entry) return null
      started.set(entry.id, entry)
      removed.set(entry.id, { ...entry, state: 'removed' })
      return entry
    },

    /** Take a waiting job back out of the queue. */
    remove(id) {
      removed.set(id, { id, state: 'removed' })
      return true
    },
  }
}

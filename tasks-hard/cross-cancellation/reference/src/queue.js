import { nextId } from './util/ids.js'

/**
 * The submission queue in front of the workers.
 *
 * `submit` puts a job in `pending`. A worker claims it later - `claim`, alias
 * `dequeue` - and that moves it to `started`. Until a job is started, nothing
 * about it is irreversible, and docs/pipeline-policy.md section 5 says a
 * cancelled request's job must not be left in the queue for a worker to find.
 */
export function createQueue() {
  const pending = []
  const started = new Map()
  const removed = new Map()

  /** Pull the oldest waiting job. Returns null when there is nothing to do. */
  const claim = () => {
    const entry = pending.shift()
    if (!entry) return null
    started.set(entry.id, entry)
    return entry
  }

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

    claim,

    dequeue() {
      return claim()
    },

    /**
     * Take a waiting job back out of the queue. A job a worker has already
     * claimed is not waiting any more and is left alone: work that has begun is
     * not undone by a cancellation.
     */
    remove(id) {
      const at = pending.findIndex((j) => j.id === id)
      if (at === -1) return false
      pending.splice(at, 1)
      removed.set(id, { id, state: 'removed' })
      return true
    },
  }
}

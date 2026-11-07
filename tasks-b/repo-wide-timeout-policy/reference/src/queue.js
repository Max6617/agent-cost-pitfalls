/**
 * Job queue plans.
 *
 * `publish` blocks while the queue is full, `poll` blocks while it is empty,
 * so both resolve their own operation through the policy.
 */
export function createQueue({ policy, batchSize = 10 }) {
  const pending = []

  return {
    /** Add a message; returns how deep the queue now stands. */
    publish(message, { timeout } = {}) {
      const timeoutMs = policy.resolve('queue.publish', timeout)
      pending.push(message)
      return { queued: pending.length, timeoutMs }
    },

    /** Take up to `max` messages, waiting no longer than the resolved timeout. */
    poll({ timeout, max = batchSize } = {}) {
      const timeoutMs = policy.resolve('queue.poll', timeout)
      const messages = pending.splice(0, max)
      return { messages, timeoutMs }
    },

    /** How many messages are waiting, for the worker's metrics. */
    depth() {
      return pending.length
    },
  }
}

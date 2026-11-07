import { makeSubscription, inCallOrder } from './subscriptions.js'

/**
 * The event bus.
 *
 * Emitting calls every matching subscription in priority order, in the order
 * they were registered within a priority. A handler that throws does not stop
 * the others: the errors are collected and reported to the caller, because a
 * broken metrics listener must not take down the order path.
 *
 * `once` subscriptions are removed before they are called, so a handler that
 * re-emits the same event does not call itself.
 */
export class EventBus {
  constructor() {
    this.byEvent = new Map()
    this.emitted = []
  }

  /** Register a handler. Returns a function that removes it. */
  on(event, handler, options = {}) {
    const subscription = makeSubscription(event, handler, options)
    const list = this.byEvent.get(event) ?? []
    list.push(subscription)
    this.byEvent.set(event, list)
    return () => this.off(event, subscription)
  }

  /** Register a handler that is removed after its first call. */
  once(event, handler, options = {}) {
    return this.on(event, handler, { ...options, once: true })
  }

  /** Remove a subscription. */
  off(event, subscription) {
    const list = this.byEvent.get(event)
    if (!list) return false
    const index = list.indexOf(subscription)
    if (index < 0) return false
    list.splice(index, 1)
    return true
  }

  /** How many handlers are registered for an event. */
  count(event) {
    return (this.byEvent.get(event) ?? []).length
  }

  /**
   * Emit an event.
   *
   * @returns {{ called: number, errors: {name: string, error: unknown}[] }}
   */
  emit(event, payload) {
    const list = this.byEvent.get(event) ?? []
    const ordered = inCallOrder(list)
    const errors = []
    let called = 0

    for (const subscription of ordered) {
      subscription.handler(payload)
      called += 1
      if (subscription.once) this.off(event, subscription)
    }

    this.emitted.push({ event, called, errors: errors.length })
    return { called, errors }
  }

  /** Remove every subscription for an event, or all of them. */
  clear(event) {
    if (event === undefined) this.byEvent.clear()
    else this.byEvent.delete(event)
    return this
  }
}

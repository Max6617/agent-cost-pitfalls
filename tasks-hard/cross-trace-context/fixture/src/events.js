/**
 * The event bus.
 *
 * Every module in the service reports what it did as a structured event, and the
 * bus is the single place that stamps the envelope. A producer supplies the
 * event name and its payload; the envelope - `at`, `name` and the three context
 * fields - is added here so that no module has to remember to do it.
 *
 * `at` comes from the injected clock (`{ now() }`), never from `Date.now()`.
 */
import { currentContext, fields } from './context.js'

export const EVENT_KINDS = Object.freeze([
  'ingress',
  'route',
  'auth',
  'repo',
  'cache',
  'client',
  'worker',
  'scheduler',
  'audit',
])

export function createEventBus({ clock } = {}) {
  if (!clock || typeof clock.now !== 'function') {
    throw new TypeError('createEventBus needs a clock ({ now() })')
  }
  const events = []
  const listeners = new Set()

  const emit = (event) => {
    if (!event || typeof event.name !== 'string' || event.name.length === 0) {
      throw new TypeError('an event needs a name')
    }
    const record = Object.freeze({
      at: clock.now(),
      name: event.name,
      ...fields(currentContext()),
      meta: Object.freeze({ ...(event.meta ?? {}) }),
    })
    events.push(record)
    for (const listener of listeners) listener(record)
    return record
  }

  return {
    emit,
    /**
     * Emit under an explicit context instead of the one in flight - for
     * producers reporting something that happened under a span that has already
     * closed. Passing nothing keeps the ambient context.
     */
    emitWith(context, event) {
      if (!event || typeof event.name !== 'string' || event.name.length === 0) {
        throw new TypeError('an event needs a name')
      }
      const record = Object.freeze({
        at: clock.now(),
        name: event.name,
        ...fields(context ?? currentContext()),
        meta: Object.freeze({ ...(event.meta ?? {}) }),
      })
      events.push(record)
      for (const listener of listeners) listener(record)
      return record
    },
    /** Events emitted so far, oldest first. */
    events: () => events.slice(),
    /** Subscribe to every event. Returns an unsubscribe function. */
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    /** Drop everything recorded so far. */
    clear() {
      events.length = 0
    },
  }
}

export const namesOf = (events) => events.map((e) => e.name)

export const ofKind = (events, kind) => events.filter((e) => e.name.startsWith(kind + '.'))

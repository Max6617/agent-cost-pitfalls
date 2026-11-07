/** Wiring used by the app: the bus plus the listeners every process installs. */
import { EventBus } from './bus.js'

/** A listener that counts what it saw, for tests and for the metrics page. */
export function counter(name) {
  const seen = []
  return { name, seen, handler: (payload) => seen.push(payload) }
}

/**
 * Install the standard listeners.
 *
 * The audit listener is registered first so it runs before anything that might
 * throw, and the metrics listener last so it sees the payload as the others
 * left it.
 */
export function installStandardListeners(bus, { audit, metrics } = {}) {
  if (audit) bus.on('order.placed', audit, { priority: 10 })
  if (metrics) bus.on('order.placed', metrics, { priority: -10 })
  return bus
}

export { EventBus }

import { withContext } from '../logger.js'

/**
 * The checkout plugin host.
 *
 * Plugins are third-party and are allowed to fail; a failing plugin must not
 * take the checkout down with it, but it must be visible in the logs because
 * support gets the ticket before we do.
 */

/** Run every plugin; a throw is recorded and the rest still run. */
export function runPlugins(plugins, order, logger = withContext()) {
  const applied = []
  for (const plugin of plugins) {
    try {
      const result = plugin.apply(order)
      if (result !== undefined) applied.push({ name: plugin.name, result })
    } catch (err) {
      logger.warn('checkout: plugin ' + plugin.name + ' failed - ' + (err?.message ?? err))
    }
  }
  return applied
}

/** Complete an order once payment has cleared. */
export function completeOrder(order, logger = withContext()) {
  logger.warn('checkout complete order=' + order.id + ' total=' + order.total)
  return { ...order, completed: true }
}

/** Is this plugin set able to handle the order at all? */
export function canHandle(plugins, order) {
  return plugins.some((p) => (typeof p.matches === 'function' ? p.matches(order) : true))
}

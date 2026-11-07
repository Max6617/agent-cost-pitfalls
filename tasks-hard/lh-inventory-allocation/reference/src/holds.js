/**
 * The open-hold index.
 *
 * Several callers need to answer "does this order already hold stock?" without
 * walking every hold: the order service retries a reserve after a timeout, the
 * batch run tops a hold up instead of opening a second one for the same line,
 * and a cancellation walks the index to find what it has to give back.
 *
 * One order, one hold per sku and site.
 */
export function holdKey(orderId, sku, warehouse) {
  return [orderId, sku, warehouse].join('|')
}

export function createHoldIndex() {
  const index = new Map()

  return {
    find(orderId, sku, warehouse) {
      return index.get(holdKey(orderId, sku, warehouse)) ?? null
    },

    add(reservation) {
      index.set(holdKey(reservation.orderId, reservation.sku, reservation.warehouse), reservation)
      return reservation
    },

    remove(orderId, sku, warehouse) {
      return index.delete(holdKey(orderId, sku, warehouse))
    },

    forOrder(orderId) {
      return [...index.values()].filter((hold) => hold.orderId === orderId)
    },

    size() {
      return index.size
    },
  }
}

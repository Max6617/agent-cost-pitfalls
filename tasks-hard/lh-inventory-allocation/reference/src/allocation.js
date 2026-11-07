/**
 * The allocation engine.
 *
 * One object owns four ledgers — what is on the shelves, what the channels are
 * keeping back, what customers have been promised and what they have asked for —
 * and every question asked of it is answered by replaying them. Nothing here
 * reads a clock, keeps a timer or writes anywhere: the caller says what instant
 * it is and gets an answer for that instant, which is what makes a picking run
 * reproducible after the fact.
 */
import { buildAtp, createAtpCache } from './atp.js'
import { createBufferTable } from './buffers.js'
import { requireInstant, toIso } from './clock.js'
import { canonicalDemand, createDemandQueue, DEFAULT_PRIORITY } from './demand.js'
import { expiryOf, isExpired } from './expiry.js'
import { createHoldIndex } from './holds.js'
import { createStockLedger } from './ledger.js'
import { fillUnits } from './picking.js'
import { createReservationRegistry } from './reservations.js'
import { requirePositiveQty, requireQty } from './util/quantities.js'

/** Two hours is the TTL agreed with the order service. */
export const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000

export class Allocator {
  constructor({ packSize = 1, defaultTtlMs = DEFAULT_TTL_MS, channels = [] } = {}) {
    requireQty(packSize, 'packSize')
    if (packSize < 1) throw new RangeError('packSize must be at least 1')
    this.packSize = packSize
    this.defaultTtlMs = defaultTtlMs
    this.channels = [...channels]

    this.stock = createStockLedger()
    this.buffers = createBufferTable()
    this.registry = createReservationRegistry()
    this.holds = createHoldIndex()
    this.queue = createDemandQueue()
    this.atpCache = createAtpCache()
    this.cancelled = new Set()
    this.runs = []
  }

  // ---------------------------------------------------------------- stock

  /** Book goods into a shelf. */
  receive({ warehouse, sku, qty, at, ref = null } = {}) {
    requireInstant(at, 'receive')
    requirePositiveQty(qty)
    const movement = this.stock.record({ warehouse, sku, qty, kind: 'receipt', at, ref })
    this.atpCache.clear()
    return { status: 'received', movement }
  }

  /**
   * Book goods out of a shelf. Naming a hold closes it as shipped: the promise
   * has been kept and the goods are gone.
   */
  ship({ warehouse, sku, qty, at, ref = null, reservationId = null } = {}) {
    requireInstant(at, 'ship')
    requirePositiveQty(qty)
    const onHand = this.stock.onHand(warehouse, sku)
    if (qty > onHand) return { status: 'insufficient-stock', onHand, requested: qty }
    if (reservationId) {
      const reservation = this.registry.get(reservationId)
      if (reservation) {
        this.registry.close(reservationId, 'shipped', at, 'shipped')
        this.holds.remove(reservation.orderId, reservation.sku, reservation.warehouse)
      }
    }
    const movement = this.stock.record({ warehouse, sku, qty, kind: 'shipment', at, ref })
    this.atpCache.clear()
    return { status: 'shipped', movement }
  }

  /** A signed correction after a stock count. */
  adjust({ warehouse, sku, qty, at, ref = null } = {}) {
    requireInstant(at, 'adjust')
    requireQty(qty, 'adjustment')
    const movement = this.stock.record({ warehouse, sku, qty, kind: 'adjustment', at, ref })
    this.atpCache.clear()
    return { status: 'adjusted', movement }
  }

  onHand(warehouse, sku) {
    return this.stock.onHand(warehouse, sku)
  }

  movements(options = {}) {
    return this.stock.movements(options)
  }

  // -------------------------------------------------------------- buffers

  setBuffer({ channel = null, sku, warehouse, qty } = {}) {
    const set = this.buffers.set({ channel, sku, warehouse, qty })
    this.atpCache.clear()
    return { channel, sku, warehouse, qty: set }
  }

  bufferFor({ channel = null, sku, warehouse } = {}) {
    return this.buffers.get({ channel, sku, warehouse })
  }

  // --------------------------------------------------------------- demand

  /** Put a customer's line in the queue. */
  addDemand({ orderId, sku, warehouse, qty, priority = DEFAULT_PRIORITY, channel = null, placedAt } = {}) {
    return this.queue.add({ orderId, sku, warehouse, qty, priority, channel, placedAt })
  }

  demandLines({ orderId = null, status = null } = {}) {
    return this.queue.all()
      .filter((line) => orderId === null || String(line.orderId) === String(orderId))
      .filter((line) => status === null || line.status === status)
  }

  /** Lines still waiting for stock, in policy order. */
  backorders({ warehouse = null, sku = null } = {}) {
    return canonicalDemand(this.queue.outstanding({ warehouse, sku }))
      .map((line) => ({
        orderId: line.orderId,
        sku: line.sku,
        warehouse: line.warehouse,
        channel: line.channel,
        priority: line.priority,
        placedAt: line.placedAt,
        requested: line.qty,
        filled: line.filled,
        outstanding: line.outstanding,
      }))
  }

  // --------------------------------------------------------------- holds

  /** How much of a shelf is promised at one instant. */
  held({ warehouse, sku, at } = {}) {
    requireInstant(at, 'held')
    return this.registry.heldUnits(warehouse, sku, at)
  }

  /**
   * What a channel may still sell off a shelf: what is there, minus what is
   * promised, minus the channel's own safety stock unless it says otherwise.
   */
  freeStock({ warehouse, sku, channel = null, at, allowBuffer = false } = {}) {
    requireInstant(at, 'freeStock')
    const onHand = this.stock.onHand(warehouse, sku)
    const held = this.held({ warehouse, sku, at })
    const buffer = allowBuffer ? 0 : this.buffers.get({ channel, sku, warehouse })
    return Math.max(0, onHand - held - buffer)
  }

  /**
   * Promise a customer a number of units. All or nothing: a line the shelf
   * cannot cover is answered with the quantity that is actually available, and
   * the caller decides whether to backorder it.
   */
  reserve({
    orderId, sku, warehouse, qty, channel = null, priority = DEFAULT_PRIORITY,
    at, ttlMs = undefined, allowBuffer = false,
  } = {}) {
    requireInstant(at, 'reserve')
    requirePositiveQty(qty)

    const existing = this.holds.find(orderId, sku, warehouse)
    if (existing && existing.status === 'active') {
      return { status: 'already-held', reservation: existing }
    }

    const free = this.freeStock({ warehouse, sku, channel, at, allowBuffer })
    if (free < qty) return { status: 'insufficient', sku, warehouse, requested: qty, available: free }

    const reservation = this.registry.create({
      orderId,
      sku,
      warehouse,
      qty,
      channel,
      priority,
      expiresAt: expiryOf(at, ttlMs === undefined ? this.defaultTtlMs : ttlMs),
      at,
    })
    this.holds.add(reservation)
    this.atpCache.clear()
    return { status: 'reserved', reservation }
  }

  /** Give a promise back. */
  release(reservationId, { at, reason = 'manual' } = {}) {
    requireInstant(at, 'release')
    const reservation = this.registry.get(reservationId)
    if (!reservation) return { status: 'unknown', id: reservationId, released: 0 }
    if (reservation.status !== 'active' || isExpired(reservation, at)) {
      return { status: 'not-active', id: reservationId, released: 0, reservation }
    }

    this.registry.close(reservationId, 'released', at, reason)
    this.holds.remove(reservation.orderId, reservation.sku, reservation.warehouse)
    this.returnToQueue(reservation)
    this.atpCache.clear()
    return { status: 'released', id: reservationId, released: reservation.qty, reservation: this.registry.get(reservationId) }
  }

  /** Cancel a whole order: every hold it still has, and its demand. */
  cancelOrder(orderId, { at } = {}) {
    requireInstant(at, 'cancelOrder')
    if (this.cancelled.has(String(orderId))) return { status: 'already-cancelled', released: 0 }

    const holds = this.registry.forOrder(orderId)
    let released = 0
    for (const reservation of holds) {
      if (reservation.status === 'active') released += reservation.qty
      this.registry.close(reservation.id, 'cancelled', at, 'order-cancelled')
      this.holds.remove(reservation.orderId, reservation.sku, reservation.warehouse)
    }
    for (const line of this.queue.forOrder(orderId)) line.status = 'cancelled'
    this.cancelled.add(String(orderId))
    this.atpCache.clear()
    return { status: 'cancelled', released }
  }

  /** The holds the engine knows about. `live: true` needs an instant. */
  reservations({ at = null, warehouse = null, sku = null, orderId = null, live = false } = {}) {
    const all = live ? this.registry.live(at) : this.registry.all()
    return all
      .filter((r) => warehouse === null || r.warehouse === warehouse)
      .filter((r) => sku === null || r.sku === sku)
      .filter((r) => orderId === null || String(r.orderId) === String(orderId))
  }

  /** Mark every hold whose deadline has passed. Nothing depends on it. */
  expireDue({ at } = {}) {
    return this.registry.expireDue({ at })
  }

  // ----------------------------------------------------------- allocation

  /**
   * One picking run: walk the waiting lines in policy order and fill what the
   * shelves can cover, backordering the rest.
   */
  allocate({ at, allowBuffer = false } = {}) {
    requireInstant(at, 'allocate')
    const run = { at: toIso(at), lines: [], filled: 0, backordered: 0 }

    for (const line of canonicalDemand(this.queue.open())) {
      const outstanding = line.qty - line.filled
      if (outstanding <= 0) continue

      const free = this.freeStock({
        warehouse: line.warehouse,
        sku: line.sku,
        channel: line.channel,
        at,
        allowBuffer,
      })
      const fill = fillUnits(outstanding, free, this.packSize)
      if (fill > 0) {
        this.holdFor(line, fill, at)
        line.filled += fill
      }
      line.status = line.filled >= line.qty ? 'allocated' : line.filled > 0 ? 'partial' : 'open'

      run.lines.push({
        orderId: line.orderId,
        sku: line.sku,
        warehouse: line.warehouse,
        channel: line.channel,
        priority: line.priority,
        requested: line.qty,
        filled: line.filled,
        added: fill,
        outstanding: line.qty - line.filled,
        status: line.status,
      })
      run.filled += fill
      run.backordered += line.qty - line.filled
    }

    this.atpCache.clear()
    this.runs.push(run)
    return run
  }

  /** Open a hold for a line, or grow the one it already has. */
  holdFor(line, add, at) {
    const existing = this.holds.find(line.orderId, line.sku, line.warehouse)
    if (existing && existing.status === 'active') {
      existing.qty += add
      return existing
    }
    const reservation = this.registry.create({
      orderId: line.orderId,
      sku: line.sku,
      warehouse: line.warehouse,
      qty: add,
      channel: line.channel,
      priority: line.priority,
      expiresAt: expiryOf(at, this.defaultTtlMs),
      at,
    })
    this.holds.add(reservation)
    return reservation
  }

  /** A released hold puts its line back in the queue with nothing filled. */
  returnToQueue(reservation) {
    const line = this.queue.get(reservation.orderId, reservation.sku, reservation.warehouse)
    if (!line || line.status === 'cancelled') return null
    line.filled = 0
    line.status = 'open'
    return line
  }

  // ------------------------------------------------------------ reporting

  /** Available to promise for one shelf and one channel. */
  atp({ sku, warehouse, channel = null, at } = {}) {
    requireInstant(at, 'atp')
    const key = this.atpCache.key({ sku, warehouse, channel, at })
    const cached = this.atpCache.get(key)
    if (cached) return cached

    const onHand = this.stock.onHand(warehouse, sku)
    const held = this.held({ warehouse, sku, at })
    const buffer = this.buffers.get({ channel, sku, warehouse })
    return this.atpCache.set(key, buildAtp({ sku, warehouse, channel, at, onHand, held, buffer }))
  }
}

export function createAllocator(options = {}) {
  return new Allocator(options)
}

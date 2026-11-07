/**
 * The cart service: guest carts, account carts, and the login that joins them.
 *
 * Everything is in memory. Time is never read from the clock: every operation
 * that depends on "now" takes it as a parameter, so a replay of the same calls
 * always produces the same carts.
 */
import { normalizeCatalog, findSku } from './catalog.js'
import { createCart, addLine, renderView } from './cart.js'
import { mergeCarts } from './merge.js'
import { findCoupon, attachable, qualifies } from './coupons.js'

export class CartService {
  constructor({ catalog = [], stock = {}, maxPerCustomer = 99, coupons = [] } = {}) {
    this.catalog = normalizeCatalog(catalog)
    this.stock = { ...stock }
    this.maxPerCustomer = maxPerCustomer
    this.coupons = coupons
    this.guestCarts = new Map()
    this.accountCarts = new Map()
    this.spentTokens = new Set()
  }

  ctx(now) {
    return { catalog: this.catalog, stock: this.stock, maxPerCustomer: this.maxPerCustomer, now }
  }

  guest(token) {
    if (!this.guestCarts.has(token)) this.guestCarts.set(token, createCart({ guest: token }))
    return this.guestCarts.get(token)
  }

  account(customerId) {
    if (!this.accountCarts.has(customerId)) this.accountCarts.set(customerId, createCart({ customer: customerId }))
    return this.accountCarts.get(customerId)
  }

  guestAdd(token, line) {
    return addLine(this.guest(token), line, this.ctx(line.addedAt))
  }

  accountAdd(customerId, line) {
    return addLine(this.account(customerId), line, this.ctx(line.addedAt))
  }

  guestCoupon(token, code, now) {
    return this.attachCoupon(this.guest(token), code, now)
  }

  accountCoupon(customerId, code, now) {
    return this.attachCoupon(this.account(customerId), code, now)
  }

  attachCoupon(cart, code, now) {
    const coupon = findCoupon(this.coupons, code)
    if (!attachable(coupon, now)) return { status: 'rejected' }
    cart.couponCode = coupon.code
    return { status: 'applied' }
  }

  /** The warehouse reports; stock moves. */
  setStock(sku, n) {
    this.stock[sku] = n
  }

  /** The merchandiser re-prices; the catalog moves. */
  setPrice(sku, priceCents) {
    const entry = findSku(this.catalog, sku)
    if (entry) entry.priceCents = priceCents
  }

  view(customerId) {
    return renderView(this.account(customerId), this.coupons)
  }

  guestView(token) {
    return renderView(this.guest(token), this.coupons)
  }

  /**
   * Merge the guest cart behind `token` into `customerId`'s account cart.
   * A token is spent by its first merge: it empties the guest cart and no
   * later login with it, to any account, merges anything again.
   */
  login(customerId, token, now) {
    if (this.spentTokens.has(token)) {
      return { status: 'already-merged', droppedSkus: [], couponKept: false }
    }
    const guest = this.guestCarts.get(token)
    if (!guest || guest.lines.length === 0) {
      return { status: 'no-guest-cart', droppedSkus: [], couponKept: false }
    }
    const account = this.account(customerId)
    const { droppedSkus } = mergeCarts(account, guest, this.ctx(now))

    // The account's own coupon outranks the guest's.
    if (!account.couponCode && guest.couponCode) account.couponCode = guest.couponCode
    if (account.couponCode) {
      const coupon = findCoupon(this.coupons, account.couponCode)
      const view = renderView(account, this.coupons)
      if (!coupon || !qualifies(coupon, view, now)) account.couponCode = null
    }

    this.spentTokens.add(token)
    guest.lines = []
    guest.couponCode = null

    return { status: 'merged', droppedSkus, couponKept: account.couponCode !== null }
  }
}

export function createCartService(config) {
  return new CartService(config)
}

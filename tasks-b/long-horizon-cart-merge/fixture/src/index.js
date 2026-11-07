/**
 * cart - public surface.
 *
 * Everything the storefront, the session layer and the back-office jobs are
 * allowed to import. Modules under src/ that are not re-exported here are
 * internal and may be reorganised freely; the names below may not.
 */
export { createCartService, CartService } from './service.js'
export { mergeCarts } from './merge.js'
export { effectiveCap, combineQuantities } from './limits.js'
export { findCoupon, attachable, qualifies, withinWindow } from './coupons.js'
export { normalizeCatalog, findSku, priceFor, isAvailable } from './catalog.js'
export { createCart, addLine, renderView } from './cart.js'
export { formatCents } from './util/format.js'

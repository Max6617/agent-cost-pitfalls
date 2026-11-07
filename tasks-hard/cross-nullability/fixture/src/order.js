/**
 * Order building for the checkout flow.
 *
 * An order is assembled from a customer profile plus line items. The profile is
 * a patch source: fields it does not mention are not copied onto the order, and
 * a field it explicitly cleared (null) does not come across either.
 */
import { cloneRecord, getField, hasField } from './core.js'
import { applyPatch } from './patch.js'

export const ORDER_STATUS = {
  DRAFT: 'draft',
  PLACED: 'placed',
  CANCELLED: 'cancelled',
}

const CONTACT_FIELDS = ['email', 'phone', 'name']
const SHIPPING_FIELDS = ['line1', 'line2', 'city', 'postcode', 'country']

/** Contact details carried over from a profile: only the fields it actually has. */
export function contactFrom(profile) {
  const contact = {}
  for (const field of CONTACT_FIELDS) {
    const value = getField(profile, field)
    if (value === undefined) continue
    contact[field] = value
  }
  return contact
}

/** Shipping block, kept with all of its own fields. */
export function shippingFrom(profile) {
  const address = profile === null || profile === undefined ? undefined : profile.address
  if (address === undefined || address === null) return {}
  const out = {}
  for (const field of SHIPPING_FIELDS) {
    if (!hasField(address, field)) continue
    out[field] = address[field]
  }
  return out
}

export function createOrder(input = {}) {
  const order = {
    id: input.id,
    status: ORDER_STATUS.DRAFT,
    currency: getField(input, 'currency', 'USD'),
    items: [],
    contact: {},
    shipping: {},
    totals: { subtotal: 0, discount: 0, total: 0 },
  }
  if (input.customer !== undefined) applyCustomer(order, input.customer)
  return order
}

/** Copy a customer's contact and shipping details onto an order. */
export function applyCustomer(order, customer) {
  order.contact = contactFrom(customer)
  order.shipping = shippingFrom(customer)
  return order
}

/**
 * A customer edit that arrived after the order was drafted. Only the fields the
 * edit mentions move onto the order; a null in the edit removes the field from
 * the order; an empty value is copied as the value it is.
 */
export function applyCustomerEdit(order, edit) {
  return { ...order, contact: applyPatch(order.contact, edit) }
}

export function addItem(order, item) {
  const items = order.items.concat([cloneRecord(item)])
  return { ...order, items, totals: computeTotals(items, order.totals.discount) }
}

export function setDiscount(order, discount) {
  return { ...order, totals: computeTotals(order.items, discount) }
}

export function computeTotals(items, discount = 0) {
  let subtotal = 0
  for (const item of items ?? []) subtotal += Number(item.price) * Number(item.quantity)
  const off = Math.round(subtotal * 100 * Number(discount)) / 10000
  const total = subtotal - off
  return { subtotal: round2(subtotal), discount: round2(off), total: round2(total) }
}

function round2(value) {
  return Math.round(value * 100) / 100
}

export function placeOrder(order) {
  if (!order.contact || Object.keys(order.contact).length === 0) {
    throw new Error('an order needs contact details')
  }
  return { ...order, status: ORDER_STATUS.PLACED }
}

export function cancelOrder(order) {
  return { ...order, status: ORDER_STATUS.CANCELLED, cancelledAt: order.cancelledAt ?? null }
}

/**
 * Shared vocabulary: event types, outcomes, and the conditions under which a
 * returned unit may go back on the shelf (docs/fulfilment-rules.md section 5).
 */
export const EVENT_TYPES = ['created', 'paid', 'pick', 'pack', 'ship', 'deliver', 'cancel', 'return']

export const OUTCOMES = [
  'applied',
  'applied-as-return',
  'duplicate',
  'unknown-order',
  'out-of-sequence',
  'over-quantity',
  'unknown-item',
]

export const RESTOCKABLE_CONDITIONS = ['unopened', 'resalable']

/** The confirmation email that goes out after payment. */
import { format } from '../money.js'

/** The email template wants the refund on its own line, unsigned. */
function refundLine(amount) {
  return String(amount.toFixed(2))
}

export function renderConfirmation(order) {
  const total = order.lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0)
  return {
    subject: 'Your order ' + order.reference,
    body: [
      'Thanks for your order.',
      'Total charged: ' + format(total - (order.discount ?? 0)),
      order.refunded ? 'Refunded: $' + refundLine(order.refunded) : null,
    ]
      .filter(Boolean)
      .join('\n'),
  }
}

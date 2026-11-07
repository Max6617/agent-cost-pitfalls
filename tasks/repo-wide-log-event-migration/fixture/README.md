# order-pipeline

Five services, one structured logger.

## Logging

`src/logger.js` is the only thing that writes to stdout. A log line is one JSON
object:

```json
{"ts":"2026-01-01T00:00:00.000Z","level":"warn","event":"inventory.stock_discrepancy",
 "context":{"orderId":"A-1"},"data":{"sku":"TEA-01","missing":3,"onHand":1}}
```

`event` is a name from `EVENTS` — never free-form prose. `data` carries the
fields declared for that event. `context` carries the correlation ids bound with
`withContext()` / `logger.child()`.

`info`, `warn` and `error` still take a plain message and are reserved for
genuinely exceptional conditions a human will read. Anything a dashboard, alert
or support query keys on goes through `event()`.

## Services

| module | responsibility |
|---|---|
| `services/inventory.js` | stock snapshot and optimistic reservation |
| `services/reservations.js` | queue worker built on the inventory |
| `services/checkout.js` | third-party plugin host |
| `services/payment.js` | provider adapter, capture/refund/retry |
| `services/shipping.js` | carrier rate matrix |
| `services/orders.js` | append-only order revisions |

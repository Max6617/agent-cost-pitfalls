# cart

Shopping carts: a guest cart per session token, an account cart per customer,
and the merge that joins them at login.

```
docs/cart-rules.md   the rules storefront signed off - treat as the contract
src/                 the implementation
bin/report.js        the ops snapshot job, a fixed demo
test/                reproductions; a subset of what login checks
```

## Use

```js
import { createCartService } from './src/index.js'

const service = createCartService({
  catalog: [{ sku: 'MUG', title: 'Enamel mug', priceCents: 1200, availableUntil: null }],
  stock: { MUG: 20 },
  maxPerCustomer: 6,
  coupons: [{ code: 'SPRING', percentOff: 10, minSubtotalCents: 1000, validUntil: '2026-12-31' }],
})

service.guestAdd('sess-1', { sku: 'MUG', qty: 2, addedAt: '2026-01-10' })
service.accountAdd('cust-7', { sku: 'MUG', qty: 1, addedAt: '2026-01-08' })
service.guestCoupon('sess-1', 'SPRING', '2026-01-10')   // { status: 'applied' }

service.login('cust-7', 'sess-1', '2026-01-15')         // the merge; see docs §3, §6
service.view('cust-7')        // { lines, couponCode, subtotalCents, discountCents, totalCents }
service.guestView('sess-1')   // the guest side of the same render
```

The back office moves the world under open carts: `setStock(sku, n)` when the
warehouse reports, `setPrice(sku, cents)` when merchandising re-prices. What
that does to a cart is the merge's business - `docs/cart-rules.md` §3-4.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  storefront and the ops jobs import these files directly.
- No dependencies. The service runs inside the session container, which has no
  network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Money is integer cents everywhere; strings exist only at the display edge.
- Nothing here reads the clock. Every operation that needs "now" takes it as a
  parameter, so the same sequence of calls always produces the same carts.

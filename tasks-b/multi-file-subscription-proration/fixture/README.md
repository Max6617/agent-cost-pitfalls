# proration-service

Subscription billing: plan changes, seat changes, credit balances, tax and
invoices for a small SaaS product.

```
docs/billing-rules.md   the rules support and finance agreed - the contract
src/                    the implementation
src/index.js            the public surface; everything imports from here
bin/preview.js          print what a change costs, for support calls
test/                   reproductions; a subset of what billing checks
```

## Use

```js
import { createBillingService } from './src/index.js'

const svc = createBillingService()                 // default catalog, 8.75% tax
svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'growth', seats: 3,
                periodStart: '2026-04-01', periodEnd: '2026-04-30' })
svc.grantCredit('acct-1', 2000)
svc.changePlan('sub-1', 'scale', '2026-04-16')     // -> { kind, effectiveFrom, invoice }
svc.creditBalance('acct-1')                        // cents
```

`changePlan`, `changeSeats`, `changeSubscription` and `convertTrial` all return
`{ kind, effectiveFrom, invoice }`, where `invoice` is `null` when nothing is
due. Invoice shape is documented in `docs/billing-rules.md`.

## Conventions

- ESM only (`"type": "module"`), no dependencies. The service runs inside the
  billing container, which has no network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and may be reorganised; the names exported from `index.js` may not.
- Money is integer cents, always. Dollars only exist for display (`bin/`).
- Dates are ISO strings (`YYYY-MM-DD`) the caller passes in. Nothing in `src/`
  reads the clock: "now" is always an argument.
- Run the reproductions with `npm test`.

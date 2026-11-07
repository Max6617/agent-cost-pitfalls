# checkout-api

The order-path service. It fronts every external thing the company depends on —
the primary database, its read replica, the order cache, the search index, the
pricing service, the payment provider, the receipt store, the receipt emailer,
the experiment flags and the metrics sink — so that one provider having a bad
afternoon does not take the order path down with it.

```
config/service.config.json  dependencies, breaker tuning, route tables
docs/degraded-mode.md       the degraded-mode policy - treat as the contract
src/                        the implementation
test/                       reproductions; a subset of what the platform team checks
bin/operator.js             the console the on-call engineer uses during an incident
```

## Use

```js
import { createService, createClock, RESPONSES, makeTransport } from './src/index.js'

const clock = createClock(1_000)
const service = createService({
  clock,
  transports: {
    'db.primary': makeTransport(RESPONSES.ok({ account: 'acct-1' })),
    // ...one transport per dependency; a dependency with no transport is unavailable
  },
})

service.handle({ id: 'req-1', route: 'checkout', accountId: 'acct-1' }, { at: clock.at() })
service.markDegraded('payment.charges')
service.markHealthy('payment.charges')
service.isDegraded('db.replica')      // true while marked, or while its breaker is not closed
service.breakerState('db.primary')    // 'closed' | 'open' | 'half-open'
```

`handle()` returns the response described in `docs/degraded-mode.md` section 5:
the per-step record, the dependencies this request found degraded, and the
service's counters.

## Conventions

- ESM only, `"type": "module"`, no dependencies: the service runs in a container
  with no network and no package registry.
- **Nothing reads the wall clock and nothing sleeps.** The caller passes `at` on
  every entry point and the breaker measures elapsed time on the injected clock,
  so an incident is reproducible in a test.
- **Nothing is random.** A scenario is a clock, a route and a set of transports.
- Transports are injected, one function per dependency name. A transport answers
  with `{ ok: true, data }`, or with `{ ok: false, error }` / `{ ok: false,
  status, code }` when it is having a bad day, or it throws.
- `src/index.js` is the public surface. Everything else under `src/` is internal
  and can be reorganised; the surface cannot.

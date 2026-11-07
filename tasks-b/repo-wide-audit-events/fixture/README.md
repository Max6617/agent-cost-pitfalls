# shop

Back-office core for a small shop: accounts, inventory, pricing, orders and a
catalog, plus the audit log that support and compliance read.

```
docs/audit-convention.md   the audit convention every module signed up to - the contract
src/                       the implementation
src/index.js               the public surface (stable)
bin/report.js              prints the trail for a small demo session
test/                      reproductions support sent over; not the whole acceptance criteria
```

## Use

```js
import { createShop } from './src/index.js'

const shop = createShop()
const account = shop.accounts.create('rita', { name: 'Rita', email: 'rita@example.com', role: 'admin', passwordHash: 'hash:1' })
shop.inventory.register('rita', { sku: 'sku-100', name: 'Widget', onHand: 4, supplier: { name: 'Acme', unitCost: 41 } })
shop.pricing.set('rita', 'sku-100', { amount: 79, currency: 'USD', unitCost: 41 })

shop.audit.events()   // every event, oldest first
```

Run the reproductions with `npm test`.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  exporter and the support console import these files directly.
- No dependencies. The compliance exporter runs where there is no network and
  no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Ids are minted by the shared counter, so a given sequence of operations
  always produces the same ids. Nothing in the library reads the clock or a
  random source.
- Every mutation is audited. The convention lives in
  `docs/audit-convention.md`; when the code and that document disagree, the
  document is right and the code is a bug.

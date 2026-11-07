# parcel-quotes

Shipping-quote service for the checkout: given a parcel and a destination it
works out what we charge and which carrier carries it.

```
docs/pricing.md      the rules sales and logistics signed off - the contract
src/                 the implementation
src/data/            the country and carrier tables (plain modules, no I/O)
bin/quote.js         quote one parcel from the command line
test/                reproductions; a subset of what checkout checks
```

## Use

```js
import { quoteShipment } from './src/index.js'

const q = quoteShipment({
  country: 'DE',                          // ISO 3166-1 alpha-2
  actualWeightKg: 4,
  dimsCm: { length: 40, width: 30, height: 20 },
  fragile: true,
  discountPct: 10,                        // loyalty/promo percentage, optional
})
// q = { country, zone, dimWeightKg, billableWeightKg, oversize, carrier,
//       baseCents, discountCents, freightCents, surcharges, freeShipping,
//       totalCents }
```

`quoteShipment` returns `null` when we cannot serve the destination at all.

Every money figure is an **integer number of cents**. Weights are kilograms as
plain numbers; the billable weight is always a multiple of 0.5.

```sh
node bin/quote.js DE 4 40x30x20 --fragile --discount 10
npm test
```

## Conventions

- ESM only. `package.json` says `"type": "module"`; the checkout importer loads
  these files directly, do not change it.
- No dependencies. The service runs inside the checkout container, which has no
  network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Nothing here reads the clock, randomness or the filesystem. The same request
  must always produce the same quote.

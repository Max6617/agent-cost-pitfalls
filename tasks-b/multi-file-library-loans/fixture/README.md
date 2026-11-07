# library

The loan service behind the front desk: catalog, members, loans, renewals,
holds and fines.

```
docs/loan-rules.md   the rules the committee signed off - treat as the contract
src/                 the implementation
test/                reproductions; a subset of what the desk checks
```

## Use

```js
import { createLibrary } from './src/index.js'

const lib = createLibrary({ titles, copies, members })
const { loanId, dueAt } = lib.checkout('C-DUNE-1', 'M-ADA', '2026-03-02')
lib.renew(loanId)
lib.placeHold('T-DUNE', 'M-ELI', '2026-03-05')
lib.returnCopy(loanId, '2026-03-26')   // { ok, billCents, daysLate }
```

Every operation takes the date it happens on. Nothing in the service reads a
clock, so two runs over the same calls see the same world.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the desk
  client imports these files directly.
- No dependencies. The service runs on the desk terminals, which have no
  network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Money crosses the surface as integer **cents** (`250` is $2.50), never as
  fractional dollars, so amounts cannot pick up binary floating point error.
- Dates cross the surface as `'YYYY-MM-DD'` strings. Day arithmetic lives in
  `src/dates.js`; do not hand-roll it elsewhere.

## Tests

```
npm test     # node --test
```

# menu

The allergen engine behind the guest allergy letters and the floor tablets.

```
data/ingredients.json     every ingredient and the allergens it carries
data/dishes.json          the menu: ingredient entries + equipment stations
data/equipment.json       the shared-equipment trace matrix
data/substitutions.json   the day's ingredient swaps
docs/allergen-rules.md    the rules the kitchen signed off - the contract
src/                      the implementation
bin/menu-check.js         prints the board for a set of allergy ids
test/                     reproductions; a subset of what the letters check
```

## Use

```js
import { createMenu } from './src/index.js'

const menu = createMenu()                         // data from this checkout
const whatIf = createMenu({ substitutions: [] })  // overrides, for tests and what-if

menu.assess('satay', ['peanut'])   // { dish, status, contains, traces, matched, warnings }
menu.safeMenu(['dairy'])           // { safe: [...], warning: [...], excluded: [...] }
menu.assess('satay', ['peanut'], { includeOptional: true })  // as ordered, extras count
```

An override replaces the corresponding data file wholesale:
`{ substitutions: [] }` means no swaps are in force at all, not "the file's
swaps plus none".

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  letter job and the tablet build import these files directly.
- No dependencies. The tablet build has no network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Everything the service returns is deterministic: allergen and dish lists are
  alphabetical, and nothing reads a clock, a random source or the network.
- Run the reproductions with `npm test`.

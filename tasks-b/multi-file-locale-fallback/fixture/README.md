# messages

The i18n message service: key lookup with locale fallback, plural forms and
`{name}` interpolation, driven by bundles that are plain data modules.

```
docs/messages-rules.md   the agreed behaviour - treat as the contract
src/                     the implementation
src/data/                the bundles this checkout ships (en, fr, fr-CA, de)
bin/lookup.js            look up one key from the command line
test/                    reproductions; a subset of what the release checks
```

## Use

```js
import { createMessageService, builtinBundles } from './src/index.js'

const service = createMessageService({ bundles: builtinBundles, mode: 'lenient' })

service.t('app.title', { locale: 'fr-CA' })               // a string
service.t('cart.items', { locale: 'fr', n: 3 })           // plural + count
service.t('profile.greeting', { locale: 'en', values: { name: 'Ada' } })
service.effectiveBundle('fr-CA')                          // the merged view
```

A service runs in one **mode**: `'strict'` (the release build) or `'lenient'`
(the default, used while translating). What a mode does with a missing key or
a missing value is pinned in `docs/messages-rules.md`.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it.
- No dependencies. The service runs inside the render container, which has no
  network and no package registry.
- `src/index.js` is the public surface. Everything it re-exports is stable;
  everything else under `src/` is internal and can be reorganised.
- Bundles are data, not code: a flat map from message key to a string or a
  plural object. Ship a new locale by adding a data module, never by editing
  the service.
- `npm test` runs the reproductions under `test/`.

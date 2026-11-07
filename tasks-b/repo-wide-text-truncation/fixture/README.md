# relay

Internal notification fan-out. One payload is rendered to every surface the
user has enabled: an SMS message, a push notification, an email subject line,
a line in the service log, and a cell in the admin grid.

```
docs/truncation-policy.md   how every surface shortens text - the contract
src/policy.js               the numbers: limits, the ellipsis, the window
src/truncate.js             the shared truncator - the one implementation
src/surfaces.js             the registry of user-facing surfaces
src/                        the implementation
bin/preview.js              show how a text renders on each surface
test/                       reproductions; a subset of what is checked
```

## Use

```js
import { smsPreview, pushPreview, emailSubject, logLine, tableCell } from './src/index.js'

smsPreview('your parcel arrives tomorrow between 9 and 12')
pushPreview('payment of 24.00 EUR received')
```

Every surface shortens its text the same way - see `docs/truncation-policy.md`.
The admin grid pads cells AFTER they are shortened (`src/util/columns.js`); it
never cuts a cell itself.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  senders and the preview tool import these files directly.
- No dependencies. relay runs inside the notifications container, which has no
  network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the names exported from `index.js` cannot.
- `docs/truncation-policy.md` is the contract for how text is shortened. When
  code and document disagree, the document is right.

## Tests

```
npm test    # node --test
```

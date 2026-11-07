# templates

The template engine behind the notification and email service.

A template is a string with tags in it. `render()` walks the string, resolves
the tags against a data object, and returns the body the mailer sends.

```
config/notifications.json   service settings, including the partial depth limit
docs/template-rules.md      the rules the team signed off - treat as the contract
docs/notification-service.md  how the service calls the engine
src/                        the implementation
src/index.js                the public surface; everything else is internal
test/                       reproductions; a subset of what the service renders
bin/render-template.js      renders one template, for poking at the engine
```

## Use

```js
import { render, renderDetailed, compile } from './src/index.js'

render('Hello {{user.name}}', { user: { name: 'Ada' } })
render('Hi {{user.name}}', data, { partials: { signature: '-- the team' } })
renderDetailed(source, data, { partials })   // { output, diagnostics }

const welcome = compile(source)              // parse once, render per message
welcome(data)
```

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  service imports these files directly.
- No dependencies. The renderer runs inside the notification container, which
  has no network and no package registry.
- No filesystem access in `src/`. Partial templates are handed in as a map by
  the caller; the engine never goes looking for a file.
- `src/index.js` is the public surface. Its names and their meaning are fixed;
  everything under `src/` that is not re-exported there can be reorganised.
- Rendering is deterministic and side-effect free: no clock, no randomness, and
  a template rendered twice with the same data gives the same string.
- `docs/template-rules.md` is the contract. Where the code and the document
  disagree, the document is right.

## Tests

```
npm test          # node --test, runs everything under test/
```

The cases under `test/` are the reproductions we wrote down while chasing
reports from support. They are a subset of what the service actually renders and
of the rules in `docs/`.

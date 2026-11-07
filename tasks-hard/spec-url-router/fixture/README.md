# router

The request router the framework uses to turn a request line into a handler plus
its parameters. Patterns in, one matched route out; no clock, no I/O, no state
beyond the route table.

```
docs/routing-spec.md          the routing contract - treat it as the specification
config/router.config.json     what the demo app passes to `new Router(options)`
examples/routes.js            the demo app's route table
src/                          the implementation
bin/route-lint.js             prints the route table of examples/ and a sample match
test/                         reproductions; a subset of what the framework checks
```

## Use

```js
import { Router } from './src/index.js'

const router = new Router()
router.add('GET', '/users/:id', getUser)
router.add('GET', '/files/**rest', getFile)

const result = router.match('GET', '/users/42?page=2')
// {
//   matched: true,
//   method: 'GET',
//   path: '/users/42',
//   pattern: '/users/:id',
//   handler: getUser,
//   params: { id: '42' },
//   query: { page: '2' },
// }

if (result.matched) result.handler(result.params, result.query)
```

A request nothing serves comes back with `matched: false` rather than throwing,
so the framework's 404 handler is a branch, not a catch.

## Conventions

- ESM only. `package.json` says `"type": "module"`; the framework imports these
  files directly and does not transpile them.
- No dependencies. The router ships inside the framework, which has no network
  and no package registry at run time.
- `src/index.js` is the public surface. Everything else under `src/` is internal
  and can be reorganised; the names re-exported there cannot.
- Paths and patterns are plain strings. Nothing here reads the clock, the
  filesystem or a random source, and `match()` does not mutate the table, so the
  same router can be shared by every request handler.
- A pattern that the router cannot route is refused where it is registered, not
  where it is used: `add()` raises, `match()` only answers.

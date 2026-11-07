# query-engine

The in-memory query engine the reporting service embeds. It takes an array of
plain row objects and a query document, and returns one page of a report plus
the counts a report header needs.

```
config/report.config.json   page size and the export the CLI reads
data/orders.json            a small export, for the CLI and for what-if runs
docs/query-spec.md          the language as agreed - treat it as the contract
examples/top-regions.json   a saved report, to try the CLI with
src/                        the engine
test/                       reproductions; a subset of what the service checks
```

## Use

```js
import { runQuery } from './src/index.js'

const result = runQuery(rows, {
  where: { field: 'units', op: 'gte', value: 2 },
  group: { by: ['region'], aggregates: { orders: { op: 'count' } } },
  having: { field: 'orders', op: 'gt', value: 1 },
  select: ['region', 'orders'],
  order: [{ field: 'orders', dir: 'desc' }],
  offset: 0,
  limit: 25,
})
// { rows: [...], total: 3, count: 3, offset: 0, limit: 25 }
```

`runQuery(rows, query)` never modifies `rows` or the query, and it is pure: the
same rows and the same query always produce the same result. A query the
language does not accept raises a `QueryError` carrying a `code` and the `path`
of the offending part of the document.

## CLI

```sh
node bin/report.js examples/top-regions.json --page 1
```

## Conventions

- ESM only, `"type": "module"`, zero dependencies. The service container has no
  network and no package registry, and the engine is small enough not to need
  either.
- `src/index.js` is the public surface: the reporting service imports that and
  nothing else under `src/`. Everything else is internal and can be reorganised.
- Values are what the export held. The engine does not coerce: `3` and `'3'` are
  different values, a missing field is not a `null` one, and string comparison
  is by code unit rather than by the host's locale.
- Deterministic by construction: no clock, no randomness and no locale data are
  read anywhere in `src/`, so two runs over the same rows agree.
- `docs/query-spec.md` is normative. A disagreement between it and `src/` is a
  defect in `src/`.

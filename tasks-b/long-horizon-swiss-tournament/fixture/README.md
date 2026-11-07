# swiss

The league's Swiss-system tournament service: registration, round draws,
result entry and the table.

```
docs/tournament-rules.md   the rules the committee signed off - treat as the contract
src/                       the implementation
test/                      reproductions; a subset of what the league office checks
```

## Use

```js
import { createTournament } from './src/index.js'

const t = createTournament()
t.register({ id: 'a', name: 'Ada', rating: 2400 })

t.pairRound()                      // { round: 1, pairings: [{ board, white, black }], bye }
t.report({ white: 'a', black: 'b', result: '1-0' })
t.report({ white: 'c', black: 'd', result: '0-1', forfeit: true })

t.standings()                      // [{ rank, id, name, rating, score, buchholz, byes, forfeits, status }]
t.players()                        // [{ id, name, rating, status }]
```

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  results desk imports these files directly.
- No dependencies. The service runs in the league's scoring container, which
  has no network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Scores and tie-breaks are plain numbers. Every value is a whole or half
  point, so nothing is ever lost to floating point.
- Fully deterministic. The service never reads a clock or a random source;
  the same entries in the same order always produce the same table.

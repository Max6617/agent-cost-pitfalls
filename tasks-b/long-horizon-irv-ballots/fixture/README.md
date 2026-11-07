# tallyboard

Ranked-choice (instant-runoff) tally service. Ballots arrive over the course
of a campaign; the count is read on demand and is fully deterministic.

```
bin/tally.js            a demo count: node bin/tally.js
docs/tally-rules.md     the rules the returning officers signed off - the contract
src/                    the implementation
test/                   reproductions; a subset of what the count is checked against
```

## Use

```js
import { createElection } from './src/index.js'

const election = createElection({ candidates: ['ada', 'bob', 'cy', 'di'] })

election.addBallot({ id: 'b-1', ranks: ['ada', 'bob'] })   // { id, status }
election.addBallots(moreBallots)                           // [{ id, status }, ...]

election.ballotCount()   // accepted ballots so far
election.tally()         // { winner, rounds } - see docs/tally-rules.md
```

Run the tests with `npm test`.

## Conventions

- ESM only. `package.json` says `"type": "module"`; the ingester and the
  results board import these files directly.
- No dependencies. The service runs inside the count container, which has no
  network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- No clocks, no randomness: the same ballots in, the same winner out, on any
  machine, in any arrival order.

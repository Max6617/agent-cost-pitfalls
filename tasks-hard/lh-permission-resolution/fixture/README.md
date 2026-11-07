# authz

The authorization service behind the platform control plane. Every API gateway,
the deploy bot and the audit console ask this package the same question — *may
subject S perform action A on resource R* — and render the explanation it hands
back.

```
config/authz.config.json   cache limit, log level
data/policy.json           the policy of record (subjects, groups, roles, rules)
docs/policy-format.md      the shape of that document
docs/authorization-rules.md  the rules the platform team agreed - the contract
src/                       the implementation
bin/authz.js               a CLI for poking at a decision by hand
test/                      reproductions; a subset of what the gateway checks
```

## Use

```js
import { createEngine, matches } from './src/index.js'

const engine = createEngine()                       // the policy of record
const other = createEngine({ subjects: [...], ... }) // a document of your own
// createEngine(document) never mutates the document you hand it.

const decision = engine.authorize('u-anna', 'project.read', 'project/42')
// {
//   allowed: true,
//   effect: 'allow',
//   rule: 'p-101',                                    // the rule that decided it
//   path: ['u-anna', 'g-platform', 'g-engineering', 'r-reader', 'p-101'],
//   reason: 'allowed',                                // allowed | explicit-deny | no-matching-rule
// }

engine.effectiveRoles('u-anna')   // ['r-deployer', 'r-operator', 'r-reader'], ascending
engine.grant({ id: 'p-900', role: 'r-reader', effect: 'allow', action: 'project.read', resource: 'project/9' })
engine.revoke('p-900')
engine.addMember('u-anna', 'g-audit')
engine.removeMember('u-anna', 'g-audit')
engine.stats()                    // { decisions, cacheHits, cacheSize }

matches('project/*', 'project/42')  // true - see docs/authorization-rules.md
```

```powershell
npm test
node bin/authz.js 'u-anna' project.read project/42
```

## Conventions

- ESM only. `package.json` says `"type": "module"`; the gateway imports these
  files directly and there is no build step.
- No dependencies. The service runs in a network-less container.
- `src/index.js` is the public surface: `createEngine`, `Engine`, `matches`,
  `buildGraph`, `loadPolicy` and `AuthzError`. Everything else under `src/` is
  internal and may be reorganised freely; those exports may not change shape.
- The engine never reads the clock and never uses a random source: two runs over
  the same document give byte-identical decisions.
- `docs/authorization-rules.md` is the contract. Where the code and the document
  disagree, the document is right and the code is a bug.

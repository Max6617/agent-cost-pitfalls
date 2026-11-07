# approvals

The document-approval service: a document is submitted against a flow and
collects sign-off tier by tier. A tier is either one named approver or a
quorum pool that needs k of its n members. Decisions can be delegated,
tiers carry deadlines with escalation, a veto ends the document, and a
rejected document can be sent round again.

```
docs/approval-rules.md   the rules the team signed off - treat as the contract
src/                     the implementation
test/                    reproductions; a subset of what sign-off checks
```

## Use

```js
import { createApprovalService } from './src/index.js'

const svc = createApprovalService()

svc.defineFlow({
  id: 'contract-signoff',
  tiers: [
    { id: 'legal', approver: 'alice', deadline: '2024-06-05T09:00:00Z' },
    { id: 'board', members: ['bob', 'carol', 'dan'], k: 2, deadline: '2024-06-10T09:00:00Z' },
    { id: 'cfo', approver: 'erin', deadline: '2024-06-15T09:00:00Z' },
  ],
})

svc.submit('doc-1', 'contract-signoff', { at: '2024-06-01T09:00:00Z' })
svc.decide('doc-1', { actor: 'alice', action: 'approve', at: '2024-06-02T09:00:00Z' })
svc.delegate('doc-1', { from: 'bob', to: 'frank', at: '2024-06-03T09:00:00Z' })
svc.expire('doc-1', { at: '2024-06-11T09:00:00Z' })   // process the expiry event
svc.restart('doc-1', { at: '2024-06-12T09:00:00Z' })  // only after a rejection
svc.status('doc-1')                                  // a plain snapshot
```

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  intake jobs import these files directly.
- No dependencies. The service deploys into a container with no network and
  no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Time is always passed in. Every call that needs "now" takes it as `at`, an
  ISO-8601 UTC string; nothing in here reads a clock. All timestamps are
  `...Z` UTC, so string order is time order.
- When the code and `docs/approval-rules.md` disagree, the doc is right and
  the code is a bug.

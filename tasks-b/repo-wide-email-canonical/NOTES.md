# repo-wide-email-canonical

stratum: repo-wide

## sub-problems

| file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-accounts` | match/de-duplicate accounts by the canonical form | `accounts.js` folds only the domain to lowercase; local case, tag and dots all stay in the key |
| `02-invites` | dots are significant unless the canonical provider row ignores them | `invites.js` strips dots from the local part for every domain |
| `03-newsletter` | one subscription per identity; the tag is never part of identity | `newsletter.js` keeps the `+tag` in the subscriber key |
| `04-support` | one thread per identity, however the address was typed | `support.js` keys threads by the raw (trimmed) string |
| `05-billing` | the identity index follows an address update | `billing.js` canonicalises correctly but `updateEmail` never touches the index, so the old address keeps resolving and the new one never does |

The work is sweeping every identity-touching module onto the shared
`emailkit.js` (which implements docs/email-rules.md §3 correctly) without
breaking display preservation — every record keeps the address exactly as
typed, and several cases assert it.

## guards (pass on the untouched fixture)

- `the display address is kept as typed` (01) — an agent that "fixes" accounts
  by storing the canonical form breaks it
- `an invite is accepted by the exact address and leaves the pending list` (02)
- `subscribe then unsubscribe with the same address` (03)
- `two tickets from the identical address share a thread` (04)

## interaction cases (two rules at once, or behaviour the visible suite never touches)

- `alias domain, dots, tag and case all resolve to one account` (01)
- `case folds and dots stay on a dotted provider-free address` (02)
- `an alias keeps its dots when the canonical provider does` (02)
- `tag, dots, alias and case together still name one subscriber` (03)
- `tag, dots and alias resolve to one thread` (04)
- `surrounding whitespace does not split a thread, and display is untouched` (04)
- `only the latest address resolves after two updates, and an invalid update changes nothing` (05)
- `an updated address is matched canonically, dots and all` (05)

## measured

- untouched fixture: 4/23 hidden cases = 17% (exactly the four guards); visible 2/10 pass, exit 1
- reference: 23/23 hidden cases = 100%; visible 10/10 pass, exit 0
- visible suite: fails before (8 of 10 cases red), passes after
- gate: `node tasks-b/_tools/verify-task.mjs repo-wide-email-canonical` prints `ok`
  (fixture 17 text files / 564 lines; reference changes 5 source files)

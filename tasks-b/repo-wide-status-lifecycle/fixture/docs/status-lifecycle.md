# Status lifecycle

One lifecycle covers every record in flowdesk — orders, tickets,
subscriptions and shipments all carry the same `status` field with the same
vocabulary and the same allowed moves. This document is the contract: where
a board and this document disagree, the board is wrong.

## Canonical statuses

| status | meaning |
|---|---|
| `open` | arrived, not yet looked at |
| `triaged` | reviewed, not yet started |
| `in-progress` | actively being worked |
| `on-hold` | paused; expected to resume |
| `resolved` | the work is done, pending confirmation |
| `closed` | confirmed done |
| `reopened` | came back after resolution; flows like new work |
| `cancelled` | abandoned; final |

A record created without a status starts at `open`.

## Allowed transitions

| from | may move to |
|---|---|
| `open` | `triaged`, `cancelled` |
| `triaged` | `in-progress`, `on-hold`, `cancelled` |
| `in-progress` | `on-hold`, `resolved`, `cancelled` |
| `on-hold` | `in-progress`, `cancelled` |
| `reopened` | `triaged`, `in-progress`, `cancelled` |
| `resolved` | `closed`, `reopened` |
| `closed` | `reopened` |
| `cancelled` | — (nothing; cancelled is final) |

Any move not in this table is illegal. Note what that means in practice:
`open` cannot skip ahead to `resolved`; the only way back out of `closed` is
through `reopened` — never straight to `open`; a held record resumes at
`in-progress`; and nothing at all leaves `cancelled`.

## Legacy spellings

Older exports spelled some statuses differently. The mapping is fixed:

| legacy spelling | canonical status |
|---|---|
| `new` | `open` |
| `assessed` | `triaged` |
| `wip`, `dispatched`, `shipped` | `in-progress` |
| `paused`, `held` | `on-hold` |
| `done`, `complete` | `resolved` |
| `shut`, `archived` | `closed` |
| `reopen` | `reopened` |
| `void`, `dropped` | `cancelled` |

The rule is **legacy accepted on read, canonical emitted on write**:

- *Read* is any status string entering the system: the status a record is
  added with, the target of a transition, a list filter, an entry in an
  export handed to the rollup. A legacy spelling there means its canonical
  status.
- *Write* is any status string leaving the system: what is stored on the
  record, what `get`/`list`/`all` return, the buckets the rollup counts
  under, the `from`/`to` carried by an error. Those are always the canonical
  spelling. No board ever emits a legacy spelling.

## Errors

- A status string that is neither canonical nor a known legacy spelling is
  refused with an `UnknownStatusError`: `name` of `UnknownStatusError`,
  `code` of `unknown-status`, and a `status` field carrying the offending
  string.
- An illegal move is refused with an `IllegalTransitionError`: `name` of
  `IllegalTransitionError`, `code` of `illegal-transition`, and `from`/`to`
  fields carrying the **canonical** statuses, even when the caller used a
  legacy spelling for the target.
- A refused transition changes nothing: the record keeps the status it had.

## The weekly rollup

`summarise(statuses)` takes the status strings from an export — any mix of
canonical and legacy spellings, from any board — and returns an object:

```js
{ counts: { 'in-progress': 2, open: 1 }, active: 3, total: 3 }
```

- `counts` is keyed by canonical status and has an entry for every status
  that occurred — no zero entries.
- `total` is the number of records summarised.
- `active` counts the records still in play: everything except `closed` and
  `cancelled`.

# Ledger rules

The rules finance signed off for the close. `src/` is the implementation; when the
two disagree, this document is right and the code is a bug.

## 1. The journal

A journal entry is a plain object:

```js
{
  id: 'e-0007',              // unique, stable, assigned by the importer
  seq: 7,                    // tie-break inside one effectiveDate, ascending
  effectiveDate: '2024-01-31',
  account: '4100',
  kind: 'charge',            // charge | payment | reversal
  amount: { currency: 'EUR', value: '120.00' },
  idempotencyKey: 'imp-2024-01#7',   // optional
  reverses: 'e-0004',                // required when kind === 'reversal'
}
```

`charge` increases the account balance, `payment` decreases it. Both are stated as
a positive `value`; the direction comes from `kind`, never from the sign.

`amount.value` is a decimal string in `amount.currency`. Amounts are exact
decimals: they never pass through binary floating point, and a value written as
`0.1` plus a value written as `0.2` is `0.3`, not `0.30000000000000004`.

## 2. Order of application

Entries are applied in **canonical order**: ascending `effectiveDate`, then
ascending `seq`, then `id`. This is the only order that matters — the order they
were posted in, and the order they appear in an import file, are both irrelevant.
Two ledgers holding the same entries have the same balances whatever route the
entries took to get there.

## 3. Periods

A period is `YYYY-MM`. A report **as of** a date includes every entry whose
`effectiveDate` is on or before that date (inclusive: an entry dated the 31st is
in the report as of the 31st). With no `asOf`, every entry counts.

`periodTotals('2024-01')` is the balance of the whole book for that period, and it
must reflect the journal as it stands when it is called. Nothing in the ledger may
serve a total that a later post has invalidated.

## 4. Idempotency

An entry carrying an `idempotencyKey` is applied **once**, ever. A second entry
with the same key is refused with status `duplicate` and has no effect, whether it
arrives in the same batch, in a later batch, or after other entries. Keys are
compared across the whole journal, not just against the entry before.

An entry with no `idempotencyKey` is always applied.

`id` is assigned by the importer and is stable for the life of the entry, so an
entry whose id is already in the journal is that same entry arriving again: it is
refused with status `duplicate` as well. Nothing is journalled twice.

## 5. Reversals

`kind: 'reversal'` negates the entry named by `reverses`, and it is attributed to
**that entry's own `effectiveDate`** — not to the period of the reversal itself,
and not to the period the named entry's own correction landed in. Undoing a
January charge therefore changes the January report, whenever the reversal is
posted; and a reversal of a March reversal belongs to March, even though that
March reversal was itself attributed to January.

A reversal converts at the **original entry's rate**, so a reversal always cancels
its target exactly, even after the rate table has been republished.

Statuses:

| situation | status | effect |
|---|---|---|
| target exists, not yet reversed | `reversal` | negates the target |
| target already reversed | `already-reversed` | nothing |
| target id is not in the journal | `orphan-reversal` | nothing |
| a reversal reverses another reversal | `reversal` | negates it, i.e. restores the charge |

A reversal of an entry that lies after the report date is not in that report
either.

## 6. Currency

Every balance is reported in the base currency (`config/ledger.config.json`,
currently USD). An entry in another currency is converted at the rate **published
for that entry's effectiveDate**: the latest rate whose `from` date is on or
before it. A rate published later never restates an earlier entry.

The base currency itself is never looked up in the rate table — one USD is one
USD.

If no rate has been published for the entry's date, the entry is refused with
status `no-rate` and the journal is unchanged by it.

## 7. Rounding

Balances are exact decimals until they are *reported*: `balance()`, `statement()`
and `periodTotals()` round half-up, away from zero, to two decimals **once**, on
the exact sum. Rounding each entry and adding the rounded values is wrong and the
close has been restated over it twice.

Half-up is on the exact decimal value, not on the nearest double: `2.675` rounds
to `2.68`, `1.005` to `1.01`, `-0.005` to `-0.01`. A rounded zero is written
`0.00`, never `-0.00`.

## 8. Accounts and the statement

`data/accounts.json` is a tree. An account's balance is its own, and a **parent's
balance is the sum of every descendant**, at any depth, not just its immediate
children.

An account marked `internal: true` — the intercompany clearing accounts — is
excluded from the statement by default; `statement({ includeInternal: true })`
includes it. Internal means internal for the whole subtree below it.

`statement()` reports one line per root account, omitting zero lines, and the
total is the sum of the lines it reports. The statement foots.

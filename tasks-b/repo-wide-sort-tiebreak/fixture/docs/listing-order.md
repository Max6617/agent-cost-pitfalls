# Listing order

The one order every listing in the product uses, agreed before any of the
screens were written. `src/` is the implementation; when the two disagree,
this document is right and the code is a bug.

## 1. The listable row

Every row a listing can show carries three ordering keys:

```js
{
  id: 'ord-0417',                  // string, unique, assigned at intake, never null
  priority: 4,                     // integer, or null when nobody has triaged the row
  createdAt: '2024-01-17T09:30:00Z', // ISO-8601 string, or null on legacy imports
  // ...whatever else the screen needs (title, status, total, body, ...)
}
```

`priority` is a number where a **bigger number means more urgent**: 5 outranks
1. It is not a "P1-first" ticket number.

`createdAt` is stamped when the row enters the system and is **data, not the
clock**. Listing code never calls `Date.now()` or `new Date()`; two runs over
the same rows produce the same listing, today and next quarter.

## 2. The order

Every listing — the board, the queue, the directory, search results, the
console — is sorted by exactly these keys, in this order:

1. **`priority` descending** (most urgent first),
2. then **`createdAt` ascending** (oldest first — the row that has waited
   longest leads its band),
3. then **`id` ascending**, as the final decider.

The id key is not optional. Rows routinely share a priority and a creation
timestamp (batch imports stamp a whole file at once), and without the id
decider the order of those rows depends on the order they happened to arrive
in. **A listing must never depend on arrival order**: the same rows, handed in
shuffled, come out identical.

**Nulls sort last in every key**, in both directions. An untriaged row
(`priority: null`) sits below every prioritised row; a legacy row
(`createdAt: null`) sits at the bottom of its priority band, after every dated
row. Nulls do not float to the top, and "last" does not flip to "first"
because the key happens to sort descending.

## 3. Listings are pure

A listing **returns a new array** and never reorders, or otherwise touches,
the array it was handed. Callers keep their arrays around — the indexer hands
the same batch to several screens, and an audit trail reads the batch in
arrival order afterwards. Sorting the caller's array in place has corrupted
that trail once already.

## 4. Search

The search box filters first, then orders. A row matches a query when the
query, trimmed and lower-cased, is a substring of the row's `title` **or** its
`body` (both compared lower-cased; a missing field never matches). An empty or
all-whitespace query matches every row. What survives the filter is then
ordered by §2, exactly like any other listing — nulls, ties and all.

## 5. The shared comparator

`src/ordering.js` exports `compareListable(a, b)` and `sortListable(rows)`,
the agreed implementation of §2 and §3. New screens must use it instead of
hand-rolling another sort. The existing screens predate it, which is how the
orders drifted apart; bringing a screen back onto the shared comparator is the
normal way to fix a divergent one.

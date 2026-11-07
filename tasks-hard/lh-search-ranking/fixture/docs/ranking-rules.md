# Ranking rules

The rules the search API was signed off against. `src/` is the implementation;
where the two disagree this document is right and the code is the bug.

## 1. Fields

A document is a plain object: a string `id`, unique and stable for the life of
the document, and a string value for each field in `config/index.config.json`.
A missing or non-string field reads as the empty string. Fields are indexed in
the order the config lists them.

Field boosts, from the same config:

| field | boost | holds |
|---|---|---|
| `title` | 3 | the document's name |
| `tags` | 2 | space separated labels |
| `body` | 1 | the text |

## 2. Analysis

Both indexed text and query text are **folded** and then split into terms:

- **Folding** lower-cases the ASCII range and strips diacritics, so `Café`,
  `café` and `CAFE` are all the term `cafe`. Folding is a fixed table
  (`src/fold.js`); the runtime has no ICU data and no locale behaviour may leak
  into it. Folding is `ß` to `ss` and `æ` to `ae`; characters outside the table
  are passed through unchanged.
- **Terms** are maximal runs of letters and digits. Digits stay with the letters
  they touch, so `v2` is one term and `3.5` is two (`3` and `5`). Every other
  character separates terms, and a character that is neither ASCII nor in the
  folding table counts as a letter, so an accented word is never split.
- **Positions** are the 0-based index of a term within its field, in the order
  the terms appear. Adjacency is defined on positions inside one field.
- The same folding and the same term rule apply on both sides of the index: a
  term that was indexed must be found by every query that folds to it.

### Stopwords

The stopword list lives in `config/index.config.json`. It is applied **when a
query is analysed and never when a document is indexed**:

- indexed text keeps its stopwords, so document lengths, term positions, term
  frequencies and document frequencies all count them;
- a bare query term that is a stopword is dropped, so searching for `the` alone
  matches nothing;
- the terms inside a quoted phrase are **not** filtered, because dropping one
  would change which positions have to be adjacent. `"in the wild"` is a phrase
  of three terms.

## 3. What matches

A query is a list of clauses (see `docs/query-syntax.md`).

A **term clause** matches every document whose indexed text contains that term.

A **phrase clause** matches a document when its terms occur consecutively, in
order, with no gap, **inside one field**. A phrase whose terms are split across
two fields does not match; neither does a phrase whose terms appear in the
document in a different order or with another term between them.

A **negated clause** excludes every document that matches the clause as
written, whether or not it also matched a positive clause. A negated term
excludes documents whose indexed text contains that term: `-cat` excludes a
document that says `cat` and keeps one that says `concatenate`.

## 4. The result set

- A query with at least one positive clause matches the documents that satisfy
  at least one of them, minus the documents excluded by the negated clauses.
- A query with **no positive clauses at all** (`-draft`, or `-draft -private`)
  matches every document that is not excluded.
- A query that analyses to no clauses at all - the empty string, whitespace, or
  only stopwords - matches nothing. It is not an error: `total` is 0 and `hits`
  is empty.
- A term that no document contains matches nothing, and a query for it is not
  an error.

## 5. Score

Only positive clauses contribute to the score, and every clause contributes the
weight of each of its terms. Identical clauses are collapsed when the query is
parsed, so `alpha alpha` scores exactly like `alpha`.

For a document `d`, a clause term `t` and a field `f`:

```
tf(t,f,d)   occurrences of t in field f of d
boost(f)    the field's boost, from config
len(d)      the total number of indexed terms in d, over all its fields
avgLen      the mean of len(d) over all live documents
k1, b       the scoring constants, from config (1.2 and 0.75)

saturate(x) = x / (x + k1)
norm(d)     = 1 - b + b * len(d) / avgLen        (1 when avgLen is 0)

raw(t,d)    = ( sum over fields f of  boost(f) * saturate(tf(t,f,d)) ) / norm(d)

idf(t)      = ln(1 + (N - df(t) + 0.5) / (df(t) + 0.5))
              N      the number of live documents
              df(t)  the number of live documents whose indexed text contains t

score(d)    = sum over clause terms t of  idf(t) * raw(t,d)
```

Two consequences that the API is checked against:

- the boost multiplies the term's field frequency **before** the length
  normalisation, so a term that appears in two fields is worth the sum of those
  two contributions, not the contribution of its strongest field;
- `df` is the number of *documents* that contain the term, never the number of
  fields it was found in and never the size of the collection. A term that
  occurs in every document carries almost no weight and a term that occurs in
  one carries a lot, which is what makes a rare word decide a ranking.

## 6. Order

Results are ordered by descending `score`. Documents whose scores are equal are
ordered by ascending `id`, comparing the id strings character by character.

The order is a function of the documents and the query alone. It does not
depend on the order documents were added in, on the order they were updated, or
on anything that happened to the index earlier: two indexes holding the same
documents answer the same query in exactly the same order, and a document that
is removed and added again does not move relative to its equals.

## 7. Paging

`search(query, { limit, offset })` returns

```js
{ query, total, limit, offset, hits: [{ id, score }, ...] }
```

- `total` is the number of documents that match the query, not the length of
  the page. It does not change when `limit` or `offset` change.
- `offset` is a count of **hits to skip**, not a count of pages: `offset: 1`
  with `limit: 5` returns the second to sixth hits of the full order.
- `hits` is the slice of the full ordering starting at `offset`, and paging
  through with `offset` stepping by `limit` returns every hit exactly once, in
  the same relative order.
- `limit` defaults to `paging.defaultLimit` and is clamped to between 1 and
  `paging.maxLimit`; `offset` defaults to 0 and is clamped to 0 or more.
  Non-integer values are truncated. An `offset` past the end of the result set
  is an empty page with the full `total`.

## 8. Keeping the index up to date

`add(doc)` writes a document; an `id` that is already present is replaced, and
the document that was there before stops being searchable - every field of it,
including the terms no other document has.

`update(id, patch)` merges the given fields into the stored document and
re-indexes it. `remove(id)` deletes it. Both return a boolean: `false` when the
id is not in the index, and then nothing changes. Adding a document without a
usable string `id` is a `TypeError`.

The derived state is never stale:

- `stats().documents` is the number of live documents, `stats().terms` is the
  number of distinct terms the index holds postings for, and
  `stats().averageLength` is the mean length of the live documents right now.
  Reading the stats does not freeze them: a document added afterwards changes
  all three.
- `documentFrequency(term)` counts live documents, so a term stops existing as
  soon as the last document mentioning it is removed or updated away: its
  postings are dropped, it disappears from `stats().terms`, and it stops
  affecting `idf`.

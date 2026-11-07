# Query syntax

What `search(query, options)` accepts, and what `parseQuery(query)` returns for
tooling that wants the clauses without running them.

## Clause syntax

| written | clause |
|---|---|
| `alpha` | term |
| `"alpha beta"` | phrase |
| `-alpha` | negated term |
| `-"alpha beta"` | negated phrase |

- Terms are separated by anything that is not a letter or a digit, so
  `state-of-the-art` is four terms and `node.js` is two.
- `-` negates the clause that follows it immediately, when it stands at the
  start of a clause: at the beginning of the query or after a separator. A `-`
  inside a term is just a separator, so `state-of-the-art` is the terms
  `state`, `of`, `the` and `art`, two of which the stopword list then drops.
  A `-` followed by whitespace, by another `-`, or by the end of the query is an
  ordinary separator as well and means nothing.
- A quote opens a phrase; it is closed by the next quote. An unterminated quote
  runs to the end of the query (`"quick brown` is the phrase `quick brown`).
  A quoted phrase with no terms in it - `""` - produces no clause.
- Stopwords are dropped from term clauses, negated ones included, so `-the` is
  a query with no clauses in it. Stopwords inside a phrase are kept.
- Identical clauses are collapsed, and if a term is written both ways the
  negated clause wins: `alpha -alpha` is one negated clause.

## `parseQuery`

```js
parseQuery('lighthouse "keeper\'s log" -draft')
// {
//   clauses: [
//     { kind: 'term',   text: 'lighthouse', negated: false },
//     { kind: 'phrase', tokens: ['keeper', 's', 'log'], negated: false },
//     { kind: 'term',   text: 'draft', negated: true },
//   ],
// }
```

A clause is either

```js
{ kind: 'term',   text: 'lighthouse', negated: false }
{ kind: 'phrase', tokens: ['quick', 'brown'], negated: false }
```

and `clauses` keeps the order the clauses were written in. `parseQuery('')`,
`parseQuery('the of and')` and `parseQuery('""')` all return `{ clauses: [] }`.

Clause text is already analysed: the terms in a clause are folded the same way
indexed text is, and a phrase's `tokens` are the folded terms whose adjacency is
required.

## Examples

| query | matches |
|---|---|
| `lighthouse` | documents whose indexed text contains `lighthouse` |
| `lighthouse keeper` | documents containing either term, ranked by score |
| `"lighthouse keeper"` | documents where the two terms are adjacent, in that order, in one field |
| `lighthouse -draft` | documents containing `lighthouse` and not containing `draft` |
| `-draft` | every document that does not contain `draft`, in id order |
| `the` | nothing: `the` is a stopword and the query has no clauses |
| `` (empty) | nothing |

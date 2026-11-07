# Slug rules

The rules the site agreed for turning a title into a slug. `src/` is the
implementation; when the two disagree, this document is right and the code is
a bug.

A slug is a lowercase ascii string of words joined by single hyphens —
`the-rain-in-spain`. It is what goes in the URL.

## 1. The pipeline

`slugify(title, options)` produces a slug in this order:

1. **fold** accents (§2)
2. **lowercase** and split into **words** (§3)
3. **drop stopwords** (§4)
4. **join** the words with single hyphens
5. **fit to length** (§5)
6. **deduplicate** against the slugs already in use (§6)

Each step sees the output of the one before it. Length fitting runs on the
joined slug, after stopwords have been dropped; deduplication compares
against the fitted slug.

A title with no words in it — `---`, or an empty string — slugs to the empty
string. The empty slug is never suffixed.

## 2. Folding

Accented characters fold to ascii according to this table. The table is the
whole folding: a character that is not listed here does not fold, and no
other normalisation is applied. Capitals fold the same way as small letters
(`È` → `E`), and the lowercase step that follows takes them the rest of the
way.

| becomes | characters |
|---|---|
| `a` | à á â ã ä å |
| `c` | ç |
| `d` | đ |
| `e` | è é ê ë |
| `i` | ì í î ï |
| `l` | ł |
| `n` | ñ |
| `o` | ò ó ô õ ö ø |
| `u` | ù ú û ü |
| `y` | ý ÿ |
| `ae` | æ |
| `oe` | œ |
| `ss` | ß |
| `th` | þ |

Note that some characters fold to more than one: `Straße` folds to `Strasse`
before it ever reaches the lowercase step, and `æ` becomes the two letters
`ae`.

## 3. Words and separators

After folding, the text is lowercased and split into words. A word is a
maximal run of the characters `a`–`z` and `0`–`9`. **Everything else is a
separator**, and any run of separators collapses to a single hyphen when the
words are joined. A slug therefore never contains two hyphens in a row, and
never begins or ends with one.

| title | slug |
|---|---|
| `Hello, World!` | `hello-world` |
| `  spaced   out  ` | `spaced-out` |
| `well-known` | `well-known` |
| `one,two,three` | `one-two-three` |
| `don't stop` | `don-t-stop` |
| `4.2 scores` | `4-2-scores` |

## 4. Stopwords

The pinned list: `a an and as at but by for in of on or the to with`.

A stopword is dropped only when it sits **strictly between two other words**
of the title. The first and the last word are always kept, stopword or not —
a slug should still read as the title it came from.

| title | slug |
|---|---|
| `cats and dogs` | `cats-dogs` |
| `the rain in spain` | `the-rain-spain` |
| `the sound of` | `the-sound-of` |
| `the and the` | `the-the` |

## 5. Length

`options.maxLength` caps the slug's length; the default is **60**. A slug
that fits is returned unchanged.

A slug that does not fit is cut at the last hyphen at or before the limit —
the hyphen itself goes with the cut, so the result never ends in one and no
word is ever cut in half. If there is no hyphen at or before the limit, the
slug is hard-cut at the limit.

| slug | limit | result |
|---|---|---|
| `alpha-beta-gamma` | 12 | `alpha-beta` |
| `alpha-beta-gamma` | 11 | `alpha-beta` |
| `alpha-beta-gamma` | 5 | `alpha` |
| `abcdefghij-klm` | 8 | `abcdefgh` |

## 6. Deduplication

`options.existing` is the list of slugs already in use. If the fitted slug is
taken, a numeric suffix is appended: `-2`, `-3`, and so on, the first free
number winning. Comparison is exact, against the fitted slug: `foo` with
only `foo-2` in use is free and stays `foo`.

| slug | in use | result |
|---|---|---|
| `release-notes` | `release-notes` | `release-notes-2` |
| `release-notes` | `release-notes`, `release-notes-2` | `release-notes-3` |
| `foo` | `foo-2` | `foo` |

The suffix is appended after fitting and does not count against the length
limit. Nothing is remembered between calls: the same inputs always produce
the same slug.

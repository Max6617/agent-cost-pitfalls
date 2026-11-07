# Message rules

The behaviour the language team and the release team agreed. `src/` is the
implementation; when the two disagree, this document is right and the code is
a bug.

## 1. Locale tags

A locale tag is one or more `-`-separated segments: a language, then an
optional script and/or region (`fr`, `fr-CA`, `zh-Hant-TW`). Tags match
case-insensitively; the canonical form is the language in lowercase, a
four-letter script in title case, and anything else in uppercase
(`FR-ca` is `fr-CA`, `zh-hant-tw` is `zh-Hant-TW`).

## 2. Fallback chains

`fallbackChain(tag, defaultLocale = 'en')` is the ordered list of locales a
lookup walks for `tag`. It is the tag itself, then the tag with one segment
dropped at a time, then the default locale last if it is not already in the
list:

- `fr-CA` → `['fr-CA', 'fr', 'en']`
- `zh-Hant-TW` → `['zh-Hant-TW', 'zh-Hant', 'zh', 'en']`
- `en` → `['en']`
- `de-AT` with default locale `fr` → `['de-AT', 'de', 'fr']`

A lookup takes the **first** locale in the chain whose bundle defines the key.
A chain link with no registered bundle is skipped: asking for `fr-CA` when
only `fr` and `en` are registered still reaches the `fr` translations. A
registered bundle that simply does not define the key is not the end of the
walk either - the walk continues to the next link.

## 3. Bundles and merging

A bundle is a flat map from message key to a value. A value is either a
string or a **plural object**: `{ zero?, one?, other? }`.

`effectiveBundle(locale)` is the merge of every bundle in the locale's
fallback chain, least specific first. The merge is **per key**: a locale
overrides exactly the keys it defines and inherits the rest. A plural object
is one value: if a child locale defines `cart.items`, its object replaces the
parent's whole object for that key - the two objects are never merged field
by field.

## 4. Plurals

The plural **category** of a count `n` (a non-negative integer) comes from
the locale's rule, and the rule is chosen by the **language** subtag - a
region never changes it, so `fr-CA` uses the `fr` rule:

| language | `one` | `other` |
|---|---|---|
| `en` | n = 1 | everything else |
| `fr` | n = 0 or 1 | n ≥ 2 |
| `de` | n = 1 | everything else |

A language with no row uses the default rule (`one` when n = 1).

Selecting the text for a plural object:

1. An explicit `zero` entry wins whenever n = 0, in every locale.
2. Otherwise the locale rule picks the category.
3. If the object has no text for the picked category, `other` is used.
4. If there is no `other` either, the key counts as missing (§6).

Looking a plural object up without `n` uses its `other` form.

When `n` is given, the count is available to interpolation as the placeholder
`{n}`. The count wins: an `n` key inside `values` is ignored.

## 5. Interpolation

A placeholder is `{name}` where the name is letters, digits and underscore,
not starting with a digit. Anything else between braces (`{ name }`, `{}`) is
literal text and passes through untouched in both modes. Values are
stringified, so `7` renders as `'7'`. A value of `undefined` or `null` counts
as missing. Values for names the text does not use are ignored.

The missing-value policy is per mode:

| mode | a placeholder with no value |
|---|---|
| `lenient` | replaced with the empty string |
| `strict` | `MissingValueError`, naming the placeholder and the message key |

A raw `{...}` never appears in a rendered message in either mode.

## 6. Missing keys

A key is **missing** when no locale in the fallback chain defines it (or when
its plural object cannot produce text, §4). The policy is per mode:

| mode | a missing key |
|---|---|
| `lenient` | the key itself is the rendered text, so the UI shows something |
| `strict` | `MissingKeyError`, naming the key and the **requested** locale |

Strict never echoes the key, and the error names the locale the caller asked
for, not whichever fallback link was reached last.

## 7. Modes

A service is created with one mode: `createMessageService({ bundles,
defaultLocale = 'en', mode = 'lenient' })`. The mode is fixed for the life of
the service and applies to both policies above. Anything else throws.

# Template rules

The rules the notification team agreed on. `src/` is the implementation; when the
two disagree, this document is right and the code is a bug.

## 1. Tags

| written | meaning |
|---|---|
| `{{name}}` | interpolate `name`, HTML-escaped |
| `{{{name}}}` | interpolate `name`, verbatim |
| `{{&name}}` | exactly the same as `{{{name}}}` |
| `{{#name}} ... {{/name}}` | section |
| `{{^name}} ... {{/name}}` | inverted section |
| `{{! anything }}` | comment, renders nothing |
| `{{> name}}` | partial |
| `{{=<% %>=}}` | set the delimiters for the rest of the template |

A tag body is trimmed before it is read, so `{{ name }}` and `{{name}}` are the
same tag and `{{> row }}` includes the partial `row`. Names are case sensitive.

`{{{name}}}` is only special while the delimiters are the default `{{ }}`. Once
a template has set its own delimiters, the ampersand spelling (`{{&name}}` in
the current delimiters) is the only way to ask for a verbatim value.

A `{{=<% %>=}}` tag takes two delimiters separated by whitespace. Anything else
inside it is malformed: the tag renders nothing and the delimiters are left as
they were. The new delimiters apply from the next tag onwards, for the rest of
the template.

A comment may span several lines; everything between `{{!` and the closing
delimiter is dropped.

A tag that is never closed is not a tag: from the opening delimiters to the end
of the template, the text stays in the output as it was written.

## 2. Names and lookup

A render carries a stack of frames. The outermost frame is the data object the
caller passed to `render()`; a section pushes a frame for the length of its
block. Frames are consulted from the innermost outwards and the first frame that
resolves the name wins.

A name that contains a `.` is a **path**: it is split on `.` and resolved one
segment at a time. Before it is split, the whole name is looked up as a literal
key, so a record that really does have a `"user.name"` field renders it with
`{{user.name}}` — the literal key wins over the path reading, inside that frame.

Segments are own keys. An object holds keys; a list holds its indices, so
`{{items.0.name}}` and `{{grid.2.0}}` reach into lists. Nothing else has keys: a
path cannot continue through a string, a number, a boolean, `null` or
`undefined`, and a path that cannot be walked any further has not resolved.

A path resolves only when **every** segment resolves. `0`, `false` and the empty
string are ordinary values: a path may end on one, and it may not continue
through one.

A name of `.` on its own is not a path. It is the **implicit iterator**: the
innermost frame itself, whatever it happens to be. Inside `{{#items}}` over a
list of scalars it is the element, and it is a value under §3 like any other —
so `0` renders as `0`. A frame that is an object or a list has no string form of
its own and `{{.}}` renders as nothing for it.

A name that does not resolve anywhere in the stack is *missing*. A missing name
interpolates as nothing and is falsy to a section.

## 3. Interpolation and escaping

The value is stringified, then escaped unless the tag was verbatim.

Escaping replaces exactly these seven characters and nothing else:

| character | becomes |
|---|---|
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;` |
| `'` | `&#39;` |
| `` ` `` | `&#96;` |
| `/` | `&#x2F;` |

`=`, `+`, `%`, accented letters and everything else pass through unchanged.
Escaping is not applied twice: the engine escapes the value it was given, so a
value that already contains `&amp;` renders as `&amp;amp;`.

Missing names, `null` and `undefined` interpolate as the empty string. Every
other value interpolates as its string form: `0` renders as `0` and `false`
renders as `false`.

## 4. Truthiness

One rule, used by sections and by inverted sections:

- **Falsy** is `false`, `0`, the empty string, `null`, `undefined`, a missing
  name, and a list with no elements.
- **Truthy** is everything else, including the empty object `{}`, the string
  `"0"`, and any list with at least one element.

Note that `0` and `""` are falsy but still render as themselves; a section
decides whether its block runs, it does not rewrite the value.

## 5. Sections

`{{#name}} ... {{/name}}` renders its block according to what `name` resolved
to:

| value | block |
|---|---|
| a list with elements | once per element, in order, with the element pushed as the innermost frame |
| an object | once, with the object pushed as the innermost frame |
| `true` | once, and nothing is pushed |
| any other truthy value (a non-zero number, a non-empty string) | once, with that value pushed as the innermost frame |
| anything falsy | not at all |

Pushing a frame never hides the frames below it: a name that is not on the
object still resolves against the enclosing frames, and so does a path.

A `true` block sees exactly the frames its surroundings had.

Sections nest, and a list of lists is nothing special: each `{{#...}}` pushes
whatever it was given, so `{{#rows}}{{#cells}}{{.}}{{/cells}}{{/rows}}` walks
the inner list of every row. A section named `.` (`{{#.}}`) iterates the frame
that is already innermost, which is how a list of lists is walked when there is
no name to give it.

## 6. Inverted sections

`{{^name}} ... {{/name}}` renders its block once, with nothing pushed, in exactly
the cases where the matching section would render nothing: the name is missing,
or its value is falsy by the rule in §4. It is the exact complement of the
section — for `0`, for `""` and for the empty list as much as for `false` and
`null`.

Neither section kind can loop: a block renders zero times, once, or once per
list element.

## 7. Lines and standalone tags

A tag is **standalone** when it is the only thing on its line. "Only" means:
nothing but spaces and tabs in front of it, and nothing but spaces and tabs
between it and the end of the line. A line with any other content — text, an
interpolation, a second tag — is not standalone, and nothing about it is
rewritten.

Section, inverted, close, comment, partial and delimiter tags can be standalone.
An interpolation (`{{name}}`, `{{{name}}}`, `{{&name}}`) can never be: it always
renders something.

A standalone line is removed whole: its leading whitespace, the tag, and the
line's newline all disappear. A tag that owns its line therefore leaves no blank
line behind, and a section written that way does not indent its block.

A comment that spans more than one line is never standalone; only the comment
itself is removed, and the line breaks inside it go with it.

## 8. Partials

`{{> name}}` renders the partial's source with the frames the calling template
already has — it renders in place, as if its text had been written there. A
partial is parsed with the default `{{ }}` delimiters whatever delimiters the
calling template is using.

Partial sources are handed to `render()` in the `partials` option. There is no
filesystem lookup.

**Indentation.** A partial tag that is preceded on its line by nothing but
whitespace is indented by that whitespace: every non-empty line of the partial's
output is prefixed with it. A line that is empty stays empty, and so does the
empty string after a trailing newline. A partial tag with other content in front
of it on the line has no indentation to apply.

**Missing partials.** A name that is not in the partial map renders as nothing
and adds a diagnostic:

```js
{ code: 'missing-partial', name: 'signature' }
```

**Depth.** A partial may include itself. Inclusions nest at most 8 deep: an
inclusion that would nest a 9th time inside the same render renders as nothing
and adds

```js
{ code: 'partial-depth', name: 'order-row' }
```

The default is also what `config/notifications.json` records; a caller may pass
`maxPartialDepth` to `render()` to lower it for a test.

## 9. Diagnostics and the public surface

`render(source, data, options)` returns the body. `renderDetailed(...)` returns
`{ output, diagnostics }`, where `diagnostics` is the list of `{ code, ... }`
records the render produced, in the order they happened. A render that produced
none returns an empty list.

`compile(source, options)` parses once and returns `(data, options) => string`.

Options:

| option | meaning |
|---|---|
| `partials` | map of partial name to source |
| `maxPartialDepth` | override the 8-level inclusion limit |
| `delimiters` | start the template with delimiters other than `{{ }}` |

`escapeHtml(value)` is the escaping of §3 on its own. It is what the builders use
when they assemble a body outside a template.

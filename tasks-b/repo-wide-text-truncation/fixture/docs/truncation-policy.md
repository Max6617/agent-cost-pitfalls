# Truncation policy

Every surface that shows a user a shortened string follows the convention in
this document. It was agreed between the notifications team and the web/admin
team before the surfaces were built; when the code and this document disagree,
this document is right and the code is a bug.

There is one implementation of the convention: `truncate()` in
`src/truncate.js`. A surface calls it with its limit from `src/policy.js` and
adds nothing of its own - no local limit, no local ellipsis, no local cut
logic. The surfaces are the ones registered in `src/surfaces.js`.

## 1. How length is measured

Length is measured in Unicode code points, not UTF-16 code units and not
bytes. A character outside the Basic Multilingual Plane - an emoji, for
instance - is ONE code point, and a cut may never land between the two halves
of a surrogate pair. If a shortened string ever contains an unpaired
surrogate, that is a bug regardless of anything else.

## 2. The ellipsis

A shortened string ends with the single-character ellipsis `…` (U+2026),
never three full stops. The ellipsis is counted INSIDE the limit: the result
of shortening to a limit of N is at most N code points long, ellipsis
included. So for a limit of N, at most N-1 code points of the original text
survive.

## 3. Text that fits

Text whose length is at most the limit is returned unchanged, with no
ellipsis. A string of exactly the limit fits.

## 4. The word-boundary rule

When a string is shortened, the cut should not land in the middle of a word
if there is a word boundary near the cut. The rule, exactly:

- The raw cut keeps the first `limit - 1` code points (the "kept prefix");
  one code point is reserved for the ellipsis.
- The window is the last 10 code points of the kept prefix. If the kept
  prefix is shorter than 10 code points, the whole of it is the window.
- If the window contains a space (U+0020), the cut moves back to the LAST
  space in the window. The space itself is dropped, and the ellipsis is
  appended to what precedes it.
- If the window contains no space, the string is cut mid-word: the kept
  prefix plus the ellipsis.

Only a space is a boundary. Tabs and newlines are not (log lines are folded
to one line before they are shortened), and neither is a hyphen.

Moving the cut back to a boundary can leave the result noticeably shorter
than the limit. That is intended: correctness beats fullness. A boundary
further back than the window is never used, however much sense it would make.

## 5. The limits

Limits live in `src/policy.js` (`LIMITS`) and nowhere else. A module that
needs a limit imports it; a module may not keep a constant of its own, however
well-chosen. The agreed limits:

| surface | `LIMITS` key | limit (code points) |
|---|---|---|
| SMS message | `sms` | 160 |
| Push notification title | `push` | 120 |
| Email subject line | `emailSubject` | 60 |
| Log line | `logLine` | 80 |
| Admin table cell | `tableCell` | 24 |

Changing a limit is a one-line change to `src/policy.js` and nothing else.

# How the review service uses this library

Not a contract — the contract is `docs/unified-diff.md`. This is the context the
library was written in, for whoever picks it up next.

## Where a patch comes from

When a branch is pushed, the service builds the branch diff against the merge
base with `buildDiff(base, head)` and stores the patch text with the review. The
labels are the two revisions (`fromLabel: baseSha`, `toLabel: headSha`), which is
why the file header carries no timestamps: a stored patch has to be readable next
to the revision ids in the URL.

The stored text is what reviewers see. It is also what the merge bot applies
later, which is where the trouble comes from: the review may be days old, and the
target branch may have moved on in the meantime.

## Where a patch is applied

The merge bot calls `applyPatch(target, patch)` with the defaults and expects one
of two things:

* `ok: true` — the patch was placed, and `hunks[].offset` tells it how far each
  hunk drifted. A non-zero offset is logged; a large one is a warning in the
  merge report, because a hunk that drifted forty lines is technically fine and
  usually means somebody else edited the region.
* `ok: false` — the bot posts the report back to the reviewer as a comment. The
  reviewer has the patch open in the browser; the report has to line up with what
  they are looking at, which is why the failure names the hunk and quotes the
  lines.

The bot never retries, never re-anchors by hand, and never applies a hunk
partially: a half-applied patch is worse than a refused one, because the second
attempt starts from a tree nobody has seen.

## Whitespace

Reviewers paste patches through chat clients and editors that eat trailing
whitespace. The merge bot retries once with `ignoreWhitespace: true` before it
reports a failure, and mentions in the comment that it did so. The file keeps its
own whitespace either way — the review comment "your editor stripped the tabs"
is a conversation for humans, not something a bot should commit.

## Statistics and comments

`diffstat` feeds the sidebar ("+12 -3 in 2 hunks") and `hunkForLine` decides
which hunk expands when a reviewer clicks a comment. Both are conveniences over
the same parser: if a patch does not parse, the sidebar says so and the comment
list falls back to unanchored.

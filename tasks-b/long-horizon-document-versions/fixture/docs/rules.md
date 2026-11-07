# Document versioning rules

The rules the team signed off for the versioning service. `src/` is the
implementation; when the two disagree, this document is right and the code is a
bug.

## 1. The model

A **document** (`createDocument({ id, title })`) owns a line of **versions**.
At any moment at most one version number is *published*; the rest of the line
is immutable history. On top of the published version sit zero or more open
**drafts** — the working copies that may become the next version.

A draft is a plain object:

```js
{
  id: 'spec#3',        // '<document-id>#<n>'; n counts drafts ever opened, from 1
  document: 'spec',
  version: 4,          // the version this draft would become if published now
  base: 3,             // the published version it is working from (null: none yet)
  author: 'ana',       // whoever opened it, or null
  content: { ... },    // JSON
}
```

Draft ids are never reused, not even after the draft is deleted or published.

## 2. Content crosses the boundary as copies

Content is plain JSON. The service **never aliases a caller's objects**: what
is passed in is copied before it is stored, and everything read back —
`getVersion`, `getDraft`, `listVersions`, the drafts on a `created`/`saved`
result — is a copy. Mutating an object you once passed in, or an object the
service once handed you, must change nothing inside the service.

A published version is **frozen**: there is no operation that changes its
content. That is the whole point of publishing.

## 3. Opening a draft

`createDraft(documentId, { author })` opens a draft that:

- is numbered to become the next version: the current published version plus
  one (v1 when nothing is published yet);
- takes the current published version as its `base` (null when none);
- starts as a copy of the published version's content, or an empty object for
  the very first draft.

It returns `{ status: 'created', draft }`.

## 4. Saving a draft

`saveDraft(documentId, draftId, { content, base })` records new content into a
draft. The caller states the `base` it is working from, and that base must be
the version that is **currently published** — otherwise the save conflicts:

`{ status: 'stale-base', current: <the version that is actually published> }`

A conflicting save changes nothing: the draft keeps its content, its base and
its number.

Saving against a base **newer** than the draft's own re-bases the draft: its
`base` becomes the base named in the save, and its number moves to the next
version off that base. Saving against the same base it already had just records
the content.

## 5. Publishing

`publishDraft(documentId, draftId)` freezes the draft's content as the version
the draft was numbered for, makes that version the published one, and consumes
the draft — the version is what remains. It returns
`{ status: 'published', version }`.

Concurrent publish is **first-wins**: a draft may publish only while its `base`
is still the current published version. Publishing a draft whose base has been
left behind — because another draft published first — conflicts with
`{ status: 'stale-base', current }` and changes nothing; the published version
keeps the winner's content. The losing draft stays open and can be re-based by
saving (§4) and then published as the next version.

Publishing a draft that no longer exists — one already published or deleted —
reports `{ status: 'unknown-draft' }`.

## 6. Revert

`revertTo(documentId, version)` goes back to the content of an earlier
published version **by opening a new draft**: it never touches the published
history. The draft is an ordinary draft — numbered to become the next version,
based on the current published version — whose content is a copy of the named
version's. It returns `{ status: 'created', draft }`, exactly like opening a
draft by hand.

Reverting to a version that was never published reports
`{ status: 'unknown-version' }` and changes nothing.

## 7. Deleting

Only drafts can be deleted. `deleteDraft(documentId, draftId)` removes a draft
and reports `{ status: 'deleted' }`; a draft that does not exist reports
`{ status: 'unknown-draft' }`.

Published versions are immutable, so there is nothing to delete:
`deleteVersion(documentId, version)` always reports
`{ status: 'not-a-draft' }` for a version that exists, and
`{ status: 'unknown-version' }` for one that never did.

## 8. The version list

`listVersions(documentId)` returns every published version and every open
draft, in the **pinned order**: ascending version number; where a published
entry and drafts carry the same number, the published entry comes first; drafts
among themselves in the order they were opened. Entries look like:

```js
{ kind: 'published', version: 2, base: 1, content: { ... } }
{ kind: 'draft',     id: 'spec#3', version: 2, base: 1, content: { ... } }
```

## 9. Status vocabulary

| status | meaning |
|---|---|
| `created` | a document or draft was created |
| `document-exists` | a document with that id already exists |
| `unknown-document` | no such document |
| `unknown-draft` | no such draft (never existed, or already consumed) |
| `unknown-version` | no such published version |
| `saved` | draft content recorded |
| `stale-base` | the base named is not the current published version; `current` says what is |
| `published` | the draft became a version |
| `deleted` | the draft was removed |
| `not-a-draft` | published versions cannot be deleted |

Operations on a document that does not exist report
`{ status: 'unknown-document' }`. Reads (`getVersion`, `getDraft`,
`listVersions`, `publishedVersion`) return `null` for an unknown document;
`getVersion`/`getDraft` return `null` when the version or draft does not exist.

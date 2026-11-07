# config-service

Three layers over one document:

| module | responsibility |
|---|---|
| `src/pointer.js` | address a node in a JSON document |
| `src/patch.js` | apply an ordered list of edits to a document |
| `src/service.js` | the request path the API exposes |

## Addressing

Pointers are the standard `/a/b/0` form. Keys may contain the separator and the
escape character, which is why tokens are escaped at all — the escaping is not
naive quoting and the decode order is part of the format.

## Patching

Operations arrive as a list and are applied in order to a copy of the document:
`add`, `remove`, `replace`, `move`, `copy`, `test`. The semantics of `add` on an
array member differ from `replace` on the same member, and `move` is not
`remove` followed by `add` when the destination lies inside the source.

A patch that fails must leave the caller's document untouched — the API applies
the patch and only swaps the result in when every operation succeeded.

Every operation and every escaping rule is specified in the corresponding RFC.
Follow it exactly; clients are other implementations of the same specification
and they will notice any deviation.

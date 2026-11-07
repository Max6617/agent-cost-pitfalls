# Refresh-token rules

The rules security signed off for the token service. `src/` is the
implementation; when the two disagree, this document is right and the code is
a bug.

## 1. Families and tokens

A login creates a **family**: one per `(user, device)` session. A family owns
a lineage of refresh tokens, one per **generation**, numbered from 0. At any
moment exactly one generation is current, and only the current generation's
token may be presented successfully.

Tokens are **derived, not generated**: a deterministic digest of the family id
and the generation. There is no randomness anywhere. Two services driven
through the same call sequence produce byte-identical token streams, which is
what makes the theft drills repeatable.

Every call takes `now` (milliseconds since the epoch) from the caller. The
service never reads a clock itself.

## 2. Rotation

Every successful `refresh` **rotates**: the presented token is marked rotated
and can never succeed again, and a new generation is minted and returned.
Rotating also mints a fresh access token (section 6).

```js
{ status: 'rotated', familyId, refreshToken, accessToken, refreshExpiresAt, accessExpiresAt }
```

`refreshExpiresAt` is the family's effective deadline **after** this use
(section 4). Rotation does not disturb access tokens minted earlier from the
same family: they live out their own TTL.

## 3. Reuse

Presenting a token that has already been rotated out is **reuse** - the
signature of a stolen token being replayed. Reuse is recognised from the
generation lineage, never by comparing timestamps: a token rotated out in the
same instant it was issued is rotated out all the same.

The response to reuse is to **revoke the whole family** (section 5), not just
the presented token:

```js
{ status: 'reuse', familyId }
```

Nothing is minted on a reuse. Once the family is revoked, every refresh token
in it - the current one included, and the replayed one if it shows up again -
is answered `revoked`, not `reuse` a second time.

## 4. Expiry

A family lives under two clocks, both from `config/auth.config.json`:

- **absolute**: `createdAt + absoluteTtlMs`. It never moves.
- **idle**: `lastUsedAt + idleTtlMs`. It slides: every successful rotation is
  a use, so an active family can outlive any fixed window - but never the
  absolute deadline.

The effective deadline is the earlier of the two. A family is alive while
`now` is **strictly before** the effective deadline; at the deadline instant
itself it is already dead. Refreshing a dead family answers:

```js
{ status: 'expired', familyId, reason }   // reason: 'absolute' | 'idle'
```

`reason` names the clock whose deadline is earlier; when both fire at the
same instant the reason is `absolute`. Expiry is not revocation: an expired
family keeps answering `expired`, never `revoked`.

The checks, in the order the service applies them:

1. token never issued -> `{ status: 'unknown' }`
2. family revoked -> `{ status: 'revoked', familyId }`
3. presented token rotated out -> reuse (above; revokes the family)
4. family expired -> `expired` (above)
5. otherwise rotate

Reuse is checked before expiry on purpose: a replayed token must convict the
family even when the family would have been dead by then anyway.

## 5. Revocation and logout

Revoking a family (by reuse detection, or by `logout`) kills it completely:
all its refresh tokens answer `revoked`, and **every access token ever minted
from the family is revoked too**, including ones issued before the revocation
and ones that would still be valid by the clock.

```js
svc.logout(familyId, now) // -> { status: 'revoked', familyId }
```

Logout is idempotent: logging out an already-revoked family answers
`revoked` again. A family id the service never issued answers
`{ status: 'unknown' }`.

## 6. Access tokens

An access token is minted at login and at every rotation, with a TTL of
`accessTtlMs` from its own issue moment.

```js
svc.validateAccess(token, now)
// { status: 'valid', user, familyId, expiresAt }
// { status: 'revoked', familyId }   { status: 'expired', familyId }   { status: 'unknown' }
```

A token is valid strictly before its `expiresAt`; at that instant it is
expired. A revoked token is reported `revoked` even after the moment it would
have expired anyway - revocation outranks expiry.

## 7. The session listing

```js
svc.sessions(user, now) // -> [ { familyId, device, createdAt, lastUsedAt, expiresAt } ]
```

The listing shows the user's **live** sessions only: a family that is revoked,
or whose effective deadline has been reached at `now`, is not in it. Rows are
ordered most recently used first; sessions used in the same instant are
ordered by family id, ascending. A user with no live sessions - or no
sessions at all - gets an empty list.

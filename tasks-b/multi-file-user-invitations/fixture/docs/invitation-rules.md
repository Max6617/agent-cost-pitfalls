# Invitation rules

The rules the team agreed for org invitations, written down before the code.
`src/` is the implementation; when the two disagree, this document is right
and the code is a bug.

Time is always an injected millisecond instant called `now`. Nothing in the
service reads a clock.

## 1. Orgs and roles

An org is registered with `addOrg({ id, defaultRole })`; `defaultRole`
defaults to `'member'`. The roles are `member`, `admin` and `viewer` -
anything else is rejected. `setDefaultRole(org, role)` changes an org's
default going forward; it never rewrites anything that already exists.

## 2. Invites and tokens

`invite({ org, email, role?, now })` sends an invite and returns its record:

```js
{
  token: 'inv_d467975a',
  org: 'acme',
  email: 'sam@acme.com',     // the canonical address, see §6
  role: 'member',            // the role this invite grants, see §5
  createdAt: 1000,
  expiresAt: 604801000,      // see §3
  status: 'pending',
}
```

The token is deterministic - there is no randomness anywhere in the service:

```
token = 'inv_' + fnv1a32hex(org + ':' + canonicalEmail + ':' + counter)
```

`fnv1a32hex` is the hash in `src/util/hash.js`, rendered as eight lowercase
hex characters. `counter` is the number of invites ever created in that org,
starting at 1, and a re-invite counts too. Worked example: org `acme`,
address `sam@acme.com`, first invite → `inv_d467975a`; that person's second
invite → `inv_d36795c7`.

## 3. Expiry

An invite stays usable for one week: `expiresAt = createdAt + 604800000`.

An invite is valid **through** its expiry instant. Acceptance with
`now === expiresAt` succeeds; acceptance is expired only when `now` is
strictly greater than `expiresAt`.

## 4. Acceptance

`accept({ token, email, now })` resolves a token and returns `{ status }`,
on success `{ status: 'accepted', member }` with
`member = { org, email, role }` - the org id, the invite's canonical address,
and the role the invite granted.

An invite is **single-use**: once accepted it stays accepted and a second
acceptance reports `already-accepted`.

Statuses, in the order they are decided - the first one that applies is the
one reported:

| # | condition | status |
|---|---|---|
| 1 | no invite was ever issued under this token | `not-found` |
| 2 | the invite has been revoked | `revoked` |
| 3 | the token is not the current invite for that invitee | `superseded` |
| 4 | `now` is past the invite's expiry instant | `expired` |
| 5 | the invite was already accepted | `already-accepted` |
| 6 | the accepting address is not the invited address | `email-mismatch` |
| 7 | otherwise | `accepted` |

The order matters: a revoked invite that was also superseded reports
`revoked`; a used invite that was later superseded reports `superseded`.

## 5. The role an invite grants

An invite **snapshots** its role at the moment it is sent: the role the
inviter picked, or - when none was picked - the org's default **as it stands
at that moment**. That snapshot is what the invite record carries in `role`,
and it is what the accepted member joins with, whatever the org's default has
become by the time the invite is accepted.

A re-invite is a new invite, so it snapshots afresh: it grants whatever the
rule above says at the moment the re-invite is sent.

## 6. Email canonicalisation

One mailbox, many spellings. The canonical form of an address is:

- the whole address lowercased, and
- any `+tag` removed from the local part (everything from the first `+` up
  to the `@`).

So `Sam+Eng@Acme.COM` and `sam@acme.com` are the same person. The canonical
form is used everywhere an address matters: an invite stores it, the token is
derived from it, identities are keyed by it (a re-invite under a different
spelling is a re-invite of the same person), acceptance compares the
acceptor's address in canonical form, and revocation finds the invitee by it.

## 7. Re-inviting

Inviting someone who already has an invite - whatever its status - **supersedes**
the old invite immediately. The new invite gets a fresh token (the counter
moves), a fresh expiry counted from its own `now`, and a fresh role snapshot.
The old invite keeps its own status but is no longer current: its token
reports `superseded`, per the order in §4.

## 8. Revocation

`revoke({ org, email })` revokes the current invite for that invitee. It
reports `revoked` on success, `not-found` when there is nothing to revoke,
and `already-accepted` when the invite was already used (a used invite
stands; revoke changes nothing about it).

Revocation sticks to the invite it was applied to. Re-inviting the same
person later creates a new invite; it does not bring the revoked one back,
and the revoked token keeps reporting `revoked`.

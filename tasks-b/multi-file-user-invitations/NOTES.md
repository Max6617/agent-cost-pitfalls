# multi-file-user-invitations

stratum: multi-file

A team-invitation service: orgs invite people by email, an invite is a
deterministic token plus the terms it was sent under (role snapshot, expiry),
and accepting the token joins the invitee on those terms. Time is always an
injected `now`; there is no randomness (tokens are an in-repo FNV-1a hash over
org + canonical email + a per-org counter).

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-expiry` | valid through the expiry instant; expiry counted from each invite's own creation | `src/expiry.js` `isExpired` uses `now >= expiresAt`, so an invite dies at the exact instant docs say it is still usable |
| `02-roles` | the role is snapshotted at invite time (explicit pick, or the org default of that moment) | `src/roles.js` `resolveAcceptRole` resolves the *live* org default at accept time whenever the invite named no role (`invite.role` is left `null` at creation in `src/service.js`) |
| `03-acceptance` | single-use; re-invite supersedes; revoked stays revoked; status order | `src/store.js` keys invites one-slot-per-invitee and resolves a token to whatever record currently sits in the slot, so a re-invite silently resurrects old tokens and wipes the revoked flag; `src/service.js` has no superseded check |
| `04-email` | canonical email (lowercase, `+tag` stripped) for storage, token derivation, identity and matching | `src/email.js` `emailsMatch` compares raw strings; `src/service.js` `invite()` stores and hashes the raw address and keys identity by it |
| `05-interactions` | the rules in combination: re-invite under another spelling, revoke across spellings, snapshot across re-invites, expiry boundary on superseded invites | needs the pairs of fixes above together |

## guards (pass on the untouched fixture)

- `an invite carries an expiry exactly one week after its creation` (01) — expiry *computation* is correct; only the comparison is off
- `an explicit role survives any later default change` (02) — explicit roles are stored and honoured; only the default-resolution path is live
- `a re-invite snapshots whatever the default is when the re-invite is sent` (02) — passes on broken by accident (live default happens to equal the fresh snapshot); guards against an over-fix that freezes the first snapshot forever
- `revoking an invite refuses it, and an unknown token is not found` (03) — plain revoke with no re-invite works; only the re-invite interaction is broken

## interactions

All 6 cases in `05-interactions`, plus from the main files: `a superseded
token reports superseded even after the new invite was used` (03, supersede x
single-use x status order), `an invite that was used and then re-invited
reports its old token superseded` (03), `accepting at the expiry instant uses
the invite like any other acceptance` (01, boundary x single-use), `a
re-invite expires on its own clock` (01, expiry x re-invite), and `a re-invite
under a different spelling continues the same person's sequence` (04,
canonicalisation x token counter). The visible suite never touches the status
ordering (`superseded` vs `already-accepted`/`expired`), revocation across
spellings, or token-canonical derivation.

## measured

- untouched fixture: 4/25 hidden cases (16%); visible suite 4/10 pass, exit 1 (6 failing)
- reference: 25/25 hidden cases (100%); visible suite 10/10 pass, exit 0
- reference changes 5 source files: `src/{email,expiry,roles,service,store}.js`

A solution that greens only the visible suite still misses the token-canonical
derivation, the canonical revocation path and the status-ordering cases, which
is where the partial credit lives.

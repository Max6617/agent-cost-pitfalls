# Email rules

The address rules the product team signed off. `src/` is the implementation;
when the two disagree, this document is right and the code is a bug.

There is **one** canonicalisation. Every module that compares, stores or looks
up an address for identity uses it. Display is a separate concern (§2).

## 1. The shape of an address

An address is a string with exactly one `@`, a non-empty local part before it
and a non-empty domain after it, judged after trimming surrounding whitespace.
A local part that begins with `+` is not an address. Nothing else is checked:
no length limits, no TLD rules, no character rules.

Anything that fails this shape is *invalid*. Mutating calls
(`register`, `invite`, `subscribe`, `unsubscribe`, `openTicket`, `setContact`,
`updateEmail`) refuse it with status `invalid-email` and change nothing.
Read-only lookups (`lookup`, `isSubscribed`, `ticketsFor`, `customerFor`)
treat invalid input as no match: `null`, `false` or `[]`.

## 2. Display

Display keeps the address **exactly as it was supplied**, whitespace and all.
Matching never looks at the stored display text, and nothing ever rewrites it:
if a customer typed `  Dana.White@Gmail.com ` that is what every screen and
every export shows, forever, until the customer changes their address.

## 3. The canonical form

Identity matching uses the canonical form, computed as:

1. Trim surrounding whitespace.
2. Lowercase the local part and the domain.
3. Drop the tag: everything from the **first** `+` in the local part onward,
   even when nothing follows the `+`.
4. Map the domain through the provider table below to its canonical domain.
5. If the **canonical** domain's row says dots are ignored, remove every `.`
   from the local part. Otherwise the dots stay — they are significant.

The provider table (the whole of it — a domain not listed here is its own
canonical domain and keeps its dots):

| domain        | canonical domain | dots in the local part |
|---------------|------------------|------------------------|
| gmail.com     | gmail.com        | ignored                |
| googlemail.com| gmail.com        | ignored                |
| outlook.com   | outlook.com      | significant            |
| hotmail.com   | outlook.com      | significant            |
| fastmail.fm   | fastmail.fm      | significant            |
| icloud.com    | icloud.com       | ignored                |

Two addresses are the same identity iff their canonical forms are equal.
Worked examples:

- `Sam.Ochoa+alerts@googlemail.com` → `samochoa@gmail.com`
- `Jo.Smith+team@OUTLOOK.com` → `jo.smith@outlook.com`
- `pat+@example.com` → `pat@example.com`
- `a.b@hotmail.com` → `a.b@outlook.com` (alias applied, dots kept)

`src/emailkit.js` is the reference implementation of this section.

## 4. What each service does with it

**Accounts.** One account per identity. `register` returns
`{ status: 'registered', account }` for a new identity, or
`{ status: 'exists', account }` with the account already on file when the
identity is registered again — no second account is created, however the
address was typed. `lookup(email)` finds an account by identity or returns
`null`. Account ids are `a-1`, `a-2`, … in the order accounts are created.

**Invites.** One pending invite per identity. `invite` returns `'sent'` or
`'duplicate'`. `accept(email)` accepts the pending invite for that identity —
`{ status: 'accepted', invite }` — and the invite leaves the pending list;
with no matching invite the status is `'no-invite'`. `pending()` lists the
pending invites in the order they were sent.

**Newsletter.** One subscription per identity. `subscribe` returns
`'subscribed'`, or `'already-subscribed'` when the identity is already on the
list. `unsubscribe` removes the subscription for that identity
(`'unsubscribed'`), however the address is typed this time, or returns
`'not-found'`. `isSubscribed(email)` answers by identity. `list()` is the
current subscribers' display addresses in subscription order.

**Support desk.** One thread per identity. `openTicket({ email, subject })`
returns `{ status: 'open', ticket }`; a ticket from an identity that already
has a thread joins that thread (same `threadId`), otherwise it starts a new
one. Thread ids are `H-1`, `H-2`, … and ticket ids `T-1`, `T-2`, …, both in
creation order. `ticketsFor(email)` returns every ticket in that identity's
thread. `threadCount()` is the number of open threads.

**Billing contacts.** One contact address per customer id. `setContact`
registers it (`'set'`), `updateEmail` changes it (`'updated'`, or
`'no-such-customer'`). `contactFor(customerId)` returns the current display
address or `null`. `customerFor(email)` finds the customer whose contact
address matches by identity, or `null`. An update takes effect everywhere at
once: the moment a new address is saved it resolves, and the old one stops
resolving. Nothing may keep answering for an address that was replaced.

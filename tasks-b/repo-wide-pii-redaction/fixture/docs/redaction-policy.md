# Redaction policy

The policy compliance signed off. Every surface that emits an entity applies
it. When this document and the code disagree, this document is right and the
code is a bug.

## 1. The four surfaces

An entity crosses the process boundary four ways, and all four redact:

- **log lines** — the payload of every log call, on every level
- **API serializers** — the JSON shapes and receipt lines the API returns
- **error payloads** — the `details` of an error response
- **audit snapshots** — the `entity` an audit snapshot captures

The same entity masks to the same shape on every surface. A card that reads
`***1111` in an API response reads `***1111` in a log line and `***1111` in an
audit snapshot.

## 2. Entities and their listed fields

Redaction is per entity kind. The listed fields, and only these, are masked:

| kind | field | rule |
|---|---|---|
| account | email | email rule |
| account | phone | masked |
| account | address | masked |
| card | cardNumber | card rule |
| card | cardholder | masked |
| ticket | contactEmail | email rule |

- **masked** — replaced by the exact string `***`.
- **email rule** — the local part is replaced by `***` and the domain is
  kept: `ada.lovelace@example.com` becomes `***@example.com`. An address with
  no `@` masks to `***` entirely.
- **card rule** — replaced by `***` plus the last four digits of the number:
  `4111111111111111` becomes `***1111`. The stored number may be grouped with
  spaces or dashes (`4111 1111 1111 1111`); only the digits count, and it is
  still the last four of them.

Every other field passes through unchanged: names, ids, plans, amounts,
brands, expiry dates, ticket subjects and bodies. A field that is not listed
is not redacted, even when its content looks like PII.

## 3. The entity shapes

```js
account = { id, name, email, phone, address, plan }
card    = { brand, cardNumber, cardholder, expiry }
ticket  = { id, accountId, subject, body, contactEmail, status }
charge  = { id, amountCents, currency, account, card }   // carries both
```

A charge has no listed fields of its own; what it carries is redacted. An
audit snapshot's `kind` names what the entity is: `account`, `card`, `ticket`
or `charge`.

## 4. Structural, never textual

Redaction works on fields, never on text. A log message, an error message, a
ticket subject or body is carried verbatim even when it mentions an email
address or a card number — free text is never scanned. The listed fields of
the entities in the payload are still masked.

A value under a key that exactly names an entity kind — `account`, `card`,
`ticket` — is redacted by that kind's rules, wherever the key appears: at the
top level of a log payload, nested inside a charge, inside an error's
`details`, at any depth. The key must match exactly (`accountId` is an id,
not an account), and the rule applies to objects and arrays of objects, not
to strings.

## 5. Redaction never mutates

Redacting produces a new value. The source object, and every object reachable
from it, is exactly as it was before; and nothing reachable from the redacted
value aliases the source, so writing into the redacted copy cannot move the
source.

## 6. Redaction is idempotent

Redacting an already-redacted entity changes nothing: `***@example.com` stays
`***@example.com`, `***1111` stays `***1111`, `***` stays `***`. A value may
pass through two surfaces — an error payload that is also logged — and it
arrives masked once, never mangled by the second pass.

## 7. Nulls and odd shapes

A listed field that is absent stays absent. A listed field that is `null`
stays `null` — redaction never fabricates a value. Listed fields hold strings
or `null`; anything else found in one passes through unchanged.

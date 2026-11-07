# The notification service

Notes for whoever picks this up next: how the mailer uses the template engine,
and why some of the rules in `template-rules.md` read the way they do.

## Why we wrote our own

The service used to shell out to a Mustache implementation. Two things pushed us
off it: the container has no network and no package registry, and support kept
asking for exactly two behaviours no off-the-shelf engine would give us —
diagnostics instead of exceptions, and the empty string for anything that is
missing. A customer must never receive `undefined` in a subject line.

## How a message is built

```
service/templates/welcome.html
  -> notification/templates.read()        source + partial sources
  -> notification/render.renderDetailed() body + diagnostics
  -> mailer.send({ to, subject, body })
```

The partials are read once at boot and handed to the renderer as a map, which is
why `src/` never touches the filesystem.

## The bodies that bite

- **Indented fragments.** The order row partial is written at four spaces inside
  the receipt, and the address block at two inside the footer. A fragment that
  loses its indentation does not look like a bug in a plain-text mail until it
  reaches a customer whose mail client renders the HTML part — then the address
  lines are hard against the left edge.
- **Lists that contain a zero.** A receipt with a `0.00` line or a discount of
  `0` is normal, and a zero quantity must still print. The list of line items is
  never empty when a receipt is sent, but a line total may well be zero.
- **Optional fields.** `nickname`, `company`, `voucher` and friends are absent
  for most customers. The mailer passes them as `null` where the importer knows
  there is no value, and omits the key where it has never heard of one.
- **Blank lines.** Support sends screenshots of emails with gaps where a section
  tag was written on its own line. The HTML part collapses the whitespace, so it
  only ever showed up in the plain-text part.

## Diagnostics

`logDiagnostics` is on in production. Anything with a `code` is copied into the
notification log line, so a rename of a partial or an over-deep recursion shows
up in the logs rather than in a customer's inbox.

# dep-resolver

Reads a manifest, matches each dependency's range against the versions the
registry offered, and writes a lockfile.

## Range syntax

The ranges in the manifest are the ones npm publishes: exact versions, the
comparison operators, the caret and tilde shorthands, hyphen ranges, and `||`
unions. The matcher is expected to implement that syntax as it is specified,
including the parts that are easy to get subtly wrong:

- how a partial version such as `1.2` is treated in a range
- the exact meaning of `^` and `~` at each of the three positions
- inclusivity at both ends of a hyphen range
- when a prerelease version may be selected at all

Do not invent house rules here. The registry and every other tool in the
ecosystem agree on this syntax, and a resolver that differs from it produces
lockfiles nobody else can reproduce.

# globset

Pattern matching for the backup tool's file selection.

A backup job is configured with a list of patterns. The tool hands the job's
candidate paths to `select()` and copies whatever comes back. Nothing here talks
to the filesystem: a path is a string, and the only thing it carries about the
disk is a trailing `/`, which marks the entry as a directory (see
`docs/glob-spec.md`).

```
config/glob.config.json   the defaults the backup tool ships with
docs/glob-spec.md         the pattern language - treat it as the contract
docs/selection.md         how a list of patterns selects paths, brace expansion
src/                      the implementation
test/                     reproductions; a subset of what the backup team checks
```

## Use

```js
import { compile, match, select, expandBraces, isDirectory } from './src/index.js'

match('backup/*', 'backup/notes.txt')                 // true
match('backup/**', 'backup/notes.txt')                // true
match('*', '.env')                                    // false - see the dot rule
match('*', '.env', { dot: true })                     // true
match('README.md', 'readme.md', { nocase: true })     // true

select(paths, ['**', '!**/*.tmp'])                    // includes, minus exclusions
expandBraces('{src,test}/**')                         // ['src/**', 'test/**']

const matcher = compile('src/**/*.js')
matcher.test('src/lib/app.js')                        // true
matcher.select(candidatePaths)                        // the paths it matches
```

`match(pattern, path, options)` is `compile(pattern, options).test(path)`
compiled on the spot; call `compile()` yourself when the same pattern is used
for more than a handful of paths.

## Conventions

- ESM only. `package.json` says `"type": "module"`; the backup tool imports these
  files directly, so the module system cannot change.
- No dependencies. The tool runs in a minimal container with no network and no
  package registry.
- No filesystem access, no clock, no randomness. The same pattern and the same
  options always produce the same matcher, and the same matcher always gives the
  same answer for the same path.
- `src/index.js` is the public surface. Everything else under `src/` is internal
  and can be reorganised; the names in `src/index.js` cannot.
- Paths and patterns cross the public surface as strings, separated by `/`, on
  every platform. A path never has a leading or a doubled separator.

Run the reproductions with:

```
npm test          # node --test
```

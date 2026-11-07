/**
 * match — the one-shot form: compile and ask once.
 *
 * Restore planning asks about a single path at a time with a pattern that is
 * written down in a manifest, so this is cheaper to read than a compile call.
 */
import { compile } from './compile.js'

export function match(pattern, path, options) {
  return compile(pattern, options).test(path)
}

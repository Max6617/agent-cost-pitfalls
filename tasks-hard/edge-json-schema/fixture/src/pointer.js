/**
 * JSON Pointer helpers.
 *
 * Paths in the report are pointers into the instance, so a property whose name
 * contains `/` or `~` has to be escaped or the client cannot parse the path back
 * into a location.
 */

export function escapeToken(token) {
  return String(token).replace(/~/g, '~0').replace(/\//g, '~1')
}

export function joinPointer(path, token) {
  return path + '/' + escapeToken(token)
}

export function pointerOf(tokens) {
  let path = ''
  for (const token of tokens) path = joinPointer(path, token)
  return path
}

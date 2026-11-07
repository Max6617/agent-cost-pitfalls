/**
 * The frame stack, and name lookup inside it.
 *
 * A render walks the template with a stack of frames. The outermost frame is
 * the data the caller passed; every section that has something to push (a list
 * element, an object) becomes a new innermost frame for the length of its
 * block. See docs/template-rules.md §2 and §5.
 */

/** A value that can hold keys: an object or an array. */
export function isFrame(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Reads one own key of a frame. Strings and numbers have no keys. */
export function readKey(frame, key) {
  if (frame === null || typeof frame !== 'object') return { found: false, value: undefined }
  if (!Object.hasOwn(frame, key)) return { found: false, value: undefined }
  return { found: true, value: frame[key] }
}

/**
 * Resolves a dotted path against one frame.
 *
 * The exact key wins over the path reading, so a record with a literal
 * `"user.name"` field still renders with `{{user.name}}`. Otherwise the name is
 * split on `.` and every segment has to resolve.
 */
export function lookupInFrame(frame, path) {
  if (path === '.') return frame
  const literal = readKey(frame, path)
  if (literal.found) return literal.value
  if (!path.includes('.')) return undefined

  const parts = path.split('.')
  let cursor = frame
  for (const part of parts) {
    if (!isFrame(cursor)) return undefined
    cursor = cursor[part]
    if (!cursor) return undefined
  }
  return cursor
}

export class Context {
  constructor(frames) {
    this.frames = frames
  }

  /** The frame stack for one render: the caller's data, and nothing else. */
  static root(data) {
    return new Context([data])
  }

  push(frame) {
    return new Context([...this.frames, frame])
  }

  current() {
    return this.frames[this.frames.length - 1]
  }

  /**
   * Resolves a name the way `{{name}}` does: walk the frames from the innermost
   * outwards and take the first one that has it.
   */
  lookup(name) {
    if (name.includes('.')) return lookupInFrame(this.current(), name)
    for (let index = this.frames.length - 1; index >= 0; index -= 1) {
      const found = readKey(this.frames[index], name)
      if (found.found) return found.value
    }
    return undefined
  }
}

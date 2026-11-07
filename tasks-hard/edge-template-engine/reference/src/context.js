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
 * split on `.` and every segment has to resolve; lists are walked by index, so
 * `{{items.0.name}}` reaches into a list of records.
 */
function resolveInFrame(frame, path) {
  if (path === '.') return { found: true, value: frame }

  const literal = readKey(frame, path)
  if (literal.found) return literal
  if (!path.includes('.')) return { found: false, value: undefined }

  const parts = path.split('.')
  let cursor = frame
  for (const part of parts) {
    const step = readKey(cursor, part)
    if (!step.found) return { found: false, value: undefined }
    cursor = step.value
  }
  return { found: true, value: cursor }
}

/** The value of a path in one frame, or `undefined` when it does not resolve. */
export function lookupInFrame(frame, path) {
  return resolveInFrame(frame, path).value
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
   * outwards and take the first one that has it. A path is resolved frame by
   * frame the same way, so a name written inside a section still reaches the
   * frames the section pushed onto the stack.
   */
  lookup(name) {
    const isPath = name.includes('.')
    for (let index = this.frames.length - 1; index >= 0; index -= 1) {
      const frame = this.frames[index]
      if (!isPath) {
        const found = readKey(frame, name)
        if (found.found) return found.value
        continue
      }
      const resolved = resolveInFrame(frame, name)
      if (resolved.found) return resolved.value
    }
    return undefined
  }
}

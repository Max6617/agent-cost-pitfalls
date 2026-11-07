/**
 * Sections: `{{#name}} ... {{/name}}`.
 *
 * A section decides how many times its block is rendered and what the block can
 * see while it renders. The truthiness rule is shared with the inverted
 * sections in inverted.js; both are written up in docs/template-rules.md §4-§6.
 */

/**
 * The one truthiness rule of the engine.
 *
 * Falsy is: `false`, `0`, the empty string, `null`, `undefined`, a name that
 * resolved to nothing, and a list with no elements. Everything else - including
 * the empty object and the string `"0"` - is truthy.
 */
export function isTruthy(value) {
  if (Array.isArray(value)) return value.length > 0
  if (value === false || value === null || value === undefined) return false
  if (value === 0 || value === '') return false
  return true
}

export function renderSection(node, context, env, render) {
  const value = context.lookup(node.name)
  if (!isTruthy(value)) return ''

  if (Array.isArray(value)) {
    let output = ''
    for (const item of value) output += render(node.children, context.push(item), env)
    return output
  }

  if (value === true) return render(node.children, context, env)

  // An object or any other truthy value is the frame for its block, and the
  // frames it was written inside stay reachable underneath it.
  return render(node.children, context.push(value), env)
}

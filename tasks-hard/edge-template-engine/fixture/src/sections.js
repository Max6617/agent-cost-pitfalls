/**
 * Sections: `{{#name}} ... {{/name}}`.
 *
 * A section decides how many times its block is rendered and what the block can
 * see while it renders. The truthiness rule is shared with the inverted
 * sections in inverted.js; both are written up in docs/template-rules.md §4-§6.
 */
import { Context } from './context.js'

/**
 * The one truthiness rule of the engine.
 *
 * Everything that is not falsy renders a section once. Falsy is: `false`,
 * `null`, `undefined`, a name that resolved to nothing, and a list with no
 * elements.
 */
export function isTruthy(value) {
  if (Array.isArray(value)) return value.length > 0
  if (value === false || value === null || value === undefined) return false
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

  if (typeof value === 'object') {
    // An object is a record: its block renders once, against the object.
    return render(node.children, Context.root(value), env)
  }

  return render(node.children, context.push(value), env)
}

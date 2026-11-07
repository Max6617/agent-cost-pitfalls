/**
 * Inverted sections: `{{^name}} ... {{/name}}`.
 *
 * The block renders when there is nothing to show for the name - the section
 * would render zero times, which is exactly what the shared truthiness rule
 * says. See docs/template-rules.md §6.
 */
import { isTruthy } from './sections.js'

export function renderInverted(node, context, env, render) {
  const value = context.lookup(node.name)
  if (!isTruthy(value)) {
    return render(node.children, context, env)
  }
  return ''
}

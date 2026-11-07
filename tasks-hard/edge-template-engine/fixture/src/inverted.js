/**
 * Inverted sections: `{{^name}} ... {{/name}}`.
 *
 * The block renders when there is nothing to show for the name - the section
 * would render zero times. See docs/template-rules.md §6.
 */
export function renderInverted(node, context, env, render) {
  const value = context.lookup(node.name)
  if (value === undefined || value === null || value === false) {
    return render(node.children, context, env)
  }
  return ''
}

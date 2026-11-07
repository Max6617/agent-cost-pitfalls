/**
 * Partial templates: `{{> name}}`.
 *
 * Partials are passed in by the caller as a map of name to template source -
 * the engine never reads a file. See docs/template-rules.md §8.
 */
export function renderPartial(node, context, env, render) {
  const source = env.partials[node.name]
  if (typeof source !== 'string') throw new Error('unknown partial: ' + node.name)

  const nodes = env.parse(source)
  const output = render(nodes, context, env)
  return indentFragment(output, node.indent)
}

/**
 * A fragment that starts its line is written at that indentation wherever it
 * lands.
 */
function indentFragment(text, indent) {
  if (!indent || !text) return text
  const lines = text.split('\n')
  lines[0] = indent + lines[0]
  return lines.join('\n')
}

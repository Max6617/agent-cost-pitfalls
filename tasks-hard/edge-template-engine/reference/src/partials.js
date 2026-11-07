/**
 * Partial templates: `{{> name}}`.
 *
 * Partials are passed in by the caller as a map of name to template source -
 * the engine never reads a file. See docs/template-rules.md §8.
 */
export function renderPartial(node, context, env, render) {
  const source = env.partials[node.name]
  if (typeof source !== 'string') {
    env.diagnostics.add('missing-partial', { name: node.name })
    return ''
  }

  if (env.depth >= env.maxPartialDepth) {
    env.diagnostics.add('partial-depth', { name: node.name })
    return ''
  }

  const nodes = env.parse(source)
  const output = render(nodes, context, { ...env, depth: env.depth + 1 })
  return indentFragment(output, node.indent)
}

/**
 * A fragment that starts its line is written at that indentation wherever it
 * lands: every non-empty line of it gets the indentation, and a line that is
 * empty stays empty.
 */
function indentFragment(text, indent) {
  if (!indent || !text) return text
  return text
    .split('\n')
    .map((line) => (line === '' ? line : indent + line))
    .join('\n')
}

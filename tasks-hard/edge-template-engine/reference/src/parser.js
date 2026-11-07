/**
 * Parser: token stream in, node tree out.
 *
 * Nodes are
 *   { type: 'text', text }
 *   { type: 'variable', name, escaped }
 *   { type: 'section', name, children }
 *   { type: 'inverted', name, children }
 *   { type: 'partial', name, indent }
 * Comments and delimiter changes never reach the tree.
 */
export function parse(tokens) {
  const root = { type: 'root', children: [] }
  const open = [root]

  for (const token of tokens) {
    const parent = open[open.length - 1]

    if (token.type === 'text') {
      parent.children.push({ type: 'text', text: token.value })
      continue
    }

    switch (token.sigil) {
      case '#': {
        const node = { type: 'section', name: token.name, children: [] }
        parent.children.push(node)
        open.push(node)
        break
      }
      case '^': {
        const node = { type: 'inverted', name: token.name, children: [] }
        parent.children.push(node)
        open.push(node)
        break
      }
      case '/': {
        if (open.length > 1) open.pop()
        break
      }
      case '!':
        break
      case '>':
        parent.children.push({ type: 'partial', name: token.name, indent: token.indent })
        break
      case '=':
        break
      case '{':
      case '&':
        parent.children.push({ type: 'variable', name: token.name, escaped: false })
        break
      default:
        parent.children.push({ type: 'variable', name: token.name, escaped: true })
    }
  }

  return root.children
}

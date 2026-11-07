/**
 * The renderer: walks the node tree with a frame stack and a bag of render
 * state, and appends strings.
 *
 * `env` carries everything that is not data: the partial map, the inclusion
 * depth, the diagnostics collector, and the parse function partials are read
 * with. It is never mutated during a render; a partial that needs a deeper
 * inclusion level spreads a copy.
 */
import { escapeHtml } from './escape.js'
import { renderSection } from './sections.js'
import { renderInverted } from './inverted.js'
import { renderPartial } from './partials.js'

export function renderNodes(nodes, context, env) {
  let output = ''
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        output += node.text
        break
      case 'variable':
        output += renderVariable(node, context)
        break
      case 'section':
        output += renderSection(node, context, env, renderNodes)
        break
      case 'inverted':
        output += renderInverted(node, context, env, renderNodes)
        break
      case 'partial':
        output += renderPartial(node, context, env, renderNodes)
        break
      default:
        break
    }
  }
  return output
}

/**
 * `{{name}}` and its verbatim spellings. A name that resolved to nothing, to
 * `null` or to `undefined` contributes no text at all; every other value is
 * stringified, including `0` and `false`.
 */
function renderVariable(node, context) {
  const resolved = node.name === '.' ? implicitFrame(context) : context.lookup(node.name)
  if (resolved === undefined || resolved === null) return ''
  const text = String(resolved)
  return node.escaped ? escapeHtml(text) : text
}

/**
 * `{{.}}` - the implicit iterator. Inside `{{#items}}` over a list of scalars it
 * is the element itself, whatever the element is. A frame that is an object or
 * a list has no string form of its own and renders as nothing.
 */
function implicitFrame(context) {
  const frame = context.current()
  if (frame === null || frame === undefined) return undefined
  if (typeof frame === 'object') return undefined
  return frame
}

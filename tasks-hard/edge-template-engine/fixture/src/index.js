/**
 * templates - public surface.
 *
 * The notification service, the email builders and the preview tool are only
 * allowed to import from this file. Everything else under src/ is internal and
 * may be reorganised; the names below may not.
 *
 *   render(source, data, options)          -> string
 *   renderDetailed(source, data, options)  -> { output, diagnostics }
 *   compile(source, options)               -> (data, options) => string
 *   escapeHtml(value)                      -> string
 *
 * Options: { partials, maxPartialDepth, delimiters }.
 */
import { scan } from './scanner.js'
import { parse } from './parser.js'
import { renderNodes } from './render.js'
import { Context } from './context.js'

export { scan } from './scanner.js'
export { parse } from './parser.js'
export { escapeHtml, needsEscaping } from './escape.js'
export { Context, lookupInFrame } from './context.js'
export { isTruthy } from './sections.js'

/** How deep partials may nest before the engine stops including them. */
export const DEFAULT_PARTIAL_DEPTH = 8

function parseTemplate(source, delimiters) {
  return parse(scan(source, delimiters))
}

function createEnv(options, diagnostics) {
  return {
    partials: options.partials ?? {},
    maxPartialDepth: options.maxPartialDepth ?? DEFAULT_PARTIAL_DEPTH,
    diagnostics,
    depth: 0,
    parse: (source) => parseTemplate(source),
  }
}

function createDiagnostics() {
  const entries = []
  return {
    entries,
    add(code, detail = {}) {
      entries.push({ code, ...detail })
    },
  }
}

/** Renders a template and throws away anything the engine wanted to report. */
export function render(source, data = {}, options = {}) {
  return renderDetailed(source, data, options).output
}

/**
 * Renders a template and returns the diagnostics as well. The notification
 * service logs them: a template that reaches a customer with a partial missing
 * is a bug report waiting to happen.
 */
export function renderDetailed(source, data = {}, options = {}) {
  const diagnostics = createDiagnostics()
  const env = createEnv(options, diagnostics)
  const nodes = parseTemplate(source, options.delimiters)
  return { output: renderNodes(nodes, Context.root(data), env), diagnostics: diagnostics.entries }
}

/**
 * Parses once, renders many times - the service compiles its templates at boot
 * and renders them per message.
 */
export function compile(source, options = {}) {
  const nodes = parseTemplate(source, options.delimiters)
  return (data = {}, callOptions = {}) => {
    const diagnostics = createDiagnostics()
    const env = createEnv({ ...options, ...callOptions }, diagnostics)
    return renderNodes(nodes, Context.root(data), env)
  }
}

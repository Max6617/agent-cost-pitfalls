#!/usr/bin/env node
/**
 * Renders one template, for poking at the engine by hand:
 *
 *   node bin/render-template.js '{{name}}' '{"name":"Ada"}'
 *   node bin/render-template.js '  {{>row}}' '{"n":1}' --partials '{"row":"{{n}}\n{{n}}"}'
 *   node bin/render-template.js '{{user.name}}' '{}' --diagnostics --one-line
 */
import { render, renderDetailed } from '../src/index.js'
import { collapseWhitespace } from '../src/util/text.js'

const [source, dataJson, ...flags] = process.argv.slice(2)
if (!source) {
  console.error('usage: node bin/render-template.js <template> [json] [--partials json] [--diagnostics] [--one-line]')
  process.exit(2)
}

const flagValue = (name) => {
  const index = flags.indexOf(name)
  return index === -1 ? null : flags[index + 1]
}

const parseJson = (raw, what) => {
  if (raw === null || raw === undefined || raw === '') return {}
  try {
    return JSON.parse(raw)
  } catch (error) {
    console.error(what + ' is not JSON: ' + error.message)
    process.exit(2)
  }
}

const data = parseJson(dataJson, 'data')
const partials = parseJson(flagValue('--partials'), 'partials')
const oneLine = flags.includes('--one-line')
const showDiagnostics = flags.includes('--diagnostics')

const result = showDiagnostics
  ? renderDetailed(source, data, { partials })
  : { output: render(source, data, { partials }), diagnostics: [] }

process.stdout.write((oneLine ? collapseWhitespace(result.output) : result.output) + '\n')
for (const diagnostic of result.diagnostics) console.error('diagnostic: ' + JSON.stringify(diagnostic))

/**
 * Job-log formatting for the backup tool.
 *
 * The tool logs one line per job: the pattern list, the options it ran with, and
 * the number of paths each pattern contributed. Nothing here decides anything;
 * it exists so a support engineer can see what a job actually asked for.
 */
import { compile } from './compile.js'

export function describePatternList(patterns, options) {
  const suffix = (options?.dot ? ' dot' : '') + (options?.nocase ? ' nocase' : '')
  return patterns.map((pattern) => {
    const kind = pattern.startsWith('!') ? 'exclude' : 'include'
    return kind + ' ' + JSON.stringify(pattern) + suffix
  })
}

export function summarizeSelection(selected, candidates) {
  const total = candidates.length
  const kept = selected.length
  return 'selected ' + kept + '/' + total + ' paths (' + (total - kept) + ' skipped)'
}

export function explainPattern(pattern, path, options) {
  const matcher = compile(pattern, options)
  return matcher.describe() + ' vs ' + JSON.stringify(path) + ' -> ' + matcher.test(path)
}

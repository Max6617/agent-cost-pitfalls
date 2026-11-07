/**
 * The public surface of the toolkit.
 *
 * A report, a config reader and an export all render numbers the same way, and
 * this is the only module the reports are allowed to import from. Everything
 * below it is an implementation detail that may be reorganised.
 */
export { format, group } from './format.js'
export { precise } from './precision.js'
export { parseNumber, tryParseNumber } from './parse.js'
export { groupDigits, groupRendered } from './grouping.js'
export { usesScientific } from './notation.js'
export { renderReport, reportWidth, columnWidth } from './report/report.js'
export { readNumber, readNumberOr, readViewOptions } from './report/config.js'
export { csv, csvRow } from './report/csv.js'
export { loadSamples, bySeries } from './data.js'
export {
  GROUP_SEPARATOR,
  GROUP_SIZE,
  GROUP_MIN_DIGITS,
  DECIMAL_SEPARATOR,
  DEFAULT_DIGITS,
  DEFAULT_SIGNIFICANT,
  MIN_EXPONENT,
  MAX_EXPONENT,
  SPECIAL_VALUES,
} from './rules.js'

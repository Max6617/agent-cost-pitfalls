/**
 * Config reading.
 *
 * A config file is written by a human, so it holds numbers the way a human
 * writes them: with separators copied out of a report, with a `+` left over
 * from a spreadsheet, with a space after the comma. The reader takes the text
 * and returns the value, and it is the same reader the report uses.
 */
import { parseNumber, tryParseNumber } from '../parse.js'

/** Read one config field, falling back to a default when it is absent. */
export function readNumber(source, key, fallback) {
  const raw = source[key]
  if (raw === undefined || raw === null || raw === '') return fallback
  return parseNumber(raw)
}

/** Read one config field without the throw: a bad value reads as absent. */
export function readNumberOr(source, key, fallback) {
  const raw = source[key]
  if (raw === undefined || raw === null || raw === '') return fallback
  const value = tryParseNumber(raw)
  return value === undefined ? fallback : value
}

/** The report options a config file carries. */
export function readViewOptions(config) {
  return {
    title: typeof config.title === 'string' ? config.title : 'Untitled report',
    digits: readNumberOr(config, 'digits', 2),
    grouping: config.grouping !== false,
    significant: config.significant === null || config.significant === undefined
      ? undefined
      : readNumberOr(config, 'significant', undefined),
    unitSuffix: typeof config.unitSuffix === 'string' ? config.unitSuffix : '',
    csvDelimiter: typeof config.csvDelimiter === 'string' ? config.csvDelimiter : ',',
  }
}

import { tokenize, breakLong } from './words.js'
import { fits } from './measure.js'
import { prefixFor, limitFor } from './indent.js'
import { checkOptions } from './validate.js'

// Wrap the tokens of one hard line into as few output lines as the budget
// allows. `lines.length` is always the index of the line being built, which
// is what drives the first-line / continuation-line distinction.
function wrapTokens(tokens, width, indent) {
  const lines = []
  let content = ''
  let used = 0

  const flush = () => {
    lines.push(prefixFor(indent, lines.length) + content)
    content = ''
    used = 0
  }

  for (const { word, gap } of tokens) {
    const sep = gap === null ? '' : gap.text
    const sepWidth = gap === null ? 0 : gap.text.length
    if (used > 0 && !fits(used, sepWidth, word.length, limitFor(width, indent, lines.length))) {
      flush()
    }
    if (used === 0) {
      // The first word on a line always lands; a word longer than the
      // line's budget overflows whole and stands alone on its line.
      const parts = breakLong(word, limitFor(width, indent, lines.length))
      for (let k = 0; k < parts.length; k++) {
        if (k > 0) flush()
        content = parts[k]
        used = parts[k].length
        if (parts[k].length > limitFor(width, indent, lines.length)) flush()
      }
    } else {
      content += sep + word
      used += sepWidth + word.length
    }
  }
  if (content !== '') flush()
  return lines
}

export function wrapLines(text, width, options = {}) {
  const indent = options.indent ?? 0
  checkOptions(width, indent)
  const out = []
  for (const hard of String(text).split('\n')) {
    const tokens = tokenize(hard)
    if (tokens.length === 0) out.push('')
    else out.push(...wrapTokens(tokens, width, indent))
  }
  return out
}

export function wrap(text, width, options = {}) {
  return wrapLines(text, width, options).join('\n')
}

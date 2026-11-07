/**
 * Accent folding.
 *
 * A pinned, hand-maintained mapping: a character either appears in this
 * table or it does not fold at all. No other normalisation is applied.
 * docs/slug-rules.md §2 pins the same table - keep the two in sync.
 */
export const FOLD_TABLE = {
  // a
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
  'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
  // c
  'ç': 'c', 'Ç': 'C',
  // d
  'đ': 'd', 'Đ': 'D',
  // e
  'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
  'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
  // i
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
  'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
  // l
  'ł': 'l', 'Ł': 'L',
  // n
  'ñ': 'n', 'Ñ': 'N',
  // o
  'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o',
  'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'Ø': 'O',
  // u
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
  'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
  // y
  'ý': 'y', 'ÿ': 'y', 'Ý': 'Y',
  // multi-letter folds
  'æ': 'ae', 'Æ': 'AE',
  'œ': 'oe', 'Œ': 'OE',
  'ß': 'ss',
  'þ': 'th', 'Þ': 'TH',
}

/** Fold every character of `text` through the table. */
export function foldAccents(text) {
  let out = ''
  for (const ch of String(text)) out += FOLD_TABLE[ch] ?? ch
  return out
}

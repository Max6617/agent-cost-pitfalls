/**
 * number-audit.mjs - every number stated beside a citation, checked against the file it cites.
 *
 * WHY THIS EXISTS. Twice in two days a number went stale while the JSON underneath it moved, and both
 * times the prose kept the old value because nothing compared the two: the artifact count said 97 after
 * the manifest reached 99, and notes/records/STEP2-RECONCILIATION.md said the request body grows monotonically in
 * 77% of transitions when the filed meanGrowthFraction is 0.8402 (84.0%). The count is now pinned by
 * tools/artifact-coverage.test.mjs. Nothing pinned the wider class, and hand review had missed it twice.
 *
 * WHAT IT DOES. A document is split into paragraphs. For each paragraph that cites a filed JSON (a
 * backticked analysis/**, results/** or artifact/** path ending in .json), every percentage, pp value
 * and decimal number in that paragraph must be derivable from one of the cited files: it matches if
 * some number in the file equals it after rounding to the token's own precision, at scale 1, x100 (a
 * fraction printed as a percent) or /100. Rounding is allowed because the paper prints rounded values;
 * sign and absolute value are both accepted because a sentence may quote a magnitude.
 *
 * IT IS A LOCATOR, NOT A PROOF. A hit means "this number is not in the file this sentence points at".
 * Every hit needs a human verdict: usually a DERIVED value (a gap, a sum, a row count), occasionally a
 * value from a table two lines up, and every so often the stale number this tool exists to find. It
 * cannot see numbers in paragraphs with no citation, integers without a unit, or anything sourced from
 * a cited .md file. It exits 0 by default and prints the reading list; --strict exits 1 on any hit.
 *
 * USAGE
 *   node tools/number-audit.mjs
 *   node tools/number-audit.mjs --doc notes/records/STEP2-RECONCILIATION.md --doc METHODS.md
 *   node tools/number-audit.mjs --json analysis/number-audit.json --strict
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const BT = String.fromCharCode(96)
const PATH_RE = new RegExp(BT + '((?:analysis|results|artifact)/[\\w./-]+\\.json)' + BT, 'g')
const TOKEN_RE = /([+-]?\d+(?:\.\d+)?)\s?(%|pp\b)?/g

/** Paragraphs with the line number each starts on. */
export function paragraphs (text) {
  const out = []
  const lines = text.split('\n')
  let buf = []
  let start = 1
  const flush = (end) => {
    if (buf.length) out.push({ start, end, text: buf.join('\n') })
    buf = []
  }
  lines.forEach((line, i) => {
    if (line.trim() === '') { flush(i); start = i + 2; return }
    if (!buf.length) start = i + 1
    buf.push(line)
  })
  flush(lines.length)
  return out
}

/** Every number inside a JSON value, recursively. Bare numeric strings count; prose strings do not. */
export function numbersIn (value, out = []) {
  if (typeof value === 'number') { if (Number.isFinite(value)) out.push(value); return out }
  if (typeof value === 'string') {
    const m = value.trim().match(/^[+-]?\d+(?:\.\d+)?$/)
    if (m) out.push(Number(m[0]))
    return out
  }
  if (Array.isArray(value)) { for (const v of value) numbersIn(v, out); return out }
  if (value && typeof value === 'object') { for (const v of Object.values(value)) numbersIn(v, out) }
  return out
}

const decimals = (tok) => (tok.includes('.') ? tok.split('.')[1].length : 0)

/** True when some value, scaled by 1, x100 or /100, rounds to the token at the token's precision. */
export function derivable (token, values) {
  const t = Math.abs(Number(token))
  if (!Number.isFinite(t)) return false
  const dp = decimals(token)
  const eps = 0.5 * 10 ** -(dp + 6)
  for (const v of values) {
    for (const scale of [1, 100, 0.01]) {
      const scaled = Math.abs(v * scale)
      if (Math.abs(Number(scaled.toFixed(dp)) - t) < eps || Math.abs(scaled - t) < eps) return true
    }
  }
  return false
}

/** The audit itself: pure, given a resolver that returns parsed JSON or null. */
export function auditDocument (text, resolve) {
  const corpus = new Map()
  const valuesFor = (p) => {
    if (!corpus.has(p)) {
      const json = resolve(p)
      corpus.set(p, json === null || json === undefined ? null : numbersIn(json))
    }
    return corpus.get(p)
  }
  const hits = []
  let checked = 0
  for (const para of paragraphs(text)) {
    const cited = [...new Set([...para.text.matchAll(PATH_RE)].map((m) => m[1]))]
    if (!cited.length) continue
    const values = cited.flatMap((p) => valuesFor(p) ?? [])
    const unresolved = cited.filter((p) => valuesFor(p) === null)
    for (const m of para.text.matchAll(TOKEN_RE)) {
      const [full, num, unit] = m
      if (!unit && !num.includes('.')) continue
      const before = para.text.slice(Math.max(0, m.index - 12), m.index)
      // Model names and cross-references are not measurements: V4.1, GLM-5.3, §3.8, "section 3.8".
      if (/[A-Za-z0-9§]$/.test(before) || /[A-Za-z]-$/.test(before)) continue
      if (/(?:section|amendment|step|limitation|item|version)\s*$/i.test(before)) continue
      // arXiv identifiers look exactly like decimals.
      if (/arXiv:\s*$/.test(before) || /^\d{4}\.\d{4,5}$/.test(num)) continue
      checked++
      const quote = para.text.slice(Math.max(0, m.index - 35), m.index + full.length + 15).replace(/\s+/g, ' ')
      if (unresolved.length === cited.length) {
        hits.push({ line: para.start, token: full, cites: cited, quote, note: 'cited file not resolvable' })
        continue
      }
      if (!derivable(num, values)) hits.push({ line: para.start, token: full, cites: cited, quote })
    }
  }
  return { checked, hits, citedFiles: [...corpus.keys()].sort() }
}

export function resolveRepoJson (repo) {
  return (p) => {
    try { return JSON.parse(readFileSync(repo + '/' + p, 'utf8')) } catch { return null }
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const argv = process.argv.slice(2)
  const docs = []
  for (let i = 0; i < argv.length; i++) if (argv[i] === '--doc') docs.push(argv[i + 1])
  const resolve = resolveRepoJson(process.cwd())
  const targets = docs.length ? docs : ['PAPER.md']
  const report = { generated: new Date().toISOString(), documents: [] }
  let totalHits = 0
  for (const doc of targets) {
    if (!existsSync(doc)) { console.error('no such document: ' + doc); process.exit(2) }
    const r = auditDocument(readFileSync(doc, 'utf8'), resolve)
    totalHits += r.hits.length
    report.documents.push({ doc, checked: r.checked, hits: r.hits, citedFiles: r.citedFiles })
    console.log(doc + ': ' + r.checked + ' numbers checked against ' + r.citedFiles.length + ' cited file(s), ' + r.hits.length + ' not found in them')
    const lines = [...new Set(r.hits.map((h) => h.line))]
    console.log('  lines with hits: ' + (lines.slice(0, 40).map((l) => 'L' + l).join(' ') || 'none'))
  }
  const ji = argv.indexOf('--json')
  if (ji >= 0 && argv[ji + 1]) {
    const p = argv[ji + 1]
    mkdirSync(dirname(p) || '.', { recursive: true })
    writeFileSync(p, JSON.stringify(report, null, 1) + '\n')
    console.log('wrote ' + p)
  }
  console.log(totalHits === 0
    ? 'NO HITS: every number beside a citation is derivable from the file it cites.'
    : 'HITS ARE A READING LIST, NOT A VERDICT: each needs a human call (derived value, table value, or stale).')
  process.exit(argv.includes('--strict') && totalHits > 0 ? 1 : 0)
}

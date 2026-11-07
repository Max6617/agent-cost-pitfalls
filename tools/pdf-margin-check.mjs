/**
 * pdf-margin-check.mjs - the layout check of record, as a command instead of a paragraph.
 *
 * WHY THIS EXISTS. The author cannot see images, so layout is verified mechanically: the build must
 * report 0 overfull hboxes, and then the pages must be checked for ink the hbox count cannot see. That
 * second check earned its place - it found five bibliography pages reaching 4pt past the right margin
 * through \url{} while the overfull count stayed 0, which is why xurl is in the preamble. But it lived
 * in a handover as prose, and the prose claimed "zero pages with ink outside the text block", which the
 * same measurement refutes on every page under a strict reading: the running folio sits in the bottom
 * margin by design, and microtype deliberately protrudes line-initial and line-final punctuation past
 * the block. Neither is a defect, and a check that cannot separate them from a real overrun is not
 * evidence. This tool separates them and prints the number to believe.
 *
 * IT MEASURES THE TEXT LAYER, NOT INK. pdftotext -bbox gives per-word boxes in points, so the verdict
 * is exact and reproducible; rasterising and thresholding ink at 72dpi adds a pixel of bleed in each
 * direction and made 1pt of it indistinguishable from a defect. Protrusion is not in the text layer, so
 * a word box that crosses the block is a genuine layout position, not a glyph overhang.
 *
 * WHAT IT REPORTS, and why each is or is not a defect:
 *   above-top      yMin above the top margin            DEFECT (nothing is ever set there)
 *   left / right   crossing the block by > --protrusion DEFECT (microtype's own budget is below that)
 *   below-bottom   a word box STARTING below the block  DEFECT (a line set past the last baseline)
 *   folio          starting in the band below the block not a defect: the page number
 *   protrusion     lateral crossing within budget       not a defect: microtype, by design
 *   descent        yMax below the block, yMin above it  not a defect: the last line's baseline IS the
 *                                                       block's bottom edge, so its descent hangs below
 *                                                       it by design (measured: 2.12pt at 11pt type)
 *
 * USAGE
 *   node tools/pdf-margin-check.mjs [--pdf paper/PAPER.pdf] [--margin 72] [--protrusion 5]
 *                                   [--folio-gap 15] [--depth 2] [--json analysis/....json] [--quiet]
 * Exit code is 0 only when there are no findings. --json writes the full per-page measurement.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { safeClean } from './safe-fs.mjs'

export const DEFAULTS = { margin: 72, protrusion: 5, folioGap: 15, topTol: 0.5 }

/**
 * Classify one page's word boxes against the text block. Pure: takes parsed words, returns a verdict.
 * Word boxes are in points from the top-left of the page, as pdftotext -bbox emits them.
 */
export function classifyPage (page, options = {}) {
  const o = { ...DEFAULTS, ...options }
  const { width, height } = page
  const blk = { left: o.margin, right: width - o.margin, top: o.margin, bottom: height - o.margin }
  const findings = []
  const folio = []
  const crossing = { left: 0, right: 0 }
  let descent = 0
  for (const w of page.words) {
    if (w.yMin < blk.top - o.topTol) {
      findings.push({ kind: 'above-top', word: w.text, over: +(blk.top - w.yMin).toFixed(2) })
    }
    const overLeft = blk.left - w.xMin
    const overRight = w.xMax - blk.right
    const lateral = Math.max(overLeft, overRight)
    if (lateral > 0) {
      const side = overLeft > overRight ? 'left' : 'right'
      crossing[side] = Math.max(crossing[side], lateral)
      if (lateral > o.protrusion) {
        findings.push({ kind: 'crosses-' + side, word: w.text, over: +lateral.toFixed(2) })
      }
    }
    if (w.yMin > blk.bottom) {
      // A word box that STARTS below the block's bottom edge is a line set past the last baseline. The
      // last line of a full page sits with its baseline ON that edge, so its descender box crosses it
      // (measured: 2.12pt) - that is the descent, not an overrun, which is why the test is on yMin.
      if (w.yMin >= blk.bottom + o.folioGap) folio.push(w.text)
      else findings.push({ kind: 'below-bottom', word: w.text, over: +(w.yMin - blk.bottom).toFixed(2) })
    } else if (w.yMax > blk.bottom) {
      descent = Math.max(descent, w.yMax - blk.bottom)
    }
  }
  return {
    size: { width, height },
    block: blk,
    words: page.words.length,
    folio: folio.length,
    protrusion: { left: +crossing.left.toFixed(2), right: +crossing.right.toFixed(2) },
    descent: +descent.toFixed(2),
    findings,
  }
}

export function parseBbox (xml) {
  const pages = []
  for (const chunk of xml.split('<page ').slice(1)) {
    const dim = chunk.match(/width="([\d.]+)"\s+height="([\d.]+)"/)
    if (!dim) continue
    const words = []
    for (const m of chunk.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)) {
      words.push({
        xMin: +m[1], yMin: +m[2], xMax: +m[3], yMax: +m[4],
        text: m[5].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      })
    }
    pages.push({ width: +dim[1], height: +dim[2], words })
  }
  return pages
}

export function findPdftotext (explicit) {
  const named = explicit || 'pdftotext'
  try {
    execFileSync(named, ['-v'], { stdio: 'ignore' })
    return named
  } catch {}
  const root = process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs', 'poppler')
  if (root && existsSync(root)) {
    for (const dir of readdirSync(root)) {
      const candidate = join(root, dir, 'Library', 'bin', 'pdftotext.exe')
      if (existsSync(candidate)) return candidate
    }
  }
  throw new Error('pdftotext not found: put poppler on PATH or pass --pdftotext <path>')
}

export function measure (pdf, options = {}) {
  const bin = options.pdftotext || findPdftotext(options.pdftotext)
  // The 'dsh-exp-' prefix is what makes this a DESIGNATED SCRATCH ROOT, so safeClean accepts it: no
  // file in this repo removes a directory by itself (tools/safe-fs.mjs, and the test that enforces
  // it). A 'pdf-margin-' name would be refused, and the refusal is the point.
  const dir = mkdtempSync(join(tmpdir(), 'dsh-exp-margin-'))
  try {
    const out = join(dir, 'bbox.xml')
    execFileSync(bin, ['-bbox', pdf, out])
    const pages = parseBbox(readFileSync(out, 'utf8')).map((p) => classifyPage(p, options))
    return {
      pdf,
      pages: pages.length,
      pageSize: pages[0] ? pages[0].size : null,
      margin: options.margin ?? DEFAULTS.margin,
      block: pages[0] ? pages[0].block : null,
      findings: pages.flatMap((p, i) => p.findings.map((f) => ({ page: i + 1, ...f }))),
      folioPages: pages.filter((p) => p.folio > 0).length,
      protrusion: {
        left: Math.max(0, ...pages.map((p) => p.protrusion.left)),
        right: Math.max(0, ...pages.map((p) => p.protrusion.right)),
      },
      descent: Math.max(0, ...pages.map((p) => p.descent)),
      perPage: pages.map((p, i) => ({ page: i + 1, words: p.words, folio: p.folio, descent: p.descent, protrusion: p.protrusion, findings: p.findings.length })),
    }
  } finally {
    safeClean(dir)
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const argv = process.argv.slice(2)
  const arg = (name, fallback) => {
    const i = argv.indexOf('--' + name)
    return i >= 0 ? argv[i + 1] : fallback
  }
  const pdf = arg('pdf', 'paper/PAPER.pdf')
  if (!existsSync(pdf)) {
    console.error('no such PDF: ' + pdf)
    process.exit(2)
  }
  const options = {
    margin: +arg('margin', DEFAULTS.margin),
    protrusion: +arg('protrusion', DEFAULTS.protrusion),
    folioGap: +arg('folio-gap', DEFAULTS.folioGap),
    topTol: +arg('top-tol', DEFAULTS.topTol),
    pdftotext: arg('pdftotext', undefined),
  }
  const result = measure(pdf, options)
  if (!argv.includes('--quiet')) {
    console.log('pdf-margin-check: ' + pdf + ', ' + result.pages + ' pages, text block ' +
      '[' + result.block.left.toFixed(0) + ', ' + result.block.right.toFixed(0) + '] x [' +
      result.block.top.toFixed(0) + ', ' + result.block.bottom.toFixed(0) + '] pt (margin ' + options.margin + 'pt)')
    console.log('  folio in the bottom margin on ' + result.folioPages + ' of ' + result.pages + ' pages (page numbers; not a defect)')
    console.log('  worst microtype protrusion past the block: left ' + result.protrusion.left.toFixed(2) +
      'pt, right ' + result.protrusion.right.toFixed(2) + 'pt (budget ' + options.protrusion + 'pt; not a defect)')
    console.log('  deepest descender below the block: ' + result.descent.toFixed(2) + 'pt (the last line\'s baseline is the block edge; not a defect)')
    for (const f of result.findings) {
      console.log('  FINDING page ' + f.page + ': ' + f.kind + ' ' + f.over + 'pt - ' + JSON.stringify(f.word))
    }
    console.log(result.findings.length === 0
      ? '  PASS: no word in the text layer is outside the block beyond the folio band and the protrusion budget'
      : '  FAIL: ' + result.findings.length + ' finding(s)')
  }
  const json = arg('json', undefined)
  if (json) writeFileSync(json, JSON.stringify({ generated: new Date().toISOString(), ...result }, null, 2) + '\n')
  process.exit(result.findings.length === 0 ? 0 : 1)
}

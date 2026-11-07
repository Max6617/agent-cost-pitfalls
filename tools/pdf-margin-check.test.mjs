/**
 * pdf-margin-check.test.mjs - the layout check must be able to fail, and must not fire on the three
 * things that are not defects.
 *
 * The tool exists because the prose version of this check ("zero pages with ink outside the block")
 * could not be reproduced: a strict reading flags every page, and the difference between the folio in
 * the bottom margin, microtype's deliberate protrusion, and a line set past the last baseline has to be
 * computable or the check is decoration. These cases pin that boundary with synthetic boxes, so the
 * boundary can be seen to hold without rebuilding the PDF.
 *
 * Run: node --test tools/pdf-margin-check.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyPage, parseBbox, DEFAULTS } from './pdf-margin-check.mjs'

const LETTER = { width: 612, height: 792 }
const box = (xMin, yMin, xMax, yMax, text = 'w') => ({ xMin, yMin, xMax, yMax, text })
const page = (words) => classifyPage({ ...LETTER, words })
const kinds = (r) => r.findings.map((f) => f.kind)

test('a clean page has no findings', () => {
  const r = page([box(100, 100, 200, 110, 'text'), box(100, 200, 300, 210, 'more')])
  assert.deepEqual(r.findings, [])
  assert.equal(r.folio, 0)
  assert.equal(r.descent, 0)
})

test('the folio in the bottom margin is counted, not reported', () => {
  const r = page([box(300, 745, 312, 752, '9')])
  assert.deepEqual(r.findings, [])
  assert.equal(r.folio, 1)
})

test('the last line of a full page is descent, not an overrun', () => {
  // The block's bottom edge is 720; a full page's last baseline sits ON it, so the word's box crosses
  // the edge while its top (yMin 712.2) stays inside. Measured on the real PDF: 2.12pt.
  const r = page([box(100, 712.23, 300, 722.12, 'Claude')])
  assert.deepEqual(r.findings, [])
  assert.equal(r.descent.toFixed(2), '2.12')
})

test('a line STARTING below the block is a finding', () => {
  const r = page([box(100, 725, 300, 735, 'overrun')])
  assert.deepEqual(kinds(r), ['below-bottom'])
  assert.equal(r.findings[0].over, 5)
})

test('microtype protrusion inside the budget is not a finding, a real overrun is', () => {
  const protrudes = page([box(67.54, 584, 78.69, 594, '---')]) // the measured left extreme of the build
  assert.deepEqual(protrudes.findings, [])
  assert.equal(protrudes.protrusion.left.toFixed(2), '4.46')

  const overrun = page([box(64, 100, 200, 110, 'wide')]) // 8pt into the margin
  assert.deepEqual(kinds(overrun), ['crosses-left'])
  assert.equal(overrun.findings[0].over, 8)
})

test('the budget is a parameter, so the boundary can be moved and re-seen', () => {
  const words = [box(67.54, 584, 78.69, 594, '---')]
  assert.deepEqual(classifyPage({ ...LETTER, words }, { protrusion: 4 }).findings.length, 1,
    'at a 4pt budget the same 4.46pt crossing must be reported')
  assert.equal(DEFAULTS.protrusion, 5)
})

test('a word above the top margin is a finding', () => {
  const r = page([box(100, 60, 200, 70, 'high')])
  assert.deepEqual(kinds(r), ['above-top'])
})

test('the parser reads the pages and words pdftotext -bbox writes', () => {
  const xml = '<?xml version="1.0"?><html><body><doc>' +
    '<page width="612.000000" height="792.000000">' +
    '<word xMin="72.000000" yMin="100.000000" xMax="100.000000" yMax="110.000000">a&amp;b</word>' +
    '</page></doc></body></html>'
  const pages = parseBbox(xml)
  assert.equal(pages.length, 1)
  assert.equal(pages[0].width, 612)
  assert.equal(pages[0].words[0].text, 'a&b')
  assert.deepEqual(classifyPage(pages[0]).findings, [])
})

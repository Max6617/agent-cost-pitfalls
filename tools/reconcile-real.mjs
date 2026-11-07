// Anthropic's own per-model, per-hour counts, from their usage export.
const CSV = [
  ['haiku','16:00',872364,5378,145206,25665],
  ['haiku','17:00',10818398,5378,1113246,168404],
  ['haiku','18:00',41134322,5378,3302092,854450],
  ['haiku','19:00',25205552,5378,1564998,502671],
  ['haiku','20:00',56260410,5378,3205288,999538],
  ['sonnet','19:00',6968618,8992,1084032,267963],
  ['sonnet','20:00',22777940,0,3103742,717656],
]
const CARD = { haiku: { miss: 1.00, hit: 0.10, write: 1.25, out: 5.00 }, sonnet: { miss: 2.00, hit: 0.20, write: 2.50, out: 10.00 } }
const T = {}
for (const r of CSV) {
  const m = r[0]
  T[m] = T[m] ?? { noCache: 0, write: 0, read: 0, out: 0 }
  T[m].noCache += r[2]; T[m].write += r[3]; T[m].read += r[4]; T[m].out += r[5]
}
// What OUR gateway counted for haiku, from the last reconcile run.
const OURS = { noCache: 87523166, write: 26890, read: 9320074, out: 2530921 }
let grand = 0
console.log('=== ANTHROPIC\'S OWN PER-MODEL TOTALS ===')
for (const [m, t] of Object.entries(T)) {
  const c = CARD[m]
  const cost = (t.noCache/1e6)*c.miss + (t.write/1e6)*c.write + (t.read/1e6)*c.hit + (t.out/1e6)*c.out
  grand += cost
  console.log('  ' + m.padEnd(8) + 'in ' + t.noCache.toLocaleString().padStart(13) + '  write ' + t.write.toLocaleString().padStart(8) + '  read ' + t.read.toLocaleString().padStart(11) + '  out ' + t.out.toLocaleString().padStart(10))
  console.log('  ' + ''.padEnd(8) + 'cost = $' + cost.toFixed(2))
}
console.log('')
console.log('  REAL ANTHROPIC SPEND TO DATE: $' + grand.toFixed(2))
console.log('')
console.log('=== RECONCILIATION: ours vs theirs, for HAIKU ===')
const pairs = [['uncached input', T.haiku.noCache, OURS.noCache], ['cache WRITE', T.haiku.write, OURS.write], ['cache READ', T.haiku.read, OURS.read], ['output', T.haiku.out, OURS.out]]
for (const [label, theirs, ours] of pairs) {
  const d = (ours - theirs) / theirs * 100
  console.log('  ' + label.padEnd(16) + 'theirs ' + theirs.toLocaleString().padStart(13) + '   ours ' + ours.toLocaleString().padStart(13) + '   ' + (Math.abs(d) < 2 ? 'MATCH' : d.toFixed(1) + '%'))
}
console.log('')
console.log('  THREE OF FOUR MATCH WITHIN 1 PERCENT. Only uncached input is short.')
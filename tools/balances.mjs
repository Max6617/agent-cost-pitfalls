const B = [
  ['Anthropic', 202.54, 'sonnet to completion ($51) + haiku to ~77 percent ($152)'],
  ['Qwen',        0.00, 'nothing so far - tokens used, no charge; recompute from tokens when done'],
  ['Z.AI (GLM)', 32.00, 'GLM-Flash harness completion ($1); NOT GLM-5.3 to parity ($60)'],
  ['OpenAI',     70.00, 'luna full suite (~$18) with room; NOT sol at full parity (~$365)'],
  ['DeepSeek',   12.99, 'its remaining 10-arm work (~$3) - comfortable'],
]
console.log('  ' + 'provider'.padEnd(12) + 'balance'.padStart(10) + '   covers')
let tot = 0
for (const b of B) { tot += b[1]; console.log('  ' + b[0].padEnd(12) + ('$' + b[1].toFixed(2)).padStart(10) + '   ' + b[2]) }
console.log('  ' + ''.padEnd(12) + ('$' + tot.toFixed(2)).padStart(10))
console.log('')
console.log('  the three cheap completions, all affordable now:')
console.log('    DeepSeek cline/goose/openhands   186 runs   ~$3')
console.log('    GLM-Flash harness completion     ~125 runs  ~$1')
console.log('    Qwen to 31 tasks                 ~470 runs  free, apparently')
console.log('                                    ---------------')
console.log('                                     ~$4 total')
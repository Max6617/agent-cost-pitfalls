const R = [
  ['Haiku full 620 (running)', 620, 0.01144, 'measured'],
  ['Sonnet full 620 (running)', 620, 0.02288, 'measured x2'],
  ['GLM-Flash harnesses 186 (running)', 186, 0.00803, 'measured'],
  ['Qwen full 620 (running)', 620, 0.00617, 'measured'],
  ['DeepSeek 10-arm re-run 620', 620, 0.00511, 'measured'],
  ['GLM-5.3 full, 10 arms x 31 x 1 seed', 310, 0.10942, 'measured'],
  ['gpt-6-luna full 620', 620, 0.00484, 'estimated'],
  ['gpt-6.1-sol full 620', 620, 0.08455, 'estimated'],
  ['hard tasks: deepseek 288', 288, 0.073, 'measured'],
  ['hard tasks: glm-flash 288', 288, 0.073, 'measured'],
  ['hard tasks: haiku 96', 96, 0.2656, 'measured'],
]
let run = 0, todo = 0
console.log('  ' + 'item'.padEnd(42) + 'runs'.padStart(5) + 'cost'.padStart(10) + '  basis')
for (const item of R) {
  const label = item[0], n = item[1], c = item[2], basis = item[3]
  const cost = n * c
  const running = label.indexOf('running') >= 0
  if (running) { run += cost } else { todo += cost }
  console.log('  ' + label.padEnd(42) + String(n).padStart(5) + ('$' + cost.toFixed(2)).padStart(10) + '  ' + basis)
}
console.log('')
console.log('  running now   $' + run.toFixed(2))
console.log('  still to buy  $' + todo.toFixed(2))
console.log('  TOTAL         $' + (run + todo).toFixed(2))
console.log('  available     $220.00')
console.log('  headroom      $' + (220 - run - todo).toFixed(2))
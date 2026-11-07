// Prints the ranked results of the sample quiz, the way the export job does.
import { rankAttempts, maxScoreOf } from '../src/index.js'
import { sampleQuiz, sampleAttempts } from '../src/sample.js'

console.log(`${sampleQuiz.title} (max ${maxScoreOf(sampleQuiz)})`)
for (const row of rankAttempts(sampleQuiz, sampleAttempts)) {
  console.log(`${row.rank}\t${row.candidateId}\t${row.total}`)
}

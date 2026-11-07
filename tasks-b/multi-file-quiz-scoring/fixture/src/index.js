/**
 * quiz-scoring - public surface.
 *
 * Everything the reporting job and the exports are allowed to import. Modules
 * under src/ that are not re-exported here are internal and may be reorganised
 * freely; the names below may not.
 */
export { scoreQuestion } from './scoring.js'
export { scoreSection } from './sections.js'
export { scoreQuiz, maxScoreOf } from './quiz.js'
export { rankAttempts } from './ranking.js'

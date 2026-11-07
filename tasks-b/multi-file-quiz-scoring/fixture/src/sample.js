// The onboarding quiz the reporting job demos against, plus a few attempts.
// Kept in code (not JSON) so the demo runs with no filesystem access.

export const sampleQuiz = {
  id: 'onboarding-v3',
  title: 'Onboarding quiz',
  maxScore: 30,
  bonusCap: 4,
  passOverall: 18,
  tieBreakSection: 'methods',
  sections: [
    {
      id: 'basics',
      title: 'The basics',
      passScore: 5,
      questions: [
        { id: 'b1', type: 'true-false', points: 2, correct: true },
        { id: 'b2', type: 'single', points: 4, options: ['a', 'b', 'c'], correct: 'b', negative: 1 },
        { id: 'b3', type: 'single', points: 4, options: ['a', 'b', 'c'], correct: 'a' },
      ],
    },
    {
      id: 'methods',
      title: 'Methods',
      passScore: 6,
      questions: [
        { id: 'm1', type: 'multi', points: 6, options: ['a', 'b', 'c', 'd'], correct: ['a', 'c', 'd'] },
        {
          id: 'm2', type: 'ordering', points: 6,
          items: ['draft', 'review', 'approve', 'publish'],
          correct: ['draft', 'approve', 'review', 'publish'],
        },
      ],
    },
    {
      id: 'scenarios',
      title: 'Scenarios',
      questions: [
        { id: 's1', type: 'single', points: 4, options: ['a', 'b'], correct: 'a', negative: 2 },
        { id: 's2', type: 'multi', points: 4, options: ['a', 'b', 'c'], correct: ['b', 'c'], penalty: 1 },
      ],
    },
  ],
}

export const sampleAttempts = [
  {
    candidateId: 'cand-ada',
    answers: {
      b1: true, b2: 'b', b3: 'a',
      m1: ['a', 'c', 'd'], m2: ['draft', 'approve', 'review', 'publish'],
      s1: 'a', s2: ['b', 'c'],
    },
    bonus: 2,
  },
  {
    candidateId: 'cand-grace',
    answers: {
      b1: true, b2: 'c', b3: 'a',
      m1: ['a', 'd'], m2: ['draft', 'review', 'approve', 'publish'],
      s1: 'b', s2: ['b'],
    },
  },
  {
    candidateId: 'cand-edsger',
    answers: {
      b1: false, b2: 'b', b3: 'c',
      m1: ['c', 'd'], m2: ['draft', 'approve', 'review', 'publish'],
      s1: 'a', s2: ['a', 'b', 'c'],
    },
    bonus: 6,
  },
]

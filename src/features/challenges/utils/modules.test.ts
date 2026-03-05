import { describe, expect, it } from 'vitest'
import {
  getAdjacentSteps,
  getChallengeModuleStats,
} from './modules'
import type { ChallengeModuleDefinition } from '../types'

const testModule: ChallengeModuleDefinition = {
  id: 'module-a',
  slug: 'module-a',
  difficulty: 'beginner',
  title: {
    en: 'Module A',
    ro: 'Modul A',
  },
  description: {
    en: 'Test module',
    ro: 'Modul de test',
  },
  challenges: [
    {
      id: 'challenge-a',
      slug: 'challenge-a',
      title: {
        en: 'Challenge A',
        ro: 'Provocare A',
      },
      description: {
        en: 'First challenge',
        ro: 'Prima provocare',
      },
      steps: [
        {
          id: 'ch-module-a-01',
          slug: '01-start',
          title: {
            en: 'Step 1',
            ro: 'Pasul 1',
          },
          durationMinutes: 5,
          contentDir: 'module-a/01-start',
          completionMode: 'mark_complete',
          prerequisites: [],
        },
        {
          id: 'ch-module-a-02',
          slug: '02-check',
          title: {
            en: 'Step 2',
            ro: 'Pasul 2',
          },
          durationMinutes: 6,
          contentDir: 'module-a/02-check',
          completionMode: 'quiz',
          prerequisites: [],
        },
      ],
    },
    {
      id: 'challenge-b',
      slug: 'challenge-b',
      title: {
        en: 'Challenge B',
        ro: 'Provocare B',
      },
      description: {
        en: 'Second challenge',
        ro: 'A doua provocare',
      },
      steps: [
        {
          id: 'ch-module-a-03',
          slug: '03-review',
          title: {
            en: 'Step 3',
            ro: 'Pasul 3',
          },
          durationMinutes: 4,
          contentDir: 'module-a/03-review',
          completionMode: 'mark_complete',
          prerequisites: [],
        },
      ],
    },
  ],
}

describe('challenges modules utils', () => {
  describe('getAdjacentSteps', () => {
    it('returns only next step for first step', () => {
      const result = getAdjacentSteps({ module: testModule, stepId: 'ch-module-a-01' })

      expect(result.prev).toBeNull()
      expect(result.next?.id).toBe('ch-module-a-02')
    })

    it('returns previous and next for middle step', () => {
      const result = getAdjacentSteps({ module: testModule, stepId: 'ch-module-a-02' })

      expect(result.prev?.id).toBe('ch-module-a-01')
      expect(result.next?.id).toBe('ch-module-a-03')
    })

    it('returns only previous for last step', () => {
      const result = getAdjacentSteps({ module: testModule, stepId: 'ch-module-a-03' })

      expect(result.prev?.id).toBe('ch-module-a-02')
      expect(result.next).toBeNull()
    })

    it('returns nulls when step is missing', () => {
      const result = getAdjacentSteps({ module: testModule, stepId: 'ch-missing-step' })

      expect(result.prev).toBeNull()
      expect(result.next).toBeNull()
    })
  })

  describe('getChallengeModuleStats', () => {
    it('counts completed and passed statuses and computes next challenge slug', () => {
      const statuses = {
        'ch-module-a-01': 'completed',
        'ch-module-a-02': 'passed',
        'ch-module-a-03': 'not_started',
      } as const

      const result = getChallengeModuleStats({
        module: testModule,
        getStepStatus: (stepId) => statuses[stepId as keyof typeof statuses],
      })

      expect(result.completedCount).toBe(2)
      expect(result.totalCount).toBe(3)
      expect(result.completionPercentage).toBe(67)
      expect(result.nextStep?.id).toBe('ch-module-a-03')
      expect(result.nextChallengeSlug).toBe('challenge-b')
    })

    it('returns null nextStep and nextChallengeSlug when module is complete', () => {
      const result = getChallengeModuleStats({
        module: testModule,
        getStepStatus: () => 'completed',
      })

      expect(result.completedCount).toBe(3)
      expect(result.completionPercentage).toBe(100)
      expect(result.nextStep).toBeNull()
      expect(result.nextChallengeSlug).toBeNull()
    })
  })
})

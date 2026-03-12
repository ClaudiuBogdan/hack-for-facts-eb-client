import { describe, expect, it } from 'vitest'
import { ChallengeModuleDefinitionSchema } from './challenge-definitions'

function createValidModule() {
  return {
    id: 'explore-budgets',
    slug: 'explore-budgets',
    order: 2,
    difficulty: 'beginner',
    title: {
      en: 'Explore budgets',
      ro: 'Exploreaza bugete',
    },
    description: {
      en: 'Learn to inspect local budgets.',
      ro: 'Invata sa verifici bugete locale.',
    },
    challenges: [
      {
        id: 'find-budget',
        slug: 'find-budget',
        title: {
          en: 'Find a budget',
          ro: 'Gaseste un buget',
        },
        description: {
          en: 'Find a valid budget entry.',
          ro: 'Gaseste o intrare valida in buget.',
        },
        steps: [
          {
            id: 'ch-find-budget-01',
            slug: '01-find',
            title: {
              en: 'Find budget page',
              ro: 'Gaseste pagina bugetului',
            },
            durationMinutes: 5,
            contentDir: 'explore-budgets/01-find',
            completionMode: 'mark_complete',
            prerequisites: [],
          },
        ],
      },
    ],
  }
}

describe('challenge-definitions schema', () => {
  it('accepts valid challenge module definitions', () => {
    expect(() => ChallengeModuleDefinitionSchema.parse(createValidModule())).not.toThrow()
  })

  it('rejects missing or invalid order values', () => {
    const invalidModule = {
      ...createValidModule(),
      order: 0,
    }

    const result = ChallengeModuleDefinitionSchema.safeParse(invalidModule)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'order')).toBe(true)
    }
  })

  it('rejects step ids that do not use ch- prefix', () => {
    const invalidModule = createValidModule()
    invalidModule.challenges[0].steps[0].id = 'step-01'

    const result = ChallengeModuleDefinitionSchema.safeParse(invalidModule)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.join('.') === 'challenges.0.steps.0.id'),
      ).toBe(true)
    }
  })

  it('rejects empty challenge lists', () => {
    const invalidModule = {
      ...createValidModule(),
      challenges: [],
    }

    const result = ChallengeModuleDefinitionSchema.safeParse(invalidModule)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'challenges')).toBe(
        true,
      )
    }
  })

  it('rejects empty step lists', () => {
    const invalidModule = createValidModule()
    invalidModule.challenges[0].steps = []

    const result = ChallengeModuleDefinitionSchema.safeParse(invalidModule)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.join('.') === 'challenges.0.steps'),
      ).toBe(true)
    }
  })

  it('rejects duplicate step ids in the same module', () => {
    const invalidModule = createValidModule()
    invalidModule.challenges.push({
      id: 'compare-budget',
      slug: 'compare-budget',
      title: {
        en: 'Compare budgets',
        ro: 'Compara bugete',
      },
      description: {
        en: 'Compare two budgets.',
        ro: 'Compara doua bugete.',
      },
      steps: [
        {
          id: 'ch-find-budget-01',
          slug: '01-compare',
          title: {
            en: 'Compare values',
            ro: 'Compara valori',
          },
          durationMinutes: 4,
          contentDir: 'explore-budgets/01-compare',
          completionMode: 'mark_complete',
          prerequisites: [],
        },
      ],
    })

    const result = ChallengeModuleDefinitionSchema.safeParse(invalidModule)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.join('.') === 'challenges.1.steps.0.id'),
      ).toBe(true)
    }
  })
})

import { describe, expect, it, vi } from 'vitest'
import {
  createInteractiveStateRecord,
  getEmptyUnifiedInteractiveState,
} from '@/features/learning/utils/interactive-state'
import type { ChallengeStepDefinition } from '../types'
import { deriveChallengeStepStatus } from './challenge-progress'
import type { ChallengeStepSectionMetadata } from './sectioned-step-markdown'

const stepSectionsByContentDir: Record<string, readonly ChallengeStepSectionMetadata[]> = {}

vi.mock('./challenge-step-content-resolver', () => ({
  getChallengeStepSections: ({
    contentDir,
  }: {
    readonly contentDir: string
  }) => stepSectionsByContentDir[contentDir] ?? null,
}))

function createStep(params: {
  readonly id: string
  readonly contentDir: string
}): ChallengeStepDefinition {
  return {
    id: params.id,
    slug: params.id,
    title: { ro: params.id, en: params.id },
    durationMinutes: 5,
    contentDir: params.contentDir,
    completionMode: 'mark_complete',
    prerequisites: [],
  }
}

function createQuizRecord(params: {
  readonly interactionId: string
  readonly lessonId: string
  readonly scopePolicy: 'global' | 'entity'
  readonly entityCui?: string
  readonly selectedId: string
  readonly outcome: 'correct' | 'incorrect'
  readonly updatedAt: string
}) {
  return createInteractiveStateRecord({
    definition: {
      id: params.interactionId,
      lessonId: params.lessonId,
      kind: 'quiz',
      scopePolicy: params.scopePolicy,
      completionRule: { type: 'outcome', outcome: 'correct' },
    },
    scope:
      params.scopePolicy === 'entity'
        ? { type: 'entity', entityCui: params.entityCui ?? '4305857' }
        : { type: 'global' },
    phase: 'resolved',
    value: {
      kind: 'choice',
      choice: {
        selectedId: params.selectedId,
      },
    },
    result: {
      outcome: params.outcome,
      score: params.outcome === 'correct' ? 100 : 0,
      evaluatedAt: params.updatedAt,
    },
    updatedAt: params.updatedAt,
    submittedAt: params.updatedAt,
  })
}

function withRecord(
  interactiveState: ReturnType<typeof getEmptyUnifiedInteractiveState>,
  record: ReturnType<typeof createQuizRecord>,
) {
  return {
    ...interactiveState,
    recordsByKey: {
      ...interactiveState.recordsByKey,
      [record.key]: record,
    },
  }
}

describe('challenge-progress', () => {
  it('derives entity-scoped widget progress for the current entity only', () => {
    const step = createStep({
      id: 'ch-read-local-execution-02-total-budget-context',
      contentDir: 'read-local-execution/02-total-budget-in-context',
    })
    stepSectionsByContentDir[step.contentDir] = [
      {
        id: 'expenses',
        title: 'Expenses',
        interactive: null,
        lessonChallengeDescriptors: [
          {
            kind: 'step',
            prefix: 'lesson-budget-context-expenses',
            interactionKind: 'quiz',
            scopePolicy: 'entity',
          },
        ],
      },
      {
        id: 'income',
        title: 'Income',
        interactive: null,
        lessonChallengeDescriptors: [
          {
            kind: 'step',
            prefix: 'lesson-budget-context-income',
            interactionKind: 'quiz',
            scopePolicy: 'entity',
          },
        ],
      },
      {
        id: 'county',
        title: 'County',
        interactive: null,
        lessonChallengeDescriptors: [
          {
            kind: 'step',
            prefix: 'lesson-budget-context-county-top',
            interactionKind: 'quiz',
            scopePolicy: 'entity',
          },
        ],
      },
    ]

    let interactiveState = getEmptyUnifiedInteractiveState()
    interactiveState = withRecord(
      interactiveState,
      createQuizRecord({
        interactionId: `${step.id}:lesson-budget-context-expenses`,
        lessonId: step.id,
        scopePolicy: 'entity',
        entityCui: '4305857',
        selectedId: 'correct',
        outcome: 'correct',
        updatedAt: '2026-03-25T13:10:17.390Z',
      }),
    )
    interactiveState = withRecord(
      interactiveState,
      createQuizRecord({
        interactionId: `${step.id}:lesson-budget-context-income`,
        lessonId: step.id,
        scopePolicy: 'entity',
        entityCui: '4305857',
        selectedId: 'correct',
        outcome: 'correct',
        updatedAt: '2026-03-25T13:10:21.006Z',
      }),
    )
    interactiveState = withRecord(
      interactiveState,
      createQuizRecord({
        interactionId: `${step.id}:lesson-budget-context-county-top`,
        lessonId: step.id,
        scopePolicy: 'entity',
        entityCui: '4305857',
        selectedId: '58990',
        outcome: 'correct',
        updatedAt: '2026-03-25T13:10:27.508Z',
      }),
    )

    expect(
      deriveChallengeStepStatus({
        step,
        locale: 'ro',
        entityCui: '4305857',
        interactiveState,
      }),
    ).toBe('completed')

    expect(
      deriveChallengeStepStatus({
        step,
        locale: 'ro',
        entityCui: '4270740',
        interactiveState,
      }),
    ).toBe('not_started')
  })

  it('keeps global authored quiz progress when switching entities', () => {
    const step = createStep({
      id: 'ch-read-local-execution-01-why-execution-matters',
      contentDir: 'read-local-execution/01-why-2025-execution-matters',
    })
    stepSectionsByContentDir[step.contentDir] = [
      {
        id: 'recap',
        title: 'Recap',
        interactive: null,
        lessonChallengeDescriptors: [
          {
            kind: 'fixed',
            interactionId: 'read-local-execution-01-recap-q1',
            interactionKind: 'quiz',
            scopePolicy: 'global',
          },
          {
            kind: 'fixed',
            interactionId: 'read-local-execution-01-recap-q2',
            interactionKind: 'quiz',
            scopePolicy: 'global',
          },
          {
            kind: 'fixed',
            interactionId: 'read-local-execution-01-recap-q3',
            interactionKind: 'quiz',
            scopePolicy: 'global',
          },
        ],
      },
    ]

    let interactiveState = getEmptyUnifiedInteractiveState()
    for (const [interactionId, selectedId, updatedAt] of [
      ['read-local-execution-01-recap-q1', 'b', '2026-03-25T13:10:06.323Z'],
      ['read-local-execution-01-recap-q2', 'c', '2026-03-25T13:10:08.308Z'],
      ['read-local-execution-01-recap-q3', 'd', '2026-03-25T13:10:11.340Z'],
    ] as const) {
      interactiveState = withRecord(
        interactiveState,
        createQuizRecord({
          interactionId,
          lessonId: step.id,
          scopePolicy: 'global',
          selectedId,
          outcome: 'correct',
          updatedAt,
        }),
      )
    }

    expect(
      deriveChallengeStepStatus({
        step,
        locale: 'ro',
        entityCui: '4305857',
        interactiveState,
      }),
    ).toBe('completed')

    expect(
      deriveChallengeStepStatus({
        step,
        locale: 'ro',
        entityCui: '4270740',
        interactiveState,
      }),
    ).toBe('completed')
  })

  it('returns in_progress when only some tracked entity quizzes are complete', () => {
    const step = createStep({
      id: 'ch-read-local-execution-02-total-budget-context',
      contentDir: 'read-local-execution/02-total-budget-in-context',
    })
    stepSectionsByContentDir[step.contentDir] = [
      {
        id: 'expenses',
        title: 'Expenses',
        interactive: null,
        lessonChallengeDescriptors: [
          {
            kind: 'step',
            prefix: 'lesson-budget-context-expenses',
            interactionKind: 'quiz',
            scopePolicy: 'entity',
          },
          {
            kind: 'step',
            prefix: 'lesson-budget-context-income',
            interactionKind: 'quiz',
            scopePolicy: 'entity',
          },
        ],
      },
    ]

    let interactiveState = getEmptyUnifiedInteractiveState()
    interactiveState = withRecord(
      interactiveState,
      createQuizRecord({
        interactionId: `${step.id}:lesson-budget-context-expenses`,
        lessonId: step.id,
        scopePolicy: 'entity',
        entityCui: '4305857',
        selectedId: 'correct',
        outcome: 'correct',
        updatedAt: '2026-03-25T13:10:17.390Z',
      }),
    )

    expect(
      deriveChallengeStepStatus({
        step,
        locale: 'ro',
        entityCui: '4305857',
        interactiveState,
      }),
    ).toBe('in_progress')
  })

  it('falls back to stored lesson progress when step metadata is unavailable', () => {
    expect(
      deriveChallengeStepStatus({
        step: createStep({
          id: 'missing-step',
          contentDir: 'missing-step',
        }),
        locale: 'ro',
        entityCui: '4305857',
        interactiveState: getEmptyUnifiedInteractiveState(),
        fallbackStatus: 'completed',
      }),
    ).toBe('completed')
  })

  it('preserves explicit mark-complete fallback status when tracked interactions are incomplete', () => {
    const step = createStep({
      id: 'ch-civic-05-participation-report',
      contentDir: 'civic-campaign/05-participation-report',
    })
    stepSectionsByContentDir[step.contentDir] = [
      {
        id: 'report',
        title: 'Report',
        interactive: null,
        lessonChallengeDescriptors: [
          {
            kind: 'fixed',
            interactionId: 'funky:interaction:funky_participation',
            interactionKind: 'custom',
            scopePolicy: 'entity',
          },
        ],
      },
    ]

    expect(
      deriveChallengeStepStatus({
        step,
        locale: 'ro',
        entityCui: '4305857',
        interactiveState: getEmptyUnifiedInteractiveState(),
        fallbackStatus: 'completed',
      }),
    ).toBe('completed')
  })
})

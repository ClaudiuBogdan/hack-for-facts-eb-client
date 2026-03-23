export type LearningLocale = 'en' | 'ro'

export type TranslatedString = {
  readonly en: string
  readonly ro: string
}

export type LearningPathDifficulty = 'beginner' | 'intermediate' | 'advanced'

export type LearningModuleCompletionMode = 'quiz' | 'mark_complete'

export type LearningLessonDefinition = {
  readonly id: string
  readonly slug: string
  readonly title: TranslatedString
  readonly durationMinutes: number
  readonly contentDir: string
  readonly completionMode: LearningModuleCompletionMode
  readonly prerequisites: readonly string[]
  readonly discourseTopicId?: number
  readonly discourseTopicSlug?: string
}

export type LearningModuleDefinition = {
  readonly id: string
  readonly slug: string
  readonly title: TranslatedString
  readonly description: TranslatedString
  readonly lessons: readonly LearningLessonDefinition[]
}

export type LearningPathDefinition = {
  readonly id: string
  readonly slug: string
  readonly difficulty: LearningPathDifficulty
  readonly title: TranslatedString
  readonly description: TranslatedString
  readonly modules: readonly LearningModuleDefinition[]
}

export type LearningContentStatus = 'not_started' | 'in_progress' | 'completed' | 'passed'

export type LessonId = string

export type InteractionScope =
  | { readonly type: 'global' }
  | { readonly type: 'entity'; readonly entityCui: string }

export type InteractionValue =
  | { readonly kind: 'choice'; readonly choice: { readonly selectedId: string | null } }
  | { readonly kind: 'text'; readonly text: { readonly value: string } }
  | { readonly kind: 'url'; readonly url: { readonly value: string } }
  | { readonly kind: 'number'; readonly number: { readonly value: number | null } }
  | { readonly kind: 'json'; readonly json: { readonly value: Readonly<Record<string, unknown>> } }

export type InteractionPhase =
  | 'idle'
  | 'draft'
  | 'pending'
  | 'resolved'
  | 'error'

export type InteractionOutcome = 'correct' | 'incorrect' | null

export type InteractionResult = {
  readonly outcome: InteractionOutcome
  readonly score?: number | null
  readonly feedbackText?: string | null
  readonly response?: Readonly<Record<string, unknown>> | null
  readonly evaluatedAt?: string | null
}

export type InteractionReviewStatus = 'pending' | 'approved' | 'rejected'

export type InteractionReview = {
  /**
   * Review state is authoritative server-owned metadata for interactions that
   * require validation after user submission. Clients may read this field but
   * must not author it through public progress sync.
   */
  readonly status: InteractionReviewStatus
  readonly reviewedAt: string | null
  readonly feedbackText?: string | null
}

export type InteractiveDefinitionKind =
  | 'quiz'
  | 'url'
  | 'text-input'
  | 'custom'

export type InteractionCompletionRule =
  | { readonly type: 'outcome'; readonly outcome: Exclude<InteractionOutcome, null> }
  | { readonly type: 'resolved' }
  | { readonly type: 'score-threshold'; readonly minScore: number }
  | { readonly type: 'component-flag'; readonly flag: string }

export type InteractiveDefinition = {
  readonly id: string
  readonly lessonId: LessonId
  readonly kind: InteractiveDefinitionKind
  readonly scopePolicy: 'global' | 'entity'
  readonly completionRule: InteractionCompletionRule
}

export type InteractiveStateRecord = {
  readonly key: string
  readonly interactionId: string
  readonly lessonId: LessonId
  readonly kind: InteractiveDefinitionKind
  readonly scope: InteractionScope
  readonly completionRule: InteractionCompletionRule
  readonly phase: InteractionPhase
  readonly value: InteractionValue | null
  readonly result: InteractionResult | null
  /**
   * Optional review metadata for server-validated interactions.
   *
   * This is intentionally separate from `result`:
   * - `result` remains the generic evaluation/scoring channel used by quizzes
   *   and other immediate interaction flows.
   * - `review` is used when the user submission is accepted first and later
   *   reviewed by a server-side workflow.
   */
  readonly review?: InteractionReview | null
  readonly updatedAt: string
  readonly submittedAt?: string | null
}

export type InteractiveAuditEvent =
  | {
      readonly id: string
      readonly recordKey: string
      readonly lessonId: LessonId
      readonly interactionId: string
      readonly type: 'submitted'
      readonly at: string
      readonly actor: 'user'
      readonly value: InteractionValue
    }
  | {
      readonly id: string
      readonly recordKey: string
      readonly lessonId: LessonId
      readonly interactionId: string
      readonly type: 'evaluated'
      readonly at: string
      readonly actor: 'system'
      readonly phase: 'resolved' | 'error'
      readonly result: InteractionResult
    }

export type UnifiedInteractiveState = {
  readonly recordsByKey: Readonly<Record<string, InteractiveStateRecord>>
  readonly eventLogByRecordKey: Readonly<Record<string, readonly InteractiveAuditEvent[]>>
}

export type LearningQuizInteractionState = {
  readonly kind: 'quiz'
  readonly selectedOptionId: string | null
}

export type LearningPredictionReveal = {
  readonly guess: number
  readonly actualRate: number
  readonly revealedAt: string
}

export type LearningPredictionInteractionState = {
  readonly kind: 'prediction'
  readonly reveals: Readonly<Record<string, LearningPredictionReveal>>
}

export type LearningSalaryCalculatorStep = 'INPUT' | 'GUESS' | 'REVEAL'

export type LearningSalaryCalculatorInteractionState = {
  readonly kind: 'salary-calculator'
  readonly gross: number
  readonly userGuess: number
  readonly step: LearningSalaryCalculatorStep
  readonly completedAt?: string
}

export type LearningBudgetAllocatorStep = 'ALLOCATE' | 'COMPARE'

export type LearningBudgetAllocatorInteractionState = {
  readonly kind: 'budget-allocator'
  readonly allocations: Readonly<Record<string, number>>
  readonly step: LearningBudgetAllocatorStep
  readonly completedAt?: string
}

export type BudgetPhaseId =
  | 'planning'
  | 'drafting'
  | 'approval'
  | 'execution'
  | 'reporting'
  | 'audit'

export type LearningBudgetCycleInteractionState = {
  readonly kind: 'budget-cycle'
  readonly exploredPhases: readonly BudgetPhaseId[]
  readonly lastExploredPhase: BudgetPhaseId | null
  readonly completedAt?: string
}

export type LearningUATFinderStep = 'IDLE' | 'SELECTED' | 'EXPLORED'

export type LearningUATFinderExploredAction = 'view_budget' | 'compare' | 'map'

export type LearningUATFinderInteractionState = {
  readonly kind: 'uat-finder'
  readonly step: LearningUATFinderStep
  readonly selectedCui: string | null
  readonly selectedName: string | null
  readonly exploredAction: LearningUATFinderExploredAction | null
  readonly completedAt?: string
}

export type LearningInteractionState =
  | LearningQuizInteractionState
  | LearningPredictionInteractionState
  | LearningSalaryCalculatorInteractionState
  | LearningBudgetAllocatorInteractionState
  | LearningBudgetCycleInteractionState
  | LearningUATFinderInteractionState

export type LearningQuizAnswerAction = {
  readonly type: 'quiz.answer'
  readonly contentId: string
  readonly interactionId: string
  readonly selectedOptionId: string
  readonly score: number
  readonly contentVersion?: string
}

export type LearningQuizResetAction = {
  readonly type: 'quiz.reset'
  readonly contentId: string
  readonly interactionId: string
}

export type LearningPredictionRevealAction = {
  readonly type: 'prediction.reveal'
  readonly contentId: string
  readonly interactionId: string
  readonly year: string
  readonly guess: number
  readonly actualRate: number
  readonly contentVersion?: string
}

export type LearningPredictionResetAction = {
  readonly type: 'prediction.reset'
  readonly contentId: string
  readonly interactionId: string
}

export type LearningSalaryCalculatorSaveAction = {
  readonly type: 'salaryCalculator.save'
  readonly contentId: string
  readonly interactionId: string
  readonly gross: number
  readonly userGuess: number
  readonly step: LearningSalaryCalculatorStep
  readonly contentVersion?: string
}

export type LearningSalaryCalculatorResetAction = {
  readonly type: 'salaryCalculator.reset'
  readonly contentId: string
  readonly interactionId: string
}

export type LearningBudgetAllocatorSubmitAction = {
  readonly type: 'budgetAllocator.submit'
  readonly contentId: string
  readonly interactionId: string
  readonly allocations: Readonly<Record<string, number>>
  readonly contentVersion?: string
}

export type LearningBudgetAllocatorResetAction = {
  readonly type: 'budgetAllocator.reset'
  readonly contentId: string
  readonly interactionId: string
}

export type LearningBudgetCycleExploreAction = {
  readonly type: 'budgetCycle.explore'
  readonly contentId: string
  readonly interactionId: string
  readonly phaseId: BudgetPhaseId
  readonly contentVersion?: string
}

export type LearningBudgetCycleResetAction = {
  readonly type: 'budgetCycle.reset'
  readonly contentId: string
  readonly interactionId: string
}

export type LearningUATFinderSelectAction = {
  readonly type: 'uatFinder.select'
  readonly contentId: string
  readonly interactionId: string
  readonly cui: string
  readonly name: string
  readonly contentVersion?: string
}

export type LearningUATFinderExploreAction = {
  readonly type: 'uatFinder.explore'
  readonly contentId: string
  readonly interactionId: string
  readonly cui: string
  readonly action: LearningUATFinderExploredAction
  readonly contentVersion?: string
}

export type LearningUATFinderResetAction = {
  readonly type: 'uatFinder.reset'
  readonly contentId: string
  readonly interactionId: string
}

export type LearningInteractionAction =
  | LearningQuizAnswerAction
  | LearningQuizResetAction
  | LearningPredictionRevealAction
  | LearningPredictionResetAction
  | LearningSalaryCalculatorSaveAction
  | LearningSalaryCalculatorResetAction
  | LearningBudgetAllocatorSubmitAction
  | LearningBudgetAllocatorResetAction
  | LearningBudgetCycleExploreAction
  | LearningBudgetCycleResetAction
  | LearningUATFinderSelectAction
  | LearningUATFinderExploreAction
  | LearningUATFinderResetAction

export type LearningContentProgress = {
  readonly contentId: string
  readonly status: LearningContentStatus
  readonly score?: number
  readonly lastAttemptAt: string
  readonly completedAt?: string
  readonly contentVersion: string
}

export type LearningProgressEventType =
  | 'interactive.updated'
  | 'progress.reset'

export type LearningProgressEventBase = {
  readonly eventId: string
  readonly occurredAt: string
  readonly clientId: string
  readonly type: LearningProgressEventType
}

export type LearningInteractiveUpdatedEvent = LearningProgressEventBase & {
  readonly type: 'interactive.updated'
  readonly payload: {
    readonly record: InteractiveStateRecord
    readonly auditEvents?: readonly InteractiveAuditEvent[]
  }
}

export type LearningProgressResetEvent = LearningProgressEventBase & {
  readonly type: 'progress.reset'
}

export type LearningProgressEvent =
  | LearningInteractiveUpdatedEvent
  | LearningProgressResetEvent

export type LearningProgressRemoteSnapshot = {
  readonly version: typeof LEARNING_PROGRESS_SCHEMA_VERSION
  readonly recordsByKey: Readonly<Record<string, InteractiveStateRecord>>
  readonly lastUpdated: string | null
}

export const LEARNING_PROGRESS_SCHEMA_VERSION = 1 as const

export type LearningOnboardingState = {
  readonly pathId: string | null
  readonly relatedPaths: readonly string[]
  readonly completedAt: string | null
}

export type LearningStreakState = {
  readonly currentStreak: number
  readonly longestStreak: number
  readonly lastActivityDate: string | null // ISO date string (YYYY-MM-DD)
}

export type LearningGuestProgress = {
  readonly version: typeof LEARNING_PROGRESS_SCHEMA_VERSION
  readonly onboarding: LearningOnboardingState
  readonly activePathId: string | null
  readonly content: Readonly<Record<string, LearningContentProgress>>
  readonly interactiveState: UnifiedInteractiveState
  readonly streak: LearningStreakState
  readonly lastUpdated: string
}

export type LearningCertificateTier = 'bronze' | 'silver' | 'gold'

export type LearningCertificate = {
  readonly id: string
  readonly userId: string
  readonly pathId: string
  readonly recipientName: string
  readonly tier: LearningCertificateTier
  readonly completionPercentage: number
  readonly issuedAt: string
}

export const LEARNING_CERTIFICATES_SCHEMA_VERSION = 1 as const

export type LearningCertificatesState = {
  readonly version: typeof LEARNING_CERTIFICATES_SCHEMA_VERSION
  readonly certificatesById: Readonly<Record<string, LearningCertificate>>
}

export type LearningAuthState = {
  readonly isAuthenticated: boolean
  readonly userId: string | null
}

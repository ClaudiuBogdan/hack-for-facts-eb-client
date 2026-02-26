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
  readonly interactions?: Readonly<Record<string, LearningInteractionState>>
}

export type LearningProgressEventType =
  | 'content.progressed'
  | 'onboarding.completed'
  | 'onboarding.reset'
  | 'activePath.set'
  | 'progress.reset'

export type LearningProgressEventBase = {
  readonly eventId: string
  readonly occurredAt: string
  readonly clientId: string
  readonly type: LearningProgressEventType
}

export type LearningContentProgressPayload = {
  readonly contentId: string
  readonly status: LearningContentStatus
  readonly score?: number
  readonly contentVersion?: string
  readonly interaction?: {
    readonly interactionId: string
    readonly state: LearningInteractionState | null
  }
}

export type LearningContentProgressedEvent = LearningProgressEventBase & {
  readonly type: 'content.progressed'
  readonly payload: LearningContentProgressPayload
}

export type LearningOnboardingCompletedEvent = LearningProgressEventBase & {
  readonly type: 'onboarding.completed'
  readonly payload: { readonly pathId: string; readonly relatedPaths: readonly string[] }
}

export type LearningOnboardingResetEvent = LearningProgressEventBase & {
  readonly type: 'onboarding.reset'
}

export type LearningActivePathSetEvent = LearningProgressEventBase & {
  readonly type: 'activePath.set'
  readonly payload: { readonly pathId: string | null }
}

export type LearningProgressResetEvent = LearningProgressEventBase & {
  readonly type: 'progress.reset'
}

export type LearningProgressEvent =
  | LearningContentProgressedEvent
  | LearningOnboardingCompletedEvent
  | LearningOnboardingResetEvent
  | LearningActivePathSetEvent
  | LearningProgressResetEvent

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

import { parseLearningCertificatesState, getEmptyLearningCertificatesState } from '../../schemas/progress'
import {
  LEARNING_CERTIFICATES_SCHEMA_VERSION,
  type LearningCertificate,
  type LearningCertificatesState,
  type LearningCertificateTier,
  type LearningGuestProgress,
  type LearningPathDefinition,
} from '../../types'
import { getLearningPathCompletionStats } from '../../utils/paths'
import { readJsonFromLocalStorage } from '@/lib/storage/read-json-from-local-storage'

const CERTIFICATES_STORAGE_KEY = 'learning_certificates'

function writeJsonToStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function nowIso(): string {
  return new Date().toISOString()
}

function getCertificateTier(completionPercentage: number): LearningCertificateTier | null {
  if (completionPercentage >= 100) return 'gold'
  if (completionPercentage >= 80) return 'silver'
  if (completionPercentage >= 60) return 'bronze'
  return null
}

export function loadLearningCertificatesState(): LearningCertificatesState {
  return parseLearningCertificatesState(
    readJsonFromLocalStorage(CERTIFICATES_STORAGE_KEY, {
      expectedVersion: LEARNING_CERTIFICATES_SCHEMA_VERSION,
    }),
  )
}

export function saveLearningCertificatesState(state: LearningCertificatesState): void {
  writeJsonToStorage(CERTIFICATES_STORAGE_KEY, state)
}

export function getLearningCertificateById(id: string): LearningCertificate | null {
  const state = loadLearningCertificatesState()
  return state.certificatesById[id] ?? null
}

export function issueLearningCertificate(params: {
  readonly userId: string
  readonly recipientName: string
  readonly path: LearningPathDefinition
  readonly progress: LearningGuestProgress
}): LearningCertificate {
  const stats = getLearningPathCompletionStats({ path: params.path, progress: params.progress })
  const tier = getCertificateTier(stats.completionPercentage)
  if (!tier) {
    throw new Error('Not eligible for certificate')
  }

  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `poc-${Date.now()}`

  const certificate: LearningCertificate = {
    id,
    userId: params.userId,
    pathId: params.path.id,
    recipientName: params.recipientName,
    tier,
    completionPercentage: stats.completionPercentage,
    issuedAt: nowIso(),
  }

  const state = loadLearningCertificatesState()
  const next: LearningCertificatesState = {
    ...state,
    certificatesById: {
      ...state.certificatesById,
      [id]: certificate,
    },
  }
  saveLearningCertificatesState(next)

  return certificate
}

export function clearLearningCertificates(): void {
  saveLearningCertificatesState(getEmptyLearningCertificatesState())
}

/**
 * Runtime challenge interactions must be globally unique before scope is applied.
 * The persisted record key is built from `interactionId + scope`; `lessonId` is
 * payload metadata only and does not participate in storage identity.
 */
export function buildChallengeInteractionId(stepId: string, localInteractionId: string): string {
  const normalizedStepId = stepId.trim()
  const normalizedLocalInteractionId = localInteractionId.trim()

  if (normalizedStepId.length === 0) {
    throw new Error('Challenge interaction id requires a non-empty stepId.')
  }

  if (normalizedLocalInteractionId.length === 0) {
    throw new Error('Challenge interaction id requires a non-empty localInteractionId.')
  }

  return `${normalizedStepId}:${normalizedLocalInteractionId}`
}

/**
 * Runtime challenge interactions must be globally unique before scope is applied.
 * The persisted record key is built from `interactionId + scope`; `lessonId` is
 * payload metadata only and does not participate in storage identity.
 */
function toSnakeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function buildChallengeInteractionId(stepId: string, localInteractionId: string): string {
  const normalizedStepId = toSnakeSegment(stepId)
  const normalizedLocalInteractionId = toSnakeSegment(localInteractionId)

  if (normalizedStepId.length === 0) {
    throw new Error('Challenge interaction id requires a non-empty stepId.')
  }

  if (normalizedLocalInteractionId.length === 0) {
    throw new Error('Challenge interaction id requires a non-empty localInteractionId.')
  }

  return `funky:lesson:${normalizedStepId}_${normalizedLocalInteractionId}`
}

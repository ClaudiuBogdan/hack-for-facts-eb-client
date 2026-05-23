/**
 * Controls whether feature API modules serve fixtures instead of live backends.
 *
 * VITE_USE_MOCK_DATA=true           — global mock mode
 * VITE_MOCK_DATASETS=a,b,c          — mock only listed dataset ids
 */
export function isMockDataEnabled(datasetId: string): boolean {
  const globalMock = import.meta.env.VITE_USE_MOCK_DATA === 'true'
  const scoped = import.meta.env.VITE_MOCK_DATASETS

  if (globalMock) {
    return true
  }

  if (typeof scoped !== 'string' || scoped.trim().length === 0) {
    return false
  }

  const allowed = scoped
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return allowed.includes(datasetId)
}

export function assertLiveApiAvailable(
  datasetId: string,
  message?: string,
): void {
  if (isMockDataEnabled(datasetId)) {
    return
  }

  throw new Error(
    message ??
      `Live API for dataset "${datasetId}" is not connected yet. Enable mock mode with VITE_USE_MOCK_DATA or VITE_MOCK_DATASETS.`,
  )
}

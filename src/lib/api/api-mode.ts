import { env } from '@/config/env'

/** True only for deployments whose API intentionally excludes legacy modules. */
export function isRedesignOnlyApiDeployment(): boolean {
  return env.VITE_API_MODE === 'redesign'
}

export function isVerifiedConsolidationEnabled(): boolean {
  return env.VITE_VERIFIED_CONSOLIDATION
}

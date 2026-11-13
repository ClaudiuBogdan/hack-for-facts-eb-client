import { env } from '@/config/env'

/** True only for deployments whose API intentionally excludes legacy modules. */
export function isRedesignOnlyApiDeployment(): boolean {
  return env.VITE_API_MODE === 'redesign'
}

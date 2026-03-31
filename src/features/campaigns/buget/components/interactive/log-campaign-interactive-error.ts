import { logger } from '@/lib/logger'

export function logCampaignInteractiveError(action: string, error: unknown): void {
  logger.error(`Campaign interactive action failed: ${action}.`, { error })
}

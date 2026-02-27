import { Link } from '@tanstack/react-router'
import { CAMPAIGN_BASE_PATH } from '../../constants'
import { getCampaignText } from '../../hooks/use-campaign-content'
import type {
  CampaignChallengeDefinition,
  CampaignChallengeStatus,
  CampaignLocale,
} from '../../types'
import { cn } from '@/lib/utils'

type CampaignChallengeCardProps = {
  readonly locale: CampaignLocale
  readonly challenge: CampaignChallengeDefinition
  readonly status: CampaignChallengeStatus
}

function statusLabelByLocale(status: CampaignChallengeStatus, locale: CampaignLocale): string {
  const labels = locale === 'en'
    ? {
        completed: 'Completed',
        pending_review: 'In review',
        in_progress: 'In progress',
        locked: 'Locked',
        not_started: 'Not started',
      }
    : {
        completed: 'Completat',
        pending_review: 'În review',
        in_progress: 'În progres',
        locked: 'Blocat',
        not_started: 'Neînceput',
      }

  switch (status) {
    case 'completed':
      return labels.completed
    case 'pending_review':
      return labels.pending_review
    case 'in_progress':
      return labels.in_progress
    case 'locked':
      return labels.locked
    default:
      return labels.not_started
  }
}

export function CampaignChallengeCard({ locale, challenge, status }: CampaignChallengeCardProps) {
  const difficultyLabel = locale === 'en' ? 'Difficulty' : 'Dificultate'
  const verificationLabel = locale === 'en' ? 'Verification' : 'Verificare'
  const openLabel = locale === 'en' ? 'Open challenge' : 'Deschide provocarea'

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {getCampaignText(challenge.title, locale)}
        </h3>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium',
            status === 'completed' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
            status === 'pending_review' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
            status === 'in_progress' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
            status === 'locked' && 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
            status === 'not_started' && 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
          )}
        >
          {statusLabelByLocale(status, locale)}
        </span>
      </div>

      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{getCampaignText(challenge.summary, locale)}</p>

      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>{difficultyLabel}: {challenge.difficulty}</span>
        <span>{verificationLabel}: {challenge.verificationMode}</span>
      </div>

      <Link
        to={`${CAMPAIGN_BASE_PATH}/challenges/${challenge.slug}` as '/'}
        className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        {openLabel}
      </Link>
    </article>
  )
}

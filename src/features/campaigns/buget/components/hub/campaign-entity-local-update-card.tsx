import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileText,
  MapPin,
  Video,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth'
import { usePersistedState } from '@/lib/hooks/usePersistedState'
import type { ChallengeLocale } from '@/features/challenges/types'
import { CAMPAIGN_KEY } from '../../constants'
import { CampaignEntityPublicConfigApiError } from '../../api/campaign-entity-public-config'
import { useCampaignEntityPublicConfig } from '../../hooks/use-campaign-entity-public-config'
import type {
  CampaignEntityPublicConfig,
  CampaignEntityPublicDebate,
} from '../../schemas/campaign-entity-public-config'

type CampaignEntityLocalUpdateCardProps = {
  readonly entityCui: string
  readonly locale: ChallengeLocale
}

function formatLongDate(dateString: string, locale: ChallengeLocale): string {
  const parsedDate = new Date(`${dateString}T00:00:00`)

  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate)
}

function ExternalActionLink({
  href,
  label,
  icon: Icon,
}: {
  readonly href: string
  readonly label: string
  readonly icon: typeof FileText
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
    >
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span>{label}</span>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
    </a>
  )
}

function DetailRowInline({
  icon: Icon,
  label,
  value,
}: {
  readonly icon: typeof CalendarDays
  readonly label: string
  readonly value: string
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="mt-0.5 rounded-xl bg-muted p-2 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1.5 break-words text-sm font-medium leading-relaxed text-foreground">
          {value}
        </p>
      </div>
    </div>
  )
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function LoadingCard() {
  return (
    <div className="rounded-2xl border border-border/30 bg-muted/20 p-5">
      <Skeleton className="h-3 w-24" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-8 w-2/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    </div>
  )
}

function StatusCard({
  eyebrow,
  title,
  description,
  action,
}: {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border/30 bg-muted/20 p-5">
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
        {eyebrow}
      </span>
      <div className="mt-3 space-y-2">
        <h2 className="text-xl font-black tracking-tight text-foreground">
          {title}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

function PublicDebateSection({
  entityCui,
  locale,
  debate,
  officialBudgetUrl,
}: {
  readonly entityCui: string
  readonly locale: ChallengeLocale
  readonly debate: CampaignEntityPublicDebate
  readonly officialBudgetUrl: CampaignEntityPublicConfig['values']['officialBudgetUrl']
}) {
  const [isCollapsed, setIsCollapsed] = usePersistedState<boolean>(
    `campaign-public-debate-section-collapsed:${entityCui}`,
    false,
  )
  const detailsText = normalizeOptionalText(debate.description)
  const shouldShowDetailsToggle = (detailsText?.length ?? 0) > 180
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)
  const visibleDetailsText =
    detailsText === null || !shouldShowDetailsToggle || isDetailsExpanded
      ? detailsText
      : `${detailsText.slice(0, 180).trimEnd()}…`

  return (
    <Collapsible
      open={!isCollapsed}
      onOpenChange={(isOpen) => setIsCollapsed(!isOpen)}
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] via-background to-background p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
          {t`Local update`}
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
            {t`Public debate`}
          </span>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              aria-label={isCollapsed ? t`Show details` : t`Hide details`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground transition-colors hover:bg-muted/40"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                aria-hidden="true"
              />
            </button>
          </CollapsibleTrigger>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <h2 className="text-xl font-black tracking-tight text-foreground">
          {t`Public debate announced`}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t`Use the official details below to follow or join the public debate for this city hall.`}
        </p>
      </div>

      <p className="mt-3 text-sm font-medium text-foreground">
        {formatLongDate(debate.date, locale)} · {debate.time}
      </p>

      <CollapsibleContent className="mt-4 space-y-4 data-[state=closed]:hidden">
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-background/50 px-4 py-2">
          <DetailRowInline
            icon={CalendarDays}
            label={t`Date`}
            value={formatLongDate(debate.date, locale)}
          />
          <div className="border-t border-border/40" />
          <DetailRowInline
            icon={Clock3}
            label={t`Time`}
            value={debate.time}
          />
          <div className="border-t border-border/40" />
          <DetailRowInline
            icon={MapPin}
            label={t`Location`}
            value={debate.location}
          />

          {detailsText ? (
            <>
              <div className="border-t border-border/40" />
              <div className="py-3 first:pt-0 last:pb-0">
                <DetailRowInline
                  icon={FileText}
                  label={t`Details`}
                  value={visibleDetailsText ?? ''}
                />
                {shouldShowDetailsToggle ? (
                  <button
                    type="button"
                    onClick={() => setIsDetailsExpanded((currentValue) => !currentValue)}
                    className="mt-1 inline-flex text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {isDetailsExpanded ? t`Show less` : t`Show more`}
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <ExternalActionLink
            href={debate.announcement_link}
            label={t`Open announcement`}
            icon={FileText}
          />
          {debate.online_participation_link ? (
            <ExternalActionLink
              href={debate.online_participation_link}
              label={t`Join online`}
              icon={Video}
            />
          ) : null}
          {officialBudgetUrl ? (
            <ExternalActionLink
              href={officialBudgetUrl}
              label={t`Open official budget draft`}
              icon={FileText}
            />
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function CampaignEntityLocalUpdateCard({
  entityCui,
  locale,
}: CampaignEntityLocalUpdateCardProps) {
  const { isEnabled, isLoaded, isSignedIn } = useAuth()
  const query = useCampaignEntityPublicConfig(CAMPAIGN_KEY, entityCui)

  if (!isEnabled || !isLoaded || !isSignedIn) {
    return null
  }

  if (query.isLoading) {
    return <LoadingCard />
  }

  if (query.isError) {
    const isUnavailable =
      query.error instanceof CampaignEntityPublicConfigApiError
      && query.error.status === 404

    return (
      <StatusCard
        eyebrow={t`Local update`}
        title={
          isUnavailable
            ? t`Local details unavailable`
            : t`Could not load local details`
        }
        description={
          isUnavailable
            ? t`This page cannot show budget or debate details for this city hall right now.`
            : t`Try again later to see the latest budget and debate details for this city hall.`
        }
      />
    )
  }

  if (!query.data) {
    return null
  }

  const { isConfigured, values } = query.data
  const debate = values.public_debate

  if (!isConfigured || !debate) {
    return null
  }

  return (
    <PublicDebateSection
      key={entityCui}
      entityCui={entityCui}
      locale={locale}
      debate={debate}
      officialBudgetUrl={values.officialBudgetUrl}
    />
  )
}

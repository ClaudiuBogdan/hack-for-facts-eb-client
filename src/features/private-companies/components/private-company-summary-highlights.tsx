import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ChevronRight } from 'lucide-react'
import type { PrivateCompanyViewTab } from '@/schemas/private-company'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { getPrivateCompanyTabLabel } from '../lib/tab-config'

type Props = {
  readonly profile: PrivateCompanyProfile
  readonly onTabChange: (tab: PrivateCompanyViewTab) => void
}

type HighlightRow = {
  readonly tab: PrivateCompanyViewTab
  readonly category: string
  readonly headline: string
  readonly supporting?: string
}

function HighlightLink({
  row,
  onTabChange,
}: {
  readonly row: HighlightRow
  readonly onTabChange: (tab: PrivateCompanyViewTab) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onTabChange(row.tab)}
      className="group flex w-full items-center gap-4 border-2 border-[var(--pnrr-border)] px-4 py-4 text-left transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)]/60 sm:px-5"
      style={{ backgroundColor: 'var(--pnrr-card)' }}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--pnrr-muted)]">
          {row.category}
        </p>
        <p className="text-base font-semibold leading-relaxed text-[var(--pnrr-fg)]">
          {row.headline}
        </p>
        {row.supporting ? (
          <p className="text-sm leading-snug text-[var(--pnrr-muted)]">
            {row.supporting}
          </p>
        ) : null}
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-[var(--pnrr-muted)] group-hover:text-[var(--pnrr-fg)]">
        {getPrivateCompanyTabLabel(row.tab)}
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
      </span>
    </button>
  )
}

export function PrivateCompanySummaryHighlights({
  profile,
  onTabChange,
}: Props) {
  const onrcActivity = profile.caenActivities.find(
    (activity) => activity.source === 'onrc',
  )
  const representativeCount = profile.representatives.length
  const euBranchCount = profile.euBranches.length
  const geography = profile.geography

  const rows: HighlightRow[] = []

  if (onrcActivity || profile.fiscal.fiscalCaen) {
    const fiscalCaen = profile.fiscal.fiscalCaen
    const codeLine = onrcActivity
      ? `${onrcActivity.code} · ${onrcActivity.rev}`
      : fiscalCaen
        ? `${fiscalCaen.code} · ${fiscalCaen.rev}`
        : null

    rows.push({
      tab: 'activity',
      category: t`Activity`,
      headline:
        onrcActivity?.label ??
        (fiscalCaen && !onrcActivity
          ? t`Fiscal CAEN from ANAF`
          : t`No activity codes`),
      supporting: codeLine ?? undefined,
    })
  } else {
    rows.push({
      tab: 'activity',
      category: t`Activity`,
      headline: t`No CAEN codes in snapshot`,
    })
  }

  if (representativeCount > 0 || euBranchCount > 0) {
    const countLine =
      representativeCount > 0 && euBranchCount > 0
        ? t`${representativeCount} representatives · ${euBranchCount} EU branches`
        : representativeCount > 0
          ? t`${representativeCount} legal representatives`
          : t`${euBranchCount} EU branches`

    rows.push({
      tab: 'governance',
      category: t`People and branches`,
      headline:
        profile.representatives[0] && representativeCount > 0
          ? `${profile.representatives[0].name} · ${profile.representatives[0].role}`
          : countLine,
      supporting:
        profile.representatives[0] && representativeCount > 0
          ? countLine
          : undefined,
    })
  } else {
    rows.push({
      tab: 'governance',
      category: t`People and branches`,
      headline: t`No representatives or EU branches listed`,
      supporting: t`Domestic branches and shareholders are not in the open dump`,
    })
  }

  if (profile.fiscal.anafFound && profile.financials.length > 0) {
    const years = [...profile.financials]
      .map((year) => year.fiscalYear)
      .sort((a, b) => a - b)

    rows.push({
      tab: 'financials',
      category: t`Financial history`,
      headline:
        years.length === 1
          ? t`Bilant for ${years[0]}`
          : t`Bilant for ${years.join(', ')}`,
      supporting: t`Full year table with I14, I19, I20, I21`,
    })
  }

  rows.push({
    tab: 'location',
    category: t`Location`,
    headline: geography
      ? `${geography.uatName}, ${geography.countyName}`
      : profile.address.display,
    supporting: geography
      ? t`UAT match: ${geography.matchConfidence}`
      : t`Registered office only — no resolved UAT`,
  })

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--pnrr-muted)]">
        <Trans>Explore details</Trans>
      </p>
      <div className="space-y-2">
        {rows.map((row) => (
          <HighlightLink
            key={row.tab}
            row={row}
            onTabChange={onTabChange}
          />
        ))}
      </div>
    </div>
  )
}

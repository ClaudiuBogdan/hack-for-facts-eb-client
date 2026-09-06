import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ChevronRight } from 'lucide-react'
import type { PrivateCompanyViewTab } from '@/schemas/private-company'
import type { PrivateCompanyProfile } from '@/schemas/private-company'

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
      className="group grid w-full gap-x-4 gap-y-1 rounded-md px-2 py-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(7.5rem,10rem)_1fr_auto] sm:items-baseline"
    >
      <span className="text-sm font-semibold text-foreground">{row.category}</span>
      <span className="min-w-0">
        <span className="block text-base leading-snug text-foreground">
          {row.headline}
        </span>
        {row.supporting ? (
          <span className="mt-1 block text-sm leading-snug text-muted-foreground">
            {row.supporting}
          </span>
        ) : null}
      </span>
      <ChevronRight
        className="hidden h-4 w-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block"
        aria-hidden
      />
    </button>
  )
}

export function PrivateCompanySummaryHighlights({
  profile,
  onTabChange,
}: Props) {
  // The ONRC list is every activity the company is AUTHORISED to carry out —
  // 356 of them for a large retailer, sorted by code. Taking the first is
  // arbitrary: it showed DEDEMAN, a DIY chain, as "growing fruit trees" (0125)
  // because that code sorts first. The main CAEN is what the company actually
  // does, so match the authorised list against it and only fall back to the
  // first entry when no main code is known.
  const mainCaenCode = profile.fiscal.fiscalCaen?.code ?? null
  const onrcActivities = profile.caenActivities.filter(
    (activity) => activity.source === 'onrc',
  )
  const onrcActivity =
    (mainCaenCode !== null
      ? onrcActivities.find((activity) => activity.code === mainCaenCode)
      : undefined) ?? onrcActivities[0]
  const authorisedCount = onrcActivities.length
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

    // The count is worth stating: one named activity out of hundreds authorised
    // reads very differently from one out of one.
    const supporting =
      codeLine && authorisedCount > 1
        ? `${codeLine} · ${t`${authorisedCount} authorised activities`}`
        : (codeLine ?? undefined)

    rows.push({
      tab: 'activity',
      category: t`Activity`,
      headline:
        onrcActivity?.label ??
        (fiscalCaen && !onrcActivity
          ? t`Fiscal CAEN from ANAF`
          : t`No activity codes`),
      supporting,
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
    <section className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Trans>Explore details</Trans>
      </h2>
      <div className="-mx-2 space-y-2">
        {rows.map((row) => (
          <HighlightLink
            key={row.tab}
            row={row}
            onTabChange={onTabChange}
          />
        ))}
      </div>
    </section>
  )
}

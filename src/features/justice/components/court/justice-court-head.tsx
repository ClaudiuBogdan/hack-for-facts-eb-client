import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import type { CourtSheet } from '../../lib/court-model'
import { monthText, percentText } from '../../lib/judicial-format'
import { casesCount, caseCategoryLabel, courtLevelLabel, courtName } from '../../lib/judicial-labels'
import { yearOf } from '../../lib/judicial-model'
import { JusticeCaseLookup } from './justice-case-lookup'

const HEADING = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
} as const

function headingSize(name: string): keyof typeof HEADING {
  return name.length <= 22 ? 'short' : name.length <= 44 ? 'medium' : 'long'
}

const OUT_LINK = 'inline-flex min-h-11 items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0'

/** The way back to the front door; the level and county beside it from a tablet up. */
function CourtKicker({ sheet }: { readonly sheet: Pick<CourtSheet, 'level' | 'county'> | null }) {
  return (
    <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
      <Link to="/justice" className="group inline-flex items-center gap-1.5 hover:text-foreground">
        <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        <span>
          <Trans>Justiție</Trans>
        </span>
      </Link>
      {sheet ? (
        <span className="hidden items-center gap-2 sm:flex">
          <span aria-hidden="true">/</span>
          <span>{courtLevelLabel(sheet.level)}</span>
          {sheet.county ? (
            <>
              <span aria-hidden="true">/</span>
              <span>{countyNameRo(sheet.county) ?? sheet.county}</span>
            </>
          ) : null}
        </span>
      ) : null}
    </MonoLabel>
  )
}

/** The year the page describes; the capture's last year is a part-year and says where it stops. */
function CourtYearSelect({
  year,
  years,
  lastMonth,
  onYear,
}: {
  readonly year: number
  readonly years: readonly number[]
  readonly lastMonth: string | null
  readonly onYear: (year: number) => void
}) {
  const choices = years.includes(year) ? years : [...years, year].sort((a, b) => a - b)
  const lastYear = yearOf(lastMonth ? `${lastMonth}-01` : null)
  const label = (choice: number) => (choice === lastYear && lastMonth ? t`${choice}, până în ${monthText(lastMonth, 'long')}` : String(choice))
  return (
    <Select value={String(year)} onValueChange={(value) => onYear(Number(value))}>
      <SelectTrigger className="h-9 w-auto min-w-28 gap-2 text-sm" aria-label={t`Anul descris`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {[...choices].reverse().map((choice) => (
          <SelectItem key={choice} value={String(choice)}>
            {label(choice)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** What the court is and what it holds in the year, in one sentence computed from the sheet. */
function headSentence(sheet: CourtSheet): ReactNode {
  const [top] = sheet.matters
  const county = sheet.county ? (countyNameRo(sheet.county) ?? sheet.county) : null
  const level = courtLevelLabel(sheet.level)
  // The ÎCCJ's name is its level: the sentence starts with what it holds.
  const what =
    sheet.level === 'inalta_curte' ? null : county === null ? (
      <Trans>{level}.</Trans>
    ) : sheet.county === 'B' ? (
      <Trans>{level} din București.</Trans>
    ) : (
      <Trans>
        {level} din județul {county}.
      </Trans>
    )
  if (sheet.inYear === 0) {
    return (
      <>
        {what} <Trans>Portalul nu are dosare ale ei cu data din {sheet.year}.</Trans>
      </>
    )
  }
  return (
    <>
      {what}{' '}
      {sheet.level === 'inalta_curte' ? (
        // The ÎCCJ's cases come from its own archive, not from the portal.
        top ? (
          <Trans>
            În arhiva ei are {casesCount(sheet.inYear)} cu data din {sheet.year}, cele mai multe la materia „{caseCategoryLabel(top.key) ?? top.key}” (
            {percentText(top.share)}).
          </Trans>
        ) : (
          <Trans>
            În arhiva ei are {casesCount(sheet.inYear)} cu data din {sheet.year}.
          </Trans>
        )
      ) : top ? (
        <Trans>
          Pe portal are {casesCount(sheet.inYear)} cu data din {sheet.year}, cele mai multe la materia „{caseCategoryLabel(top.key) ?? top.key}” (
          {percentText(top.share)}).
        </Trans>
      ) : (
        <Trans>
          Pe portal are {casesCount(sheet.inYear)} cu data din {sheet.year}.
        </Trans>
      )}
    </>
  )
}

export function JusticeCourtHead({
  sheet,
  years,
  onYear,
  aside,
}: {
  readonly sheet: CourtSheet
  readonly years: readonly number[]
  readonly onYear: (year: number) => void
  readonly aside: ReactNode
}) {
  const name = courtName(sheet.code)
  return (
    <section className="relative border-b" aria-labelledby="justice-court-title">
      <TwoLayerLattice idPrefix="justice-court" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="flex items-center justify-between gap-4">
          <CourtKicker sheet={sheet} />
          <CourtYearSelect year={sheet.year} years={years} lastMonth={sheet.newestAt?.slice(0, 7) ?? null} onYear={onYear} />
        </div>
        <div className="mt-4 grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <h1 id="justice-court-title" className={cn('font-extrabold leading-[0.95] tracking-tighter text-foreground', HEADING[headingSize(name)])}>
              {name}
            </h1>
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">{headSentence(sheet)}</p>
            {sheet.parent ? (
              <p className="mt-3 text-sm">
                <Link to="/justice/courts/$code" params={{ code: sheet.parent }} className={OUT_LINK}>
                  <Trans>În circumscripția: {courtName(sheet.parent)}</Trans>
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </p>
            ) : null}
            <JusticeCaseLookup code={sheet.code} className="mt-6" />
          </div>
          <div className="min-w-0 lg:col-span-5 lg:border-l lg:pl-8">{aside}</div>
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/** The head before the sheet arrives (a client-side navigation), or when it could not be read. */
export function JusticeCourtHeadPending({ code, children }: { readonly code: string; readonly children?: ReactNode }) {
  return (
    <section className="relative border-b" aria-busy={children ? undefined : true} aria-labelledby="justice-court-title">
      <TwoLayerLattice idPrefix="justice-court" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <CourtKicker sheet={null} />
        <h1 id="justice-court-title" className={cn('mt-4 font-extrabold leading-[0.95] tracking-tighter text-foreground', HEADING[headingSize(courtName(code))])}>
          {courtName(code)}
        </h1>
        {children ?? <HubPending className="mt-6 max-w-xl" rows={2} />}
      </RuledFrame>
    </section>
  )
}

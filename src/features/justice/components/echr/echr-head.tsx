import { useId, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HubFiguresBand } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import { yearsOf } from '../../lib/echr-model'
import type { EchrSnapshot } from '../../lib/echr-snapshot-types'
import { echrHeadlineText, yearText } from '../../lib/echr-text'
import { dayText } from '../../lib/judicial-format'
import { echrFacts } from './echr-view'

type ChooseYear = (year: number) => void

const TRIGGER = 'inline-flex h-9 items-center gap-2 whitespace-nowrap border border-foreground/25 bg-background px-3 text-sm font-semibold tabular-nums transition-colors hover:border-foreground/60'

function YearMenu({ snapshot, year, onYear }: { readonly snapshot: EchrSnapshot; readonly year: number; readonly onYear: ChooseYear }) {
  const [open, setOpen] = useState(false)
  const captionId = useId()
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={TRIGGER} aria-label={t`Anul: ${yearText(snapshot, year)}`}>
        {yearText(snapshot, year)}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2" aria-labelledby={captionId}>
        <MonoLabel id={captionId} className="block px-2 text-muted-foreground">
          {t`Anul hotărârii`}
        </MonoLabel>
        <div className="mt-1 grid grid-cols-3 gap-1">
          {[...yearsOf(snapshot)].reverse().map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === year}
              aria-label={yearText(snapshot, option)}
              onClick={() => {
                setOpen(false)
                onYear(option)
              }}
              className={cn('min-h-11 border px-2 py-1.5 text-left text-sm tabular-nums hover:bg-muted sm:min-h-0', option === year && 'border-primary font-semibold')}
            >
              {option}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** The ECHR page's head, on the analysis page's grid: the way back, the year and how recent the documents are; the year's question as the headline. */
export function EchrHead({ snapshot, year, onYear }: { readonly snapshot: EchrSnapshot; readonly year: number; readonly onYear: ChooseYear }) {
  const fresh = t`Documente până la ${dayText(snapshot.newest)}`
  return (
    <section className="relative border-b" aria-labelledby="justice-echr-title">
      <TwoLayerLattice idPrefix="justice-echr-head" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="flex items-center justify-between gap-4">
          <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <Link to="/justice" className="group inline-flex min-h-11 items-center gap-1.5 hover:text-foreground sm:min-h-0">
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              <span>{t`Justiție`}</span>
            </Link>
            <span className="hidden items-center gap-2 sm:flex">
              <span aria-hidden="true">/</span>
              <span>{t`CEDO`}</span>
            </span>
          </MonoLabel>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-muted-foreground sm:inline">{fresh}</span>
            <span className="flex items-center gap-2">
              <MonoLabel className="sr-only text-muted-foreground sm:not-sr-only">{t`Anul`}</MonoLabel>
              <YearMenu snapshot={snapshot} year={year} onYear={onYear} />
            </span>
          </div>
        </div>
        <p className="mt-2 text-right text-xs text-muted-foreground sm:hidden">{fresh}</p>
        <h1 id="justice-echr-title" className="mt-6 max-w-5xl text-3xl font-extrabold leading-[1.02] tracking-tighter text-foreground sm:mt-8 sm:text-5xl">
          {echrHeadlineText(year)}
        </h1>
        {/* The crux on the head's bottom rule, where the figures begin. */}
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/** The year's four figures, in the profiles' cells. */
export function EchrFigures({ snapshot, year }: { readonly snapshot: EchrSnapshot; readonly year: number }) {
  const { i18n } = useLingui()
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <HubFiguresBand facts={echrFacts(snapshot, year)} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
      </RuledFrame>
    </section>
  )
}

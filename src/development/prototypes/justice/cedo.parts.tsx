import { useId, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { ArrowLeft, ChevronDown, Info } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { ECHR_FIRST_WHOLE_YEAR, figuresOf, hudocUrl, judgmentsIn, waitYears, yearState, yearsOf } from '@/features/justice/lib/echr-model'
import type { EchrJudgment, EchrSnapshot } from '@/features/justice/lib/echr-snapshot-types'
import { countText, dayText, monthText, signedPercentText } from '@/features/justice/lib/judicial-format'
import { cn } from '@/lib/utils'

/**
 * The ECHR page's parts, shared by both variants (design.md §17): the head
 * with the year, the figures, the year's judgments and the source line.
 * Every figure is the snapshot's; the waits are computed from the
 * application numbers.
 */

export type ChooseYear = (year: number) => void

const TRIGGER = 'inline-flex h-9 items-center gap-2 whitespace-nowrap border border-foreground/25 bg-background px-3 text-sm font-semibold tabular-nums transition-colors hover:border-foreground/60'
const plain = (label: ReactNode, className: string) => <span className={className}>{label}</span>

/** „2026 (până în iulie)" for the year the capture stops in, „2009 (parțial)" for one before it went whole. */
export function yearText(snapshot: EchrSnapshot, year: number): string {
  switch (yearState(snapshot, year)) {
    case 'partial':
      return t`${year} (parțial)`
    case 'running':
      return t`${year} (până în ${monthText(snapshot.newest.slice(0, 7), 'long')})`
    case 'whole':
      return String(year)
  }
}

function YearMenu({ snapshot, year, onYear }: { readonly snapshot: EchrSnapshot; readonly year: number; readonly onYear: ChooseYear }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={TRIGGER} aria-label={t`Anul: ${yearText(snapshot, year)}`}>
        {yearText(snapshot, year)}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <MonoLabel className="block px-2 text-muted-foreground">{t`Anul hotărârii`}</MonoLabel>
        <div className="mt-1 grid grid-cols-3 gap-1">
          {[...yearsOf(snapshot)].reverse().map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === year}
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
          {t`Hotărârile CEDO în cauze cu România, în ${year}`}
        </h1>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/** The year's four figures: judgments and their change, the applications they decide, the median wait, the cases communicated. */
export function echrFacts(snapshot: EchrSnapshot, year: number): readonly HubFact[] {
  const figures = figuresOf(snapshot, year)
  const { change } = figures
  const facts: HubFact[] = [
    {
      key: 'hotarari',
      value: figures.judgments,
      digits: 0,
      label: t`Hotărâri`,
      note:
        change !== null
          ? t`${signedPercentText(change)} față de ${year - 1}`
          : figures.state === 'running'
            ? t`până în ${monthText(snapshot.newest.slice(0, 7), 'long')}`
            : figures.state === 'partial'
              ? t`preluare parțială`
              : null,
      link: plain,
    },
    {
      key: 'cereri',
      value: figures.applications,
      digits: 0,
      label: t`Cereri soluționate`,
      note: figures.joined > 0 ? plural(figures.joined, { one: '# hotărâre reunește mai multe cereri', other: '# hotărâri reunesc mai multe cereri' }) : null,
      link: plain,
    },
  ]
  if (figures.medianWait !== null) facts.push({ key: 'asteptare', value: figures.medianWait, digits: Number.isInteger(figures.medianWait) ? 0 : 1, unit: t`ani`, label: t`De la cerere la hotărâre`, note: t`mediană, din anul depunerii cererii`, link: plain })
  facts.push({ key: 'comunicate', value: figures.communicated, digits: 0, label: t`Cauze comunicate Guvernului`, note: t`și ${countText(figures.decisions)} decizii`, link: plain })
  return facts
}

export function EchrFigures({ snapshot, year }: { readonly snapshot: EchrSnapshot; readonly year: number }) {
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <HubFiguresBand facts={echrFacts(snapshot, year)} locale="ro" />
      </RuledFrame>
    </section>
  )
}

const COUNTRY: Readonly<Record<string, string>> = { BGR: 'Bulgaria', ITA: 'Italia', HUN: 'Ungaria', AUT: 'Austria', FRA: 'Franța', DEU: 'Germania', MDA: 'Republica Moldova' }

function Applications({ judgment }: { readonly judgment: EchrJudgment }) {
  const [first, ...rest] = judgment.applications
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className="font-mono text-sm tabular-nums">{first ?? '—'}</span>
      {rest.length > 0 ? (
        <Popover>
          <PopoverTrigger className="text-xs text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground">{plural(rest.length, { one: '+# cerere', other: '+# cereri' })}</PopoverTrigger>
          <PopoverContent align="start" className="w-72 text-sm">
            <MonoLabel className="block text-muted-foreground">{t`Cererile reunite în hotărâre`}</MonoLabel>
            <ul className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 font-mono text-xs tabular-nums">
              {judgment.applications.map((application) => (
                <li key={application}>{application}</li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      ) : null}
      {judgment.alsoAgainst ? <span className="text-xs text-muted-foreground">{t`și contra: ${judgment.alsoAgainst.map((code) => COUNTRY[code] ?? code).join(', ')}`}</span> : null}
    </span>
  )
}

/** The year's judgments, newest first: the date, the applications, the wait and the text on HUDOC. */
export function EchrJudgments({ snapshot, year, className }: { readonly snapshot: EchrSnapshot; readonly year: number; readonly className?: string }) {
  const titleId = useId()
  const judgments = judgmentsIn(snapshot, year)
  return (
    <section className={cn('border-b', className)} aria-labelledby={titleId}>
      <RuledFrame className="py-12 sm:py-16">
        <HubSectionHead titleId={titleId} index={String(year)} title={t`Hotărârile anului`} />
        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/20 text-left">
              <th scope="col" className="py-2 pr-4 font-normal">
                <MonoLabel className="text-muted-foreground">{t`Data`}</MonoLabel>
              </th>
              <th scope="col" className="py-2 pr-4 font-normal">
                <MonoLabel className="text-muted-foreground">{t`Cererea`}</MonoLabel>
              </th>
              <th scope="col" className="hidden py-2 pr-4 text-right font-normal sm:table-cell">
                <MonoLabel className="text-muted-foreground">{t`De la cerere`}</MonoLabel>
              </th>
              <th scope="col" className="py-2 text-right font-normal">
                <MonoLabel className="text-muted-foreground">{t`Textul pe HUDOC`}</MonoLabel>
              </th>
            </tr>
          </thead>
          <tbody>
            {judgments.map((judgment) => {
              const wait = waitYears(judgment)
              return (
                <tr key={judgment.ecli} className="border-b border-border/70 align-baseline">
                  <td className="whitespace-nowrap py-3 pr-4 tabular-nums">{dayText(judgment.date)}</td>
                  <td className="py-3 pr-4">
                    <Applications judgment={judgment} />
                  </td>
                  <td className="hidden py-3 pr-4 text-right tabular-nums text-muted-foreground sm:table-cell">{wait === null ? '—' : wait === 1 ? t`1 an` : t`${wait} ani`}</td>
                  <td className="whitespace-nowrap py-3 text-right">
                    {judgment.versions.map((version) => (
                      <a
                        key={version.item}
                        href={hudocUrl(version)}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-3 font-medium underline-offset-4 hover:underline"
                        aria-label={version.language === 'fr' ? t`Hotărârea din ${dayText(judgment.date)}, în franceză, pe HUDOC` : t`Hotărârea din ${dayText(judgment.date)}, în engleză, pe HUDOC`}
                      >
                        {version.language === 'fr' ? 'FR' : 'EN'}
                        <span aria-hidden="true"> ↗</span>
                      </a>
                    ))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </RuledFrame>
    </section>
  )
}

function NotesMarker({ notes }: { readonly notes: readonly ReactNode[] }) {
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex min-h-8 min-w-8 items-center justify-center gap-0.5 rounded-sm px-1 text-xs font-semibold tabular-nums text-status-partial-fg transition-colors hover:bg-status-partial-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t`Ce trebuie știut despre aceste date (${notes.length} note)`}
      >
        <Info className="size-4" aria-hidden="true" />
        {notes.length}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] text-sm leading-relaxed">
        <MonoLabel className="block text-muted-foreground">{t`Ce trebuie știut despre aceste date`}</MonoLabel>
        <ul className="mt-3 list-disc space-y-2 pl-4 text-foreground">
          {notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

export function EchrSource({ snapshot, year }: { readonly snapshot: EchrSnapshot; readonly year: number }) {
  const notes = [
    t`O hotărâre publicată în engleză și în franceză e numărată o dată (după ECLI); deciziile și cauzele comunicate, după dată și cereri.`,
    t`Timpul de la cerere la hotărâre e calculat de Transparenta.eu din numărul cererii (anul depunerii) până la anul hotărârii; nu e o statistică a Curții.`,
    t`Cauzele comunicate sunt cererile trimise Guvernului pentru observații: cauze pe rol, nu hotărâri.`,
    t`Numele reclamanților nu sunt preluate aici; textul hotărârii e pe HUDOC, care o publică în engleză și franceză. Linkul deschide versiunea preluată.`,
    t`Hotărârile din ${ECHR_FIRST_WHOLE_YEAR} încoace sunt toate cele de pe HUDOC (verificat pe 7 octombrie 2026); ${ECHR_FIRST_WHOLE_YEAR - 1} e preluat parțial (153 din 168).`,
    ...(figuresOf(snapshot, year).state === 'running' ? [t`${year} e un an în curs: documente până la ${dayText(snapshot.newest)}.`] : []),
  ]
  return (
    <RuledFrame className="py-8">
      <p className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
        <span>
          {t`Sursa: Curtea Europeană a Drepturilor Omului,`}{' '}
          <a href="https://hudoc.echr.coe.int" target="_blank" rel="noreferrer" className="font-medium text-foreground underline-offset-4 hover:underline">
            HUDOC<span aria-hidden="true"> ↗</span>
          </a>
          , {t`documente până la ${dayText(snapshot.newest)}`}
        </span>
        <NotesMarker notes={notes} />
      </p>
    </RuledFrame>
  )
}

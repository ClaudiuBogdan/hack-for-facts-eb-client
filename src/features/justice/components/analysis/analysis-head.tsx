import { Fragment } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowLeft, SlidersHorizontal, X } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { cn } from '@/lib/utils'
import { filterCount, sourceOf, toggled, type LevelKey, type Question } from '../../lib/analysis-model'
import { freshnessText } from '../../lib/analysis-notes'
import { headlineOf, headlineText, unsaidChips, type PhraseRole } from '../../lib/analysis-text'
import { AddFilter, LINK, NotesMarker, QuestionsMenu, ShareIcon, YearMenu } from './analysis-controls'

/**
 * The analysis page's head, on the procurement analysis's grid: the way
 * back, the year and how recent its data is; the question as the headline
 * (a filter's phrase opens the panel, its ✕ drops it); what adds to the
 * question, the link and the caveats' marker.
 */

type Change = (question: Question) => void

const PHRASE = 'text-left underline decoration-muted-foreground/35 decoration-dotted decoration-2 underline-offset-[0.18em] transition-colors hover:decoration-foreground'

function without(question: Question, role: PhraseRole): Question {
  switch (role) {
    case 'matters':
      return { ...question, matters: [] }
    case 'stages':
      return { ...question, stages: [] }
    case 'levels':
      return { ...question, levels: [] }
    case 'counties':
      return { ...question, counties: [] }
    case 'courts':
      return { ...question, courts: [] }
    case 'base':
    case 'dupa':
      return question
  }
}

/** The headline's size by its length, as the profiles size a name: a short question large, a long one a step down. */
function headlineSize(text: string): string {
  if (text.length <= 36) return 'text-4xl sm:text-6xl'
  if (text.length <= 72) return 'text-3xl sm:text-5xl'
  return 'text-2xl sm:text-4xl'
}

function Headline({ question, onChange, onFilters }: { readonly question: Question; readonly onChange: Change; readonly onFilters: () => void }) {
  const phrases = headlineOf(question)
  return (
    <h1 id="justice-analysis-title" className={cn('mt-6 max-w-5xl font-extrabold leading-[1.02] tracking-tighter text-foreground sm:mt-8', headlineSize(headlineText(question)))}>
      {phrases.map((phrase, index) => {
        // A comma belongs to the phrase before it: on a phone, where the ✕ is inline, it never starts a line.
        const comma = phrases[index + 1]?.before.startsWith(',') ? ',' : ''
        return (
          <Fragment key={phrase.role}>
            {phrase.before.replace(/^,/u, '')}
            {phrase.role === 'base' || phrase.role === 'dupa' ? (
              <span>
                {phrase.text}
                {comma}
              </span>
            ) : (
              <span className="group/phrase relative">
                <button type="button" onClick={onFilters} className={PHRASE}>
                  {phrase.text}
                </button>
                {/* Straight after the phrase, no break before it; on a phone the inline ✕ may start the next line, the comma never. */}
                {comma}
                <button
                  type="button"
                  onClick={() => onChange(without(question, phrase.role))}
                  aria-label={t`Scoate „${phrase.text}"`}
                  className="ml-0.5 inline-flex size-[0.7em] items-center justify-center align-[0.05em] text-muted-foreground/70 transition-opacity hover:text-foreground focus-visible:opacity-100 sm:absolute sm:-right-[0.5em] sm:-top-[0.1em] sm:ml-0 sm:size-[0.5em] sm:bg-background sm:opacity-0 sm:group-hover/phrase:opacity-100"
                >
                  <X className="size-[0.55em] sm:size-full" aria-hidden="true" />
                </button>
              </span>
            )}
          </Fragment>
        )
      })}
    </h1>
  )
}

export function AnalysisHead({ question, onChange, onFilters }: { readonly question: Question; readonly onChange: Change; readonly onFilters: () => void }) {
  const chips = unsaidChips(question)
  const count = filterCount(question)
  const fresh = freshnessText(sourceOf(question))
  return (
    <section className="relative border-b" aria-labelledby="justice-analysis-title">
      <TwoLayerLattice idPrefix="justice-analysis-head" />
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
              <span>{t`Analize`}</span>
            </span>
          </MonoLabel>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-muted-foreground sm:inline">{fresh}</span>
            <span className="flex items-center gap-2">
              <MonoLabel className="sr-only text-muted-foreground sm:not-sr-only">{t`Anul`}</MonoLabel>
              <YearMenu question={question} onChange={onChange} />
            </span>
          </div>
        </div>
        <p className="mt-2 text-right text-xs text-muted-foreground sm:hidden">{fresh}</p>
        <Headline question={question} onChange={onChange} onFilters={onFilters} />
        {chips.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label={t`Filtre aplicate`}>
            {chips.map((chip) => (
              <li key={`${chip.role}-${chip.key}`} className="inline-flex items-center gap-1 bg-primary/10 pl-2 text-sm">
                {chip.label}
                <button
                  type="button"
                  onClick={() => onChange(chip.role === 'levels' ? { ...question, levels: toggled(question.levels, chip.key as LevelKey) } : { ...question, counties: toggled(question.counties, chip.key) })}
                  aria-label={t`Scoate ${chip.label}`}
                  className="inline-flex size-8 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1">
          <AddFilter question={question} onChange={onChange} />
          <button type="button" onClick={onFilters} className={LINK}>
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            {t`Filtre`}
            {count > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{count}</span> : null}
          </button>
          <QuestionsMenu question={question} onChange={onChange} />
          <ShareIcon question={question} />
          <NotesMarker question={question} />
        </div>
        {/* The crux on the head's bottom rule, where the bar begins; above the bar, which would cover its top half. */}
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

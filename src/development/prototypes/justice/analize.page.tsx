import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { AnalyzeSource, CrossTable, GroupBar, RankTable, YearsBand } from './analize.answer'
import { FilterSheet } from './analize.filters'
import { AnalyzeFigures, AnalyzeHead, LevelNav } from './analize.head'
import { questionOf, SEARCH_KEYS, searchOf, type Question } from './analize.model'
import { PROTOTYPE_MARKER } from './hub.parts'

/**
 * The justice analysis page (`/development/justice/analize`), in the
 * procurement analysis's language: the head with the question as the
 * headline, the levels in the pinned bar, the figures, the answer by a
 * grouping's tabs, the years, the source; every filter in a sheet. The
 * question lives in the address, as the live page's would: a question is a
 * link. Two variants differ in the answer's table only.
 */

type Variant = 'clasament' | 'incrucisat'

function useQuestion(): readonly [Question, (next: Question) => void] {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const move = (next: Question) =>
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => {
        // The harness's own keys (`v`, `layout`) stay; the question's are written whole, its defaults left out.
        const kept = Object.fromEntries(Object.entries(previous).filter(([key]) => !(SEARCH_KEYS as readonly string[]).includes(key)))
        const written = Object.fromEntries(Object.entries(searchOf(next)).filter(([, value]) => value !== undefined))
        return { ...kept, ...written }
      },
      resetScroll: false,
    })
  return [questionOf(search), move] as const
}

function AnalyzePage({ variant }: { readonly variant: Variant }) {
  const [question, move] = useQuestion()
  const [filters, setFilters] = useState(false)
  return (
    // Clip, not hide: the crux marks overhang the frame, and a hidden overflow would unstick the bar.
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative w-full overflow-x-clip bg-background">
      <AnalyzeHead question={question} onChange={move} onFilters={() => setFilters(true)} />
      <LevelNav question={question} onChange={move} />
      <AnalyzeFigures question={question} />
      <section className="border-b" aria-label={t`Răspunsul`}>
        <RuledFrame className="py-12 sm:py-16">
          <GroupBar question={question} onChange={move} cross={variant === 'incrucisat'} />
          {variant === 'clasament' ? <RankTable question={question} onChange={move} /> : <CrossTable question={question} onChange={move} />}
        </RuledFrame>
      </section>
      <YearsBand question={question} onChange={move} />
      <AnalyzeSource question={question} />
      <FilterSheet question={question} open={filters} onOpenChange={setFilters} onChange={move} />
    </div>
  )
}

export function AnalyzeRanking() {
  return <AnalyzePage variant="clasament" />
}

export function AnalyzeCross() {
  return <AnalyzePage variant="incrucisat" />
}

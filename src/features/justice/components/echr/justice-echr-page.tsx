import { useNavigate } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { echrQuestionOf, echrSearchOf, type EchrQuestion } from '../../lib/echr-address'
import { ECHR_SNAPSHOT } from '../../lib/echr-snapshot'
import type { EchrSnapshot } from '../../lib/echr-snapshot-types'
import { echrDocumentTitle, echrNotes } from '../../lib/echr-text'
import { JusticeSourceLine } from '../justice-source-line'
import { EchrAnswer } from './echr-answer'
import { EchrFigures, EchrHead } from './echr-head'

/**
 * `/justice/echr` (design.md §17–18): the European Court of Human Rights'
 * judgments in cases against Romania, a year at a time — the year and the
 * tab written in the address, so a year is a link and Back is the one
 * before. The site's own keys (`lang`) stay through every change.
 */
export function JusticeEchrPage({ search }: { readonly search: Readonly<Record<string, unknown>> }) {
  const navigate = useNavigate({ from: '/justice/echr' })
  const move = (next: EchrQuestion) => navigate({ search: (previous) => ({ ...previous, ...echrSearchOf(next) }), resetScroll: false })
  return <JusticeEchr snapshot={ECHR_SNAPSHOT} question={echrQuestionOf(search)} onChange={move} />
}

/**
 * The page itself, its question given: the route binds it to the address, a
 * prototype to its own. The head with the year, the year's figures, the
 * answer under its two tabs, the source with its caveats behind one marker.
 * Every figure is the snapshot's (`echr-snapshot.ts`); the page reads nothing.
 */
export function JusticeEchr({
  snapshot,
  question,
  onChange,
}: {
  readonly snapshot: EchrSnapshot
  readonly question: EchrQuestion
  /** Writes the question; a promise resolves once the address holds it (the answer moves the focus then). */
  readonly onChange: (question: EchrQuestion) => void | Promise<void>
}) {
  const { i18n } = useLingui()
  // The browser tab says the year; the route's head gives every year the page's own title.
  useClientDocumentTitle(echrDocumentTitle(i18n, question))
  return (
    // Clip, not hide: the crux marks overhang the frame.
    <div className="relative w-full overflow-x-clip bg-background">
      <EchrHead snapshot={snapshot} year={question.year} onYear={(year) => void onChange({ ...question, year })} />
      <EchrFigures snapshot={snapshot} year={question.year} />
      <EchrAnswer snapshot={snapshot} question={question} onChange={onChange} />
      <RuledFrame className="py-8">
        <JusticeSourceLine asOf={snapshot.newest} source="hudoc" notes={echrNotes(snapshot, question.year)} />
      </RuledFrame>
    </div>
  )
}

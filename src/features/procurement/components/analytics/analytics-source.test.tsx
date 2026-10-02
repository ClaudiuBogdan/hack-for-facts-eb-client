import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AnalyticsCutoff } from '../../api/procurement-analytics-api'
import type { Answer } from '../../hooks/use-procurement-analytics'
import { queryOf } from '../../lib/analytics-model'
import { SourceLine } from './analytics-answer'
import { MethodBody } from './analytics-controls'

/** Verbatim from the server: `procurement/core/source-capture.ts` and `gate-v2.ts`. */
const REPORTED =
  'procurement amounts are source-reported and may include source errors; they are not verified payments'
const CATALOGUE_UNKNOWN = 'source catalogue, not loaded coverage: unknown for this build'
const GATE =
  "spend answers abstain for grain 'direct_acquisition': value coverage 12.4% is below the spend gate (money is omitted, not zeroed)"

const REPORTED_RO =
  'Valorile sunt cele raportate de surse și pot conține erori ale surselor; nu sunt plăți verificate.'
const CATALOGUE_UNKNOWN_RO =
  'Nu se știe ce conțineau cataloagele surselor când au fost încărcate aceste date.'

const CUTOFF: AnalyticsCutoff = { direct: '2026-05', contract: '2026-05', build: '13' }

/** The answer the page holds: the figures' envelope carries the server caveats. */
const answerWith = (caveats: readonly string[]) =>
  ({
    cutoff: CUTOFF,
    period: null,
    figures: { data: { now: { records: null, undated: null, caveats }, before: null }, isError: false, retry: () => undefined },
    ranking: { data: undefined },
    scopes: { now: null, years: null },
  }) as unknown as Answer

const query = queryOf({ tip: 'directe' })

describe('the analytics source line', () => {
  it('shows what the amounts are and the catalogue note from the answer, in Romanian', () => {
    render(<SourceLine query={query} answer={answerWith([GATE, REPORTED, CATALOGUE_UNKNOWN, REPORTED])} />)
    expect(screen.getByText(REPORTED_RO)).toBeTruthy()
    expect(screen.getByText(CATALOGUE_UNKNOWN_RO)).toBeTruthy()
    // The engineer wording never reaches the reader.
    expect(document.body.textContent).not.toContain(REPORTED)
    expect(document.body.textContent).not.toContain('source catalogue')
  })

  it('is in the server-rendered markup too', () => {
    const html = renderToString(<SourceLine query={query} answer={answerWith([REPORTED, CATALOGUE_UNKNOWN])} />)
    expect(html).toContain(REPORTED_RO)
    expect(html).toContain(CATALOGUE_UNKNOWN_RO)
  })

  it('states the cutoff as the last month with data, never as completeness', () => {
    const { container } = render(<SourceLine query={query} answer={answerWith([])} />)
    const text = container.textContent ?? ''
    expect(text).toMatch(/^Sursa: SEAP, date disponibile până în /u)
    expect(text).not.toMatch(/complet/u)
  })
})

describe('the analytics method', () => {
  it('lists the other source notes in plain language, without repeating the source line', () => {
    const { container } = render(<MethodBody query={query} answer={answerWith([GATE, REPORTED, CATALOGUE_UNKNOWN])} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Notele sursei:')
    expect(text).not.toContain('în engleză')
    expect(text).not.toContain(GATE)
    expect(container.querySelectorAll('li')).toHaveLength(1)
    expect(text).not.toContain(REPORTED_RO)
    expect(text).not.toContain(CATALOGUE_UNKNOWN_RO)
  })
})

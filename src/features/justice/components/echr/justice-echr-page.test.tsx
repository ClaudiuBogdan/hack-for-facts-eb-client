import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ECHR_DEFAULT_QUESTION, type EchrQuestion } from '../../lib/echr-address'
import { judgmentsIn, medianWaitByYear } from '../../lib/echr-model'
import { ECHR_SNAPSHOT } from '../../lib/echr-snapshot'
import { medianWaitText } from '../../lib/echr-text'
import { JusticeEchr } from './justice-echr-page'

/**
 * The ECHR page as the server sends it: the year's figures, the tab the
 * address asks (the years, or the year's judgments) and the source, in the
 * order a reader meets them; no name anywhere, a judgment by its date, its
 * application numbers and its HUDOC document.
 */

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

const render = (question: EchrQuestion) => renderToStaticMarkup(<JusticeEchr snapshot={ECHR_SNAPSHOT} question={question} onChange={() => undefined} />)

const text = (html: string) =>
  html
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

const inOrder = (page: string, parts: readonly string[]) => {
  let at = -1
  for (const part of parts) {
    const next = page.indexOf(part, at + 1)
    expect(next, part).toBeGreaterThan(at)
    at = next
  }
}

describe('the ECHR page, as the server sends it', () => {
  it('answers the bare address with the last whole year’s figures and the years, newest first', () => {
    const page = text(render(ECHR_DEFAULT_QUESTION))
    inOrder(page, [
      'Documente până la 16 iulie 2026',
      'Hotărârile CEDO în cauze cu România, în 2025',
      'Hotărâri',
      '−50% față de 2024',
      'Cereri soluționate',
      'De la cerere la hotărâre',
      'Cauze comunicate Guvernului',
      'și 114 decizii',
      'Pe ani, 2009–2026',
      'Hotărârile din 2025',
      '2026',
      '2025',
      '2009',
      '2009: preluare parțială; 2026: până în iulie 2026',
      'Sursa: Curtea Europeană a Drepturilor Omului',
      'documente până la 16 iulie 2026',
    ])
    // The years' tab is open: no judgment's document is linked yet.
    expect(render(ECHR_DEFAULT_QUESTION)).not.toContain('hudoc.echr.coe.int/eng?i=')
  })

  it('lists the year’s judgments when the address asks for them, each by its date, applications and HUDOC document', () => {
    const html = render({ year: 2018, view: 'hotarari' })
    const judgments = judgmentsIn(ECHR_SNAPSHOT, 2018)
    expect(judgments).toHaveLength(82)
    expect(html.match(/href="https:\/\/hudoc\.echr\.coe\.int\/(?:eng|fre)\?i=001-\d+"/gu)).toHaveLength(judgments.reduce((sum, judgment) => sum + judgment.versions.length, 0))
    const page = text(html)
    expect(page).toContain('Hotărârile CEDO în cauze cu România, în 2018')
    expect(page).toContain('74269/16 +22 de cereri')
    // A joined judgment's other applications wait in a popover, not on the page.
    expect(page).not.toContain('Cererile reunite în hotărâre')
  })

  it('says a running year’s cutoff instead of a change, and a partial year as partial', () => {
    expect(text(render({ year: 2026, view: 'ani' }))).toContain('până în iulie 2026')
    expect(text(render({ year: 2026, view: 'ani' }))).not.toContain('față de 2025')
    expect(text(render({ year: 2010, view: 'ani' }))).not.toContain('față de 2009')
    expect(text(render({ year: 2009, view: 'ani' }))).toContain('preluare parțială')
  })

  it('keeps application numbers out of the attributes error reporting records, each link described by its row’s first application', () => {
    // Sentry's click breadcrumbs serialize these attributes of the element clicked and its ancestors: none, in any year, holds one.
    for (const { year } of ECHR_SNAPSHOT.years) {
      const recorded = [...render({ year, view: 'hotarari' }).matchAll(/\s(?:id|class|aria-label|type|name|title|alt)="([^"]*)"/gu)].map((match) => match[1] ?? '')
      expect(recorded.filter((value) => /\d+\/\d{2}\b/u.test(value)), String(year)).toEqual([])
    }
    const html = render({ year: 2018, view: 'hotarari' })
    const [, describedBy] = /<a [^>]*aria-describedby="([^"]+)"/u.exec(html) ?? []
    expect(describedBy).toBeTruthy()
    const described = new RegExp(`id="${describedBy}"[^>]*>([^<]+)<`, 'u').exec(html)?.[1]
    expect(described).toMatch(/^\d+\/\d{2}$/u)
  })

  it('draws each year’s median wait as computed, beside the year’s four counts', () => {
    const page = text(render(ECHR_DEFAULT_QUESTION))
    for (const [year, wait] of medianWaitByYear(ECHR_SNAPSHOT)) {
      const entry = ECHR_SNAPSHOT.years.find((candidate) => candidate.year === year)
      const counts = [entry?.communicated, entry?.decisions, entry?.judgments, entry?.applications].join(' ')
      expect(page, String(year)).toContain(`${year} ${counts} ${wait === null ? '—' : medianWaitText(wait)} `)
    }
  })

  it('marks a later judgment in a judged case, and names a HUDOC link by its visible language', () => {
    const html = render({ year: 2025, view: 'hotarari' })
    expect(text(html)).toContain('hotărâre ulterioară, într-o cauză judecată')
    // No `aria-label` on a HUDOC link: its name is its text, the visible language first (WCAG 2.5.3).
    expect(html).not.toMatch(/<a [^>]*href="https:\/\/hudoc[^>]*aria-label=/u)
    expect(text(html)).toMatch(/EN , hotărârea din \d+ \p{L}+ 2025 pe HUDOC \(se deschide într-o filă nouă\)/u)
  })

  it('names no one: the page holds dates, counts, application numbers and HUDOC links only', () => {
    const page = text(render({ year: 2018, view: 'hotarari' }))
    // HUDOC titles read „CASE OF <NAME> v. ROMANIA"; nothing like it is stored or drawn.
    expect(page).not.toMatch(/\bv\. ROMANIA\b|\bc\. ROUMANIE\b|CASE OF|AFFAIRE/iu)
  })
})

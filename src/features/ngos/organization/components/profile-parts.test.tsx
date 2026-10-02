import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { NgoStatement } from '../api'
import { FUNKY, FUNKY_STATEMENTS } from '../test/fixtures'
import { AnafFacts, RegistryFacts, StatementReviewNote } from './profile-parts'

vi.mock('@/features/statistics/lib/format', () => ({ activeNumberLocale: () => 'ro-RO' }))

describe('AnafFacts', () => {
  it('shows each of ANAF’s two reads on its own, dated: one missing never hides the other', () => {
    render(<AnafFacts organization={{ ...FUNKY, anafRegistration: { availability: 'not_loaded', data: null } }} />)
    expect(screen.getByText(/Date indisponibile\./)).toBeInTheDocument()
    expect(screen.getByText('Plătitoare de TVA')).toBeInTheDocument()
    expect(screen.getByText(/^Situația fiscală, citită la/)).toBeInTheDocument()
    expect(screen.queryByText(/^Înregistrarea, citită la/)).not.toBeInTheDocument()
  })

  it('dates the registration from its own read where the fiscal one is missing', () => {
    render(<AnafFacts organization={{ ...FUNKY, fiscal: { availability: 'not_released', data: null } }} />)
    expect(screen.getByText(/Nepublicat\./)).toBeInTheDocument()
    expect(screen.getByText(/^Înregistrarea, citită la/)).toBeInTheDocument()
  })
})

describe('RegistryFacts', () => {
  it('names the fields its registry observations disagree on, in words, not the server’s codes', () => {
    render(<RegistryFacts organization={{ ...FUNKY, conflicts: ['name', 'county', 'somethingNew'] }} />)
    expect(screen.getByText('numele')).toBeInTheDocument()
    expect(screen.getByText('județul')).toBeInTheDocument()
    // A code the page does not know yet is shown as it came, rather than dropped.
    expect(screen.getByText('somethingNew')).toBeInTheDocument()
  })
})

describe('StatementReviewNote', () => {
  const base = FUNKY_STATEMENTS[0]!
  /** The statement with I38 (and I1) as given and the server's review. */
  const statement = (I38: string | null, quality: NgoStatement['quality']): NgoStatement => ({
    ...base,
    indicators: [...base.indicators.filter((indicator) => indicator.code !== 'I38'), { code: 'I38', label: 'Venituri totale - la 31.12', value: I38 }],
    quality,
  })
  const review = (codes: readonly string[], ruleVersion = 'ngo-revenue-v1') => ({
    ruleVersion,
    assessment: 'assessed',
    suspected: true,
    reasons: codes.map((code) => ({ code, detail: `${code} detail` })),
  })
  const note = () => screen.queryByRole('note')

  it('says why of the total revenue, read by its code: one reason, a small amount', () => {
    render(<StatementReviewNote statement={statement('750', review(['REVENUE_EQUALS_FIXED_ASSETS']))} />)
    expect(note()).toHaveTextContent(
      'De verificat: veniturile totale (I38), 750 lei, sunt egale cu activele imobilizate (I1). Un semnal de verificare, nu o eroare confirmată; valorile sunt cele publicate.',
    )
  })

  it('joins both reasons, and keeps them where the revenue cell is blank', () => {
    const { unmount } = render(<StatementReviewNote statement={statement('6226050000', review(['IMPLAUSIBLE_REVENUE', 'REVENUE_EQUALS_FIXED_ASSETS']))} />)
    expect(note()).toHaveTextContent(/veniturile totale \(I38\), 6,2.mld\. lei, depășesc 1 mld\. lei și sunt egale cu activele imobilizate \(I1\)\./)
    unmount()
    render(<StatementReviewNote statement={statement(null, review(['REVENUE_EQUALS_FIXED_ASSETS']))} />)
    expect(note()).toHaveTextContent('De verificat: veniturile totale (I38) sunt egale cu activele imobilizate (I1).')
  })

  it('says a reason or a rule version it does not know by the server’s own code and detail, never as a revenue predicate', () => {
    const { unmount } = render(<StatementReviewNote statement={statement('750', review(['REVENUE_EQUALS_FIXED_ASSETS', 'STAFF_MISMATCH']))} />)
    expect(note()).toHaveTextContent('sunt egale cu activele imobilizate (I1). Alt semnal al platformei: STAFF_MISMATCH: STAFF_MISMATCH detail.')
    unmount()
    render(<StatementReviewNote statement={statement('750', review(['REVENUE_EQUALS_FIXED_ASSETS'], 'ngo-revenue-v2'))} />)
    expect(note()).toHaveTextContent('De verificat: Alt semnal al platformei: REVENUE_EQUALS_FIXED_ASSETS: REVENUE_EQUALS_FIXED_ASSETS detail.')
    expect(note()).not.toHaveTextContent('veniturile totale')
  })

  it('says nothing where the server flags nothing, could not tell, or gave no readable review', () => {
    for (const quality of [
      { ruleVersion: 'ngo-revenue-v1', assessment: 'assessed', suspected: false, reasons: [] },
      { ruleVersion: 'ngo-revenue-v1', assessment: 'unsupported', suspected: null, reasons: [] },
      null,
    ]) {
      const { unmount } = render(<StatementReviewNote statement={statement('750', quality)} />)
      expect(note()).toBeNull()
      unmount()
    }
  })

  it('reads a code that names an inherited property as a rule it does not know', () => {
    render(<StatementReviewNote statement={statement('750', review(['toString', '__proto__']))} />)
    expect(note()).toHaveTextContent('De verificat: Alt semnal al platformei: toString: toString detail; __proto__: __proto__ detail.')
  })

  it('still says it is flagged when no reason comes with it', () => {
    render(<StatementReviewNote statement={statement('750', review([]))} />)
    expect(note()).toHaveTextContent('De verificat: platforma marchează această situație pentru verificare.')
  })
})

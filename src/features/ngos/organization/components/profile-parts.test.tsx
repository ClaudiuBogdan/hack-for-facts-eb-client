import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { FUNKY } from '../test/fixtures'
import { AnafFacts, RegistryFacts } from './profile-parts'

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

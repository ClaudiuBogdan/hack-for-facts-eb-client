import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CaenDescription } from './caen-description'

describe('visible CAEN revision alternatives', () => {
  it('shows both conflicting descriptions and their revisions without choosing one', () => {
    render(<CaenDescription caen={{ code: '4100', revision: null, basis: 'REVISION_UNKNOWN', label: null, descriptionStatus: 'CONFLICT', descriptions: [{ revision: 'rev1', label: 'Captarea, tratarea și distribuția apei' }, { revision: 'rev3', label: 'Lucrări de construcții ale clădirilor' }] }} />)
    expect(screen.getByText('Revizie nepublicată — denumiri diferite')).toBeVisible()
    expect(screen.getByText('Captarea, tratarea și distribuția apei', { exact: false })).toBeVisible()
    expect(screen.getByText('Lucrări de construcții ale clădirilor', { exact: false })).toBeVisible()
    expect(screen.getByText('Rev.1 ·')).toBeVisible()
    expect(screen.getByText('Rev.3 ·')).toBeVisible()
  })

  it('shows a shared description with a visible unknown-source-revision marker', () => {
    render(<CaenDescription caen={{ code: '4941', revision: null, basis: 'REVISION_UNKNOWN', label: 'Transporturi rutiere de mărfuri', descriptionStatus: 'CONSENSUS', descriptions: [{ revision: 'rev2', label: 'Transporturi rutiere de mărfuri' }, { revision: 'rev3', label: 'Transporturi rutiere de mărfuri' }] }} />)
    expect(screen.getByText('4941 · Transporturi rutiere de mărfuri')).toBeVisible()
    expect(screen.getByText('Revizie nepublicată')).toBeVisible()
  })
})

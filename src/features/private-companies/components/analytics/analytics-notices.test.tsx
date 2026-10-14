import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UnreadNotice } from './analytics-notices'

describe('UnreadNotice', () => {
  it('says a value it could not read apart from a filter it does not have', () => {
    render(<UnreadNotice keys={['onrc_caen', 'nume', 'inregistrare']} />)
    expect(screen.getByText('Unele valori din adresă nu au putut fi citite')).toBeInTheDocument()
    expect(screen.getByText('Răspunsul de mai jos nu le folosește: onrc_caen.')).toBeInTheDocument()
    expect(screen.getByText('Analiza nu are aceste filtre, iar răspunsul de mai jos nu le aplică: nume, inregistrare.')).toBeInTheDocument()
  })

  it('does not call a filter it does not have unreadable', () => {
    render(<UnreadNotice keys={['inregistrare']} />)
    expect(screen.getByText('Unele filtre din adresă nu sunt aplicate')).toBeInTheDocument()
    expect(screen.queryByText(/nu au putut fi citite|nu le folosește/u)).toBeNull()
  })
})

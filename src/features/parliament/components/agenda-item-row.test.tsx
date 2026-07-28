import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ParliamentAgendaItem } from '@/schemas/parliament'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    ...rest
  }: {
    children: React.ReactNode
    to: string
    params?: Record<string, string>
  }) => {
    const href = Object.entries(params ?? {}).reduce(
      (acc, [key, value]) => acc.replace(`$${key}`, value),
      to,
    )
    return (
      <a href={href} {...(rest as Record<string, unknown>)}>
        {children}
      </a>
    )
  },
}))

import { AgendaItemRow } from './agenda-item-row'

const item = (
  over: Partial<ParliamentAgendaItem> = {},
): ParliamentAgendaItem =>
  ({
    agendaItemKey: 'k1',
    rowIndex: 0,
    numberText: '1.',
    itemKind: 'debate',
    committeeRapporteurs: [],
    procedureUrgency: false,
    decisionalChamber: false,
    debateReservation: false,
    resolutionStatus: 'linked',
    documents: [],
    ...over,
  }) as ParliamentAgendaItem

describe('AgendaItemRow — the bill', () => {
  it('links a bill we hold a dossier for', () => {
    render(
      <AgendaItemRow
        item={item({ billKey: '21012', billLabel: 'Pl-x 418/2023' })}
      />,
    )
    expect(screen.getByText('Pl-x 418/2023').closest('a')).toHaveAttribute(
      'href',
      '/parlament/proiecte/21012',
    )
  })

  it('names an unlinked bill WITHOUT inventing a route to it', () => {
    // The newest agenda routinely names bills registered days earlier that have
    // not been ingested — 3 of the 7 points on 27-31 July 2026. A missing link
    // is honest; a guessed one is not.
    render(<AgendaItemRow item={item({ billLabel: 'Pl-x 520/2026' })} />)
    const label = screen.getByText('Pl-x 520/2026')
    expect(label.closest('a')).toBeNull()
    expect(label).toBeInTheDocument()
  })
})

describe('AgendaItemRow — fields the extraction welded together', () => {
  it('shows the committee alone, not the flags fused onto it', () => {
    render(
      <AgendaItemRow
        item={item({
          committeeRapporteurs: [
            'Comisia pentru administraţie publicăProcedură de urgenţăCameră decizionalăSe dezbate sub rezerva depunerii raportului',
          ],
          procedureUrgency: true,
          decisionalChamber: true,
          debateReservation: true,
        })}
      />,
    )
    expect(
      screen.getByText('Comisia pentru administraţie publică'),
    ).toBeInTheDocument()
    // The flags are badges of their own; the committee line must not repeat them.
    expect(
      screen.queryByText(/publicăProcedură de urgenţă/),
    ).not.toBeInTheDocument()
  })

  it('drops a Senate date the extraction severed at the full stop', () => {
    // "Adoptat de Senat -2.06.2026" arrives as "Adoptat de Senat -2" on 24,733
    // of 80,186 rows. A partial date is worse than none.
    render(<AgendaItemRow item={item({ senateDisposition: 'Adoptat de Senat -2' })} />)
    expect(screen.getByText('Adoptat de Senat')).toBeInTheDocument()
  })

  it('says nothing when the field held only flag text', () => {
    render(<AgendaItemRow item={item({ committeeRapporteurs: ['Cameră decizională'] })} />)
    expect(screen.queryByText('Raport:')).not.toBeInTheDocument()
  })
})

describe('AgendaItemRow — flags', () => {
  it('marks the point that may not be reached at all', () => {
    // The only flag that qualifies whether the plan holds.
    render(<AgendaItemRow item={item({ debateReservation: true })} />)
    expect(
      screen.getByText('Se dezbate doar dacă raportul e depus'),
    ).toBeInTheDocument()
  })

  it('shows no flag row when the source printed none', () => {
    render(<AgendaItemRow item={item()} />)
    expect(screen.queryByText('Cameră decizională')).not.toBeInTheDocument()
  })
})

describe('AgendaItemRow — documents', () => {
  it('folds the dossier behind a count instead of opening a thousand links', () => {
    // A point carries a MEDIAN of 12 documents and up to 244 — the bill's whole
    // paper trail — so an 80-point agenda would otherwise open with ~1,000.
    const documents = Array.from({ length: 12 }, (_, index) => ({
      url: `https://cdep.ro/doc/${String(index)}`,
      label: `Document ${String(index)}`,
      manifestSide: 'cdep',
    }))
    render(<AgendaItemRow item={item({ documents })} />)
    expect(screen.queryByText('Document 0')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Documente la dosar \(12\)/ }),
    ).toBeInTheDocument()
  })

  it('opens them on request', async () => {
    const user = userEvent.setup()
    render(
      <AgendaItemRow
        item={item({
          documents: [
            {
              url: 'https://cdep.ro/doc/1',
              label: 'Expunerea de motive',
              manifestSide: 'cdep',
            },
          ],
        })}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Documente la dosar/ }))
    // The label sits in a truncating span inside the anchor.
    expect(
      screen.getByText('Expunerea de motive').closest('a'),
    ).toHaveAttribute('href', 'https://cdep.ro/doc/1')
  })
})

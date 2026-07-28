import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ParliamentAgenda } from '@/schemas/parliament'

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

import { AgendaDossierHeader } from './agenda-dossier-header'

const sitting = (
  date: string,
  over: Partial<{ stenogramSessionKey: string; dateSource: string }> = {},
) => ({
  sittingKey: `s-${date}`,
  chamber: 'camera_deputatilor',
  date,
  dateSource: 'ordinezi_title',
  ...over,
})

const agenda = (over: Partial<ParliamentAgenda> = {}): ParliamentAgenda =>
  ({
    agendaKey: 'a1',
    chamber: 'camera_deputatilor',
    title: 'Ordinea de zi pentru sedinţa Camerei Deputaţilor din 27 - 31 iulie 2026',
    approvedDate: '2026-07-27',
    sourceUrl: 'https://cdep.ro/x',
    itemCount: 7,
    billCount: 3,
    namedBillCount: 6,
    sittings: [
      sitting('2026-07-27'),
      sitting('2026-07-28'),
      sitting('2026-07-31'),
    ],
    ...over,
  }) as ParliamentAgenda

describe('AgendaDossierHeader', () => {
  it('leads with the span, which is what identifies an order of business', () => {
    render(<AgendaDossierHeader agenda={agenda()} />)
    expect(
      screen.getByRole('heading', { level: 1, name: '27 – 31 iulie 2026' }),
    ).toBeInTheDocument()
  })

  it('prints the sitting days without a year or a time', () => {
    // The heading above already carries the year, and the source publishes no
    // time — the previous header invented "27 iulie 2026 la 03:00".
    render(<AgendaDossierHeader agenda={agenda()} />)
    expect(screen.getByText('27 iul.')).toBeInTheDocument()
    expect(screen.queryByText(/\d\d:\d\d/)).not.toBeInTheDocument()
  })

  it('says the date caveat ONCE for the whole card', () => {
    // Repeated under every chip, a five-day agenda read as five different
    // warnings about five different things.
    render(<AgendaDossierHeader agenda={agenda()} />)
    expect(screen.getAllByText(/Data este cea din titlul ordinii de zi/)).toHaveLength(1)
  })

  it('keeps the plan-not-record statement, which the page exists to make', () => {
    render(<AgendaDossierHeader agenda={agenda()} />)
    expect(screen.getByText(/nu dovedește că a fost dezbătut sau votat/)).toBeInTheDocument()
  })

  it('opens a transcript for a day that has one, and not for a day that does not', () => {
    render(
      <AgendaDossierHeader
        agenda={agenda({
          sittings: [
            sitting('2026-07-27', { stenogramSessionKey: 'cdep:99' }),
            sitting('2026-07-28'),
          ],
        }) as ParliamentAgenda}
      />,
    )
    expect(screen.getByText('27 iul.').closest('a')).toHaveAttribute(
      'href',
      '/parlament/stenograme/sedinte/cdep:99',
    )
    expect(screen.getByText('28 iul.').closest('a')).toBeNull()
  })

  it('names a joint sitting as one, rather than as the Chamber', () => {
    // 220 of 1,297 agendas are joint, and `chamber` reads camera_deputatilor on
    // every one of them.
    render(
      <AgendaDossierHeader
        agenda={agenda({
          title:
            'Ordinea de zi pentru sedinţa comună a Camerei Deputaţilor şi Senatului din 22 decembrie 2011',
        })}
      />,
    )
    expect(
      screen.getByText('Ședință comună · Camera Deputaților și Senatul'),
    ).toBeInTheDocument()
  })

  it('says plainly when the source published no approval date', () => {
    render(<AgendaDossierHeader agenda={agenda({ approvedDate: undefined })} />)
    expect(screen.getByText('Fără dată de aprobare publicată')).toBeInTheDocument()
  })
})

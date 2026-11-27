import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import { ActTimelineBand } from './act-timeline-band'

const timeline = [
  {
    kind: 'amendment',
    effectiveDate: '2020-01-01',
    label: 'Modificat prin Legea nr. 1/2020',
    eventSource: 'portal',
    relatedActId: '1',
  },
]

describe('ActTimelineBand', () => {
  it('says so when the server cut the timeline at its bound (I-20)', () => {
    render(<ActTimelineBand timeline={timeline} complete={false} />)
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    expect(screen.getByRole('status').textContent).toContain('Lista nu este completă')
  })

  it('shows no notice for a complete timeline', () => {
    render(<ActTimelineBand timeline={timeline} />)
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('sets each event as a line: the date at the left, the event and its source at the right', () => {
    render(<ActTimelineBand timeline={timeline} />)
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    const line = screen.getByText('Modificat prin Legea nr. 1/2020').closest('li')
    expect(line).toHaveClass('grid')
    expect(line?.firstElementChild).toHaveClass('tabular-nums', 'text-muted-foreground')
    expect(line).toHaveTextContent('Portal')
  })

  it('keeps its first twelve events and one control, not a link, for the rest', () => {
    const many = Array.from({ length: 13 }, (_, index) => ({
      ...timeline[0],
      effectiveDate: `2020-01-${String(index + 1).padStart(2, '0')}`,
      label: `Eveniment ${index + 1}`,
    })) as typeof timeline
    render(<ActTimelineBand timeline={many} />)
    fireEvent.click(screen.getByRole('button', { name: /Ce s-a întâmplat cu acest act/ }))

    expect(screen.getAllByRole('listitem')).toHaveLength(12)
    const more = screen.getByRole('button', { name: /Arată toate cele\s+13 evenimente/ })
    expect(more).toHaveAttribute('aria-controls', 'act-timeline-entries')
    expect(more).not.toHaveClass('text-primary')
    fireEvent.click(more)
    expect(screen.getAllByRole('listitem')).toHaveLength(13)
    expect(screen.getByRole('button', { name: 'Arată mai puține' })).toHaveAttribute('aria-expanded', 'true')
  })
})

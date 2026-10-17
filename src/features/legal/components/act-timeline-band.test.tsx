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
})

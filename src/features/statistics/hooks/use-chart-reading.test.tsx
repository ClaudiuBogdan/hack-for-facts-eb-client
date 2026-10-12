import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useChartReading } from './use-chart-reading'

/**
 * The reading of a period chart from the pointer and the keyboard: a line's
 * periods run edge to edge, a bar chart's (`bands`) sit in equal slots and the
 * pointer reads the slot it is in; the keyboard opens on the latest period,
 * or where a chart rests (`rest`).
 */

function Plot({ count, bands, rest }: { readonly count: number; readonly bands?: boolean; readonly rest?: number }) {
  const { active, plotRef, handlers } = useChartReading(count, { bands, rest })
  return (
    <div ref={plotRef} role="slider" tabIndex={0} aria-valuenow={active ?? -1} {...handlers}>
      {active === null ? 'rest' : `period ${active}`}
    </div>
  )
}

/** The plot 180 px wide from the left edge: 18 periods, one 10-px slot each. */
function measured(element: HTMLElement) {
  element.getBoundingClientRect = () => ({ left: 0, right: 180, width: 180, top: 0, bottom: 100, height: 100, x: 0, y: 0, toJSON: () => ({}) })
}

describe('useChartReading', () => {
  it('reads a line’s nearest period, edge to edge', () => {
    render(<Plot count={18} />)
    const plot = screen.getByRole('slider')
    measured(plot)
    // 100 px of 180 on 17 gaps: period 9.4, the nearest is 9.
    fireEvent.pointerMove(plot, { clientX: 100, pointerType: 'mouse' })
    expect(plot.textContent).toBe('period 9')
  })

  it('reads a bar chart’s slot under the pointer', () => {
    render(<Plot count={18} bands />)
    const plot = screen.getByRole('slider')
    measured(plot)
    // 100 px is the start of the eleventh 10-px slot.
    fireEvent.pointerMove(plot, { clientX: 100, pointerType: 'mouse' })
    expect(plot.textContent).toBe('period 10')
    fireEvent.pointerMove(plot, { clientX: 179, pointerType: 'mouse' })
    expect(plot.textContent).toBe('period 17')
  })

  it('opens the keyboard on the latest period, or on the one the chart rests on', () => {
    const { unmount } = render(<Plot count={18} bands />)
    fireEvent.focus(screen.getByRole('slider'))
    expect(screen.getByRole('slider').textContent).toBe('period 17')
    unmount()
    render(<Plot count={18} bands rest={16} />)
    const plot = screen.getByRole('slider')
    fireEvent.focus(plot)
    expect(plot.textContent).toBe('period 16')
    fireEvent.keyDown(plot, { key: 'ArrowRight' })
    expect(plot.textContent).toBe('period 17')
  })
})

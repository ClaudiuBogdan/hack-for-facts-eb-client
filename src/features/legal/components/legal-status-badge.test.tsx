import { describe, expect, it } from 'vitest'
import { render, screen } from '@/test/test-utils'
import type { LegalActStatus } from '@/schemas/legal'
import { LegalStatusBadge } from './legal-status-badge'

/** What the svg draws, read from its children: a disc, a disc in a ring, a half disc, a ring, a dashed ring. */
function shapeOf(svg: SVGElement): string {
  const circles = [...svg.querySelectorAll('circle')]
  const filled = circles.filter((circle) => circle.getAttribute('fill') === 'currentColor').length
  if (svg.querySelector('path') !== null) return 'half'
  if (circles.length === 2 && filled === 1) return 'amended'
  if (circles.length === 1 && filled === 1) return 'full'
  if (circles.length === 1 && circles[0]?.hasAttribute('stroke-dasharray')) return 'dashed'
  if (circles.length === 1) return 'ring'
  return 'nothing'
}

/** Each status: its name in words, the shape that says how much of the act is in force, and the shape's colour. */
const MARKS: readonly (readonly [LegalActStatus, string, string, string])[] = [
  ['in-vigoare', 'În vigoare', 'full', 'text-status-live-fg'],
  ['modificat', 'Modificat', 'amended', 'text-status-live-fg'],
  ['abrogat-partial', 'Abrogat parțial', 'half', 'text-status-partial-fg'],
  ['suspendat', 'Suspendat', 'ring', 'text-status-partial-fg'],
  ['abrogat', 'Abrogat', 'ring', 'text-status-blocked-fg'],
  ['iesit-din-vigoare', 'Ieșit din vigoare', 'ring', 'text-muted-foreground'],
  ['necunoscut', 'Necunoscut', 'dashed', 'text-muted-foreground'],
]

describe('LegalStatusBadge', () => {
  it.each(MARKS)('draws %s as „%s" with a %s shape in %s', (status, name, shape, tone) => {
    const { container } = render(<LegalStatusBadge status={status} />)
    // the name is the element's text: nothing is said by shape or colour alone
    expect(container.textContent).toBe(name)
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(1)
    const svg = svgs[0] as SVGElement
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(shapeOf(svg)).toBe(shape)
    expect(svg).toHaveClass(tone)
  })

  it('draws nothing when the status is not known to the server', () => {
    const { container } = render(<LegalStatusBadge status={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('keeps the quiet style in a list', () => {
    render(<LegalStatusBadge status="abrogat" />)
    expect(screen.getByText('Abrogat')).toHaveClass('text-sm')
    expect(screen.getByText('Abrogat')).not.toHaveClass('font-semibold')
  })
})

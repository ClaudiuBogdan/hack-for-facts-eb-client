import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@/test/test-utils'
import { bridgeCovers } from '../lib/act-facts'
import {
  legalActDetailFixture,
  legalActDetailV2Fixture,
  legalActDetailV2UnbridgedFixture,
} from '../mocks/fixtures/legal-act-detail'
import { ActAnchorsBand } from './act-anchors-band'
import { ActReferencesBand } from './act-references-band'
import { ActTimelineBand } from './act-timeline-band'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

const openBand = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }))

/**
 * legal_v2 bridges links, anchors and the timeline from the previous corpus.
 * Where it does not hold the act, those are UNKNOWN: each band says "not
 * available", never shows an empty complete list or a zero.
 */
describe('bridged bands on an act the previous corpus does not hold', () => {
  const act = legalActDetailV2UnbridgedFixture

  it('knows which fields the bridge covers', () => {
    expect(bridgeCovers(legalActDetailFixture, 'timeline')).toBe(true)
    expect(bridgeCovers(legalActDetailV2Fixture, 'timeline')).toBe(true)
    expect(bridgeCovers(act, 'timeline')).toBe(false)
    expect(bridgeCovers(act, 'links')).toBe(false)
  })

  it('says the history is not available instead of an empty, complete timeline', () => {
    render(<ActTimelineBand timeline={[]} complete available={bridgeCovers(act, 'timeline')} />)
    openBand(/Ce s-a întâmplat cu acest act/)
    expect(screen.getByText('Istoricul nu este disponibil pentru acest act.')).toBeInTheDocument()
  })

  it('treats an empty timeline the server did not vouch for as unknown, too', () => {
    render(<ActTimelineBand timeline={[]} complete={null} />)
    openBand(/Ce s-a întâmplat cu acest act/)
    expect(screen.getByText('Istoricul nu este disponibil pentru acest act.')).toBeInTheDocument()
  })

  it('says the links and anchors are not available, never "0 trimiteri"', () => {
    render(
      <>
        <ActReferencesBand group={act.inLinks} direction="in" available={false} />
        <ActAnchorsBand group={act.incomingAnchors} available={false} />
      </>,
    )
    openBand(/Cine îl citează/)
    openBand(/Trimiteri afirmate de portal/)
    expect(screen.getByText('Legăturile nu sunt disponibile pentru acest act.')).toBeInTheDocument()
    expect(
      screen.getByText('Trimiterile afirmate de portal nu sunt disponibile pentru acest act.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/0 trimiteri|0 de trimiteri|0 ancore/)).not.toBeInTheDocument()
  })

  it('reads an unknown anchor total as "at least" the rows shown', () => {
    const anchor = {
      sourceDocumentId: '1',
      linkText: null,
      targetFragment: null,
      targetResolution: null,
      sourceAct: null,
    }
    render(<ActAnchorsBand group={{ totalCount: null, items: [anchor] }} />)
    expect(screen.getByText(/cel puțin 1 ancoră/)).toBeInTheDocument()
  })

  it('still hides a band whose total is a known zero', () => {
    const { container } = render(
      <ActReferencesBand group={{ totalCount: 0, hasMore: false, items: [] }} direction="out" />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

import { render, screen } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import type { ShownVersion } from '../lib/legal-versions'
import { legalActDetailV2Fixture } from '../mocks/fixtures/legal-act-detail'
import { ActDefaultNotices } from './act-default-notices'

/**
 * The date in the notices about the default text is the page's one date for a version (`shownVersionDate`): the
 * Portal's for a consolidation, else its own, else its listed version's. The same date the box, the bar and the
 * versions' order use.
 */
const listed = legalActDetailV2Fixture.documents[0]
if (listed === undefined) throw new Error('the legal_v2 fixture lost its versions')

const shown = (over: Partial<ShownVersion>): ShownVersion => ({
  documentId: 'f1',
  versionKind: 'consolidare',
  versionDate: null,
  caveat: null,
  portalLabelRaw: null,
  portalLabelDate: null,
  sourceUrl: null,
  ...over,
})
/** An act that lists the shown version `f1` with the given dates. */
const actListing = (dates: { readonly versionDate: string | null; readonly firstPublicationDate: string | null }) => ({
  ...legalActDetailV2Fixture,
  documents: [{ ...listed, documentId: 'f1', versionKind: 'consolidare', portalLabelDate: null, ...dates }],
})
const undated = actListing({ versionDate: null, firstPublicationDate: null })

describe('ActDefaultNotices: the shown version\'s date', () => {
  it('names a consolidation by the Portal\'s date', () => {
    render(<ActDefaultNotices act={undated} shown={shown({ portalLabelDate: '2023-11-30', versionDate: '2025-02-01' })} notCurrentDefault />)
    const sentence = screen.getByText(/Afișăm versiunea din/)
    expect(sentence).toHaveTextContent(/2023/)
    expect(sentence).not.toHaveTextContent(/2025/)
  })

  it('falls back to the version\'s own date when the Portal gives none, instead of dropping the date', () => {
    render(<ActDefaultNotices act={undated} shown={shown({ versionDate: '2025-02-01' })} notCurrentDefault />)
    expect(screen.getByText(/Afișăm versiunea din/)).toHaveTextContent(/2025/)
  })

  it('names no date only when there is none at all', () => {
    render(<ActDefaultNotices act={undated} shown={shown({})} notCurrentDefault />)
    expect(screen.queryByText(/Afișăm versiunea din/)).not.toBeInTheDocument()
    expect(screen.getByText(/Afișăm cea mai recentă versiune cu text/)).toBeInTheDocument()
  })

  it('does not call a version undated when the Portal dates it, or when its listed version has a date', () => {
    const { unmount } = render(<ActDefaultNotices act={undated} shown={shown({ portalLabelDate: '2023-11-30' })} notCurrentDefault={false} onlyReadableDefault />)
    expect(screen.queryByText(/Data acestei versiuni nu este cunoscută/)).not.toBeInTheDocument()
    expect(screen.getByText(/Nu putem stabili versiunea curentă a actului/)).toBeInTheDocument()
    unmount()
    render(
      <ActDefaultNotices
        act={actListing({ versionDate: null, firstPublicationDate: '2001-03-01' })}
        shown={shown({ versionKind: 'original' })}
        notCurrentDefault={false}
        onlyReadableDefault
      />,
    )
    expect(screen.queryByText(/Data acestei versiuni nu este cunoscută/)).not.toBeInTheDocument()
  })

  it('says the date is unknown when no date is known', () => {
    render(<ActDefaultNotices act={undated} shown={shown({ versionKind: 'original' })} notCurrentDefault={false} onlyReadableDefault />)
    expect(screen.getByText(/Data acestei versiuni nu este cunoscută/)).toBeInTheDocument()
  })
})

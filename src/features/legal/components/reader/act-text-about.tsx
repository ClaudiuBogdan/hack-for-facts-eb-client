import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import type { LegalActDetail } from '@/schemas/legal'
import type { ShownVersion } from '../../lib/legal-versions'
import { ActConsolidationBanner } from '../act-consolidation-banner'
import { ActVersionSelector } from '../act-version-selector'
import { ACT_ABOUT_WARNINGS } from './act-page-grid'

type Props = {
  readonly act: LegalActDetail
  /** The version on screen. */
  readonly shown: ShownVersion
  /** Its document id, as the selector matches it against its options. */
  readonly shownDocumentId: string | null
  /** The shown text is a Portal consolidation that rendered: its LEG-X3AV notice is said. */
  readonly consolidation: boolean
  /** The act's warnings (rows), worn by the box. */
  readonly warnings?: ReactNode
  /** Where the page's grid places the box. */
  readonly className?: string
}

/**
 * What is to know about the text shown (owner, 26 November 2026, the act page's redesign): the version, the notice
 * of an unofficial consolidation, the act's warnings. From 88rem a box at the text's right, hung from the reading bar
 * like the contents' box and staying in view; narrower, the same three things in the reading column above the text.
 *
 * One element in both places, moved by the grid: what it says is in the page once at any width.
 */
export function ActTextAbout({ act, shown, shownDocumentId, consolidation, warnings, className }: Props) {
  return (
    <aside aria-label={t`Despre textul afișat`} className={cn('min-w-0 max-w-[42rem] min-[88rem]:max-w-none', className)}>
      <div
        className={cn(
          'space-y-3 pt-5',
          // The box ends above the app's floating feedback button (bottom right), and scrolls inside itself on a short screen.
          'min-[88rem]:sticky min-[88rem]:top-[3.125rem] min-[88rem]:max-h-[calc(100dvh-11.5rem)] min-[88rem]:overflow-y-auto min-[88rem]:overscroll-contain',
          'min-[88rem]:rounded-b-md min-[88rem]:border min-[88rem]:border-t-0 min-[88rem]:px-3 min-[88rem]:pb-2 min-[88rem]:pt-3 [scrollbar-width:thin]',
        )}
      >
        <ActVersionSelector act={act} shownDocumentId={shownDocumentId} shown={shown} />
        {consolidation ? <ActConsolidationBanner version={shown} /> : null}
        {warnings !== undefined ? <div className={cn(ACT_ABOUT_WARNINGS, 'empty:hidden')}>{warnings}</div> : null}
      </div>
    </aside>
  )
}

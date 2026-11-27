import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import type { LegalActStatus } from '@/schemas/legal'

type Props = {
  /**
   * Null when the server does not know the status (legal_v2 bridges it from
   * the previous corpus, which may not hold the act): no badge renders.
   */
  readonly status: LegalActStatus | null
  /**
   * On the act's own page, where the status is the first thing to know about the act: a size up and in full
   * contrast (owner, 26 November 2026). Lists keep the quiet mark.
   */
  readonly strong?: boolean
  /** The mark alone, its word hidden for the eye and given on hover. */
  readonly markOnly?: boolean
  /** With `markOnly`: classes for the hidden word, to show it where the mark alone would not do (a highlighted row). */
  readonly wordClassName?: string
  readonly className?: string
}

/**
 * How much of the act is in force, as a shape: a full disc is in force, a disc in a ring is in force and
 * amended, a half disc is partly repealed, an empty ring is not in force, a dashed ring is not known.
 */
type Shape = 'full' | 'amended' | 'half' | 'ring' | 'dashed'

/** The shape and its colour, from the site's status tokens: green in force, amber in part, red repealed, grey for the rest. */
const MARK: Record<LegalActStatus, { readonly shape: Shape; readonly tone: string }> = {
  'in-vigoare': { shape: 'full', tone: 'text-status-live-fg' },
  modificat: { shape: 'amended', tone: 'text-status-live-fg' },
  'abrogat-partial': { shape: 'half', tone: 'text-status-partial-fg' },
  suspendat: { shape: 'ring', tone: 'text-status-partial-fg' },
  abrogat: { shape: 'ring', tone: 'text-status-blocked-fg' },
  'iesit-din-vigoare': { shape: 'ring', tone: 'text-muted-foreground' },
  necunoscut: { shape: 'dashed', tone: 'text-muted-foreground' },
}

function StatusShape({ shape, className }: { readonly shape: Shape; readonly className?: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={cn('size-2.5 shrink-0', className)}>
      {shape === 'full' ? <circle cx="6" cy="6" r="5" fill="currentColor" /> : null}
      {shape === 'amended' ? (
        <>
          <circle cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="6" cy="6" r="2.25" fill="currentColor" />
        </>
      ) : null}
      {shape === 'half' ? (
        <>
          <circle cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 1.25a4.75 4.75 0 0 0 0 9.5z" fill="currentColor" />
        </>
      ) : null}
      {shape === 'ring' ? <circle cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" /> : null}
      {shape === 'dashed' ? <circle cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.2 2.2" /> : null}
    </svg>
  )
}

/**
 * An act's status: a small shape and the status's name in plain text (owner, 26 November 2026: the tinted badge's
 * colours did not sit with the pages). Colour is only in the shape; the name is always written, so nothing is
 * said by colour alone. Prototyped in `development/legal/search`, variant `registru`.
 */
/** The status in words, in the reader's language. */
function statusWord(status: LegalActStatus): string {
  switch (status) {
    case 'in-vigoare':
      return t`În vigoare`
    case 'modificat':
      return t`Modificat`
    case 'abrogat':
      return t`Abrogat`
    case 'abrogat-partial':
      return t`Abrogat parțial`
    case 'suspendat':
      return t`Suspendat`
    case 'iesit-din-vigoare':
      return t`Ieșit din vigoare`
    case 'necunoscut':
      return t`Necunoscut`
  }
}

export function LegalStatusBadge({ status, strong = false, markOnly = false, wordClassName, className }: Props) {
  if (status === null) return null
  const mark = MARK[status]
  const word = statusWord(status)

  // The mark alone, where a row must stay one line (the search's rows, owner 27 November 2026): its word is still
  // there, hidden for the eye and on hover, so the status is never said by colour and shape only.
  if (markOnly) {
    return (
      <span title={word} className={cn('inline-flex shrink-0 items-center', className)}>
        <StatusShape shape={mark.shape} className={mark.tone} />
        <span className={cn('sr-only', wordClassName)}>{word}</span>
      </span>
    )
  }

  return (
    <span className={cn('inline-flex shrink-0 items-center whitespace-nowrap', strong ? 'gap-2 text-base font-semibold text-foreground' : 'gap-1.5 text-sm text-foreground/80', className)}>
      <StatusShape shape={mark.shape} className={cn(mark.tone, strong && 'size-3')} />
      {word}
    </span>
  )
}

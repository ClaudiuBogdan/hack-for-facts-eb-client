import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { dayText } from '../../lib/home-format'
import { lastDayOf } from '../../lib/profile-period'

/** The read of the year the page asks for, once it has landed. */
interface ShownRead {
  readonly year: number
  readonly latest: number
  readonly through: string | null
}

/**
 * How recent the page's year is: „Date actualizate până la 31 mai 2026" for
 * the year in progress read through SEAP's cutoff (derived from the API,
 * never written in the code), „An în curs: date incomplete" when no cutoff
 * reaches it; nothing for a complete year, or before the year's read lands.
 */
function freshText(read: ShownRead | null): string | null {
  if (!read) return null
  if (read.through) return t`Date actualizate până la ${dayText(lastDayOf(read.through))} ${read.through.slice(0, 4)}`
  return read.year > read.latest ? t`An în curs: date incomplete` : null
}

/**
 * A procurement profile's head, top row (a buyer's, a firm's): the way back
 * on the left; at the right end the year — above the chart on a wide screen,
 * beside the way back on a phone — and, for the year in progress, how recent
 * its data is (on a phone, on a line of its own below).
 */
export function ProfileTopRow({ kicker, read, children }: { readonly kicker: ReactNode; readonly read: ShownRead | null; readonly children: ReactNode }) {
  const fresh = freshText(read)
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        {kicker}
        <div className="flex items-center gap-4">
          {fresh ? <span className="hidden text-xs text-muted-foreground sm:inline">{fresh}</span> : null}
          {children}
        </div>
      </div>
      {fresh ? <p className="mt-2 text-right text-xs text-muted-foreground sm:hidden">{fresh}</p> : null}
    </>
  )
}

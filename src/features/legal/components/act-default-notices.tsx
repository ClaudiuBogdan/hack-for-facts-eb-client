import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import type { LegalActDetail } from '@/schemas/legal'
import { formatLegalDate } from '../lib/legal-format'
import {
  isConsolidationVersion,
  isSelectableVersion,
  latestUnavailableVersion,
  listedVersionDate,
  versionKindLabel,
  type ShownVersion,
} from '../lib/legal-versions'

/** A notice about the text shown: a rule in the caution colour, the sentence in full weight, no box. */
const NOTICE = 'border-l-2 border-status-partial-fg py-0.5 pl-4'

type Props = {
  readonly act: LegalActDetail
  /** The version whose text is on screen. */
  readonly shown: ShownVersion | null
  /** True when the shown text is the act's default but NOT its current version. */
  readonly notCurrentDefault: boolean
  /**
   * True when the shown text is the default only because it is the readable
   * version the list holds — the server names no default (date unknown).
   */
  readonly onlyReadableDefault?: boolean
}

/**
 * What the reader must say about the DEFAULT text before showing it
 * (legal_v2, owner policy `latest_any_kind`):
 *
 *  - the latest form has no text yet, so the page shows the latest form that
 *    has one — which is NOT the current version, said in plain words, with
 *    the latest form's kind and date when the list names it;
 *  - same-day versions were ordered by the fixed tie rule rather than by a
 *    reviewer (`defaultOrderReviewed: false`) — a quiet note.
 */
export function ActDefaultNotices({
  act,
  shown,
  notCurrentDefault,
  onlyReadableDefault = false,
}: Props) {
  const { i18n } = useLingui()
  const date = (value: string | null) => (value === null ? null : formatLegalDate(value, i18n.locale))
  const latest = latestUnavailableVersion(act)
  const latestKind = latest !== null ? versionKindLabel(latest.versionKind) : null
  // A consolidation is dated by the Portal's own note's date, never by the
  // list's ordering date (LEG-X3AV); without one the sentence names no date.
  const latestDate = latest !== null ? date(listedVersionDate(latest)) : null
  const shownKind = shown !== null ? versionKindLabel(shown.versionKind) : null
  const shownDate =
    shown === null ? null : date(isConsolidationVersion(shown) ? shown.portalLabelDate : shown.versionDate)
  const readableCount = act.documents.filter(isSelectableVersion).length

  return (
    <>
      {notCurrentDefault && (
        <div className={NOTICE} role="note">
          <p className="text-sm font-medium leading-6 text-foreground">
            {latestKind !== null && latestDate !== null ? (
              <Trans>
                Cea mai recentă versiune a actului ({latestKind}, {latestDate}) nu are
                încă text disponibil.
              </Trans>
            ) : (
              <Trans>Cea mai recentă versiune a actului nu are încă text disponibil.</Trans>
            )}{' '}
            {shownKind !== null && shownDate !== null ? (
              <Trans>
                Afișăm versiunea din {shownDate} ({shownKind}), care nu este versiunea
                curentă.
              </Trans>
            ) : (
              <Trans>
                Afișăm cea mai recentă versiune cu text, care nu este versiunea curentă.
              </Trans>
            )}
          </p>
        </div>
      )}
      {onlyReadableDefault && (
        <div className={NOTICE} role="note">
          <p className="text-sm font-medium leading-6 text-foreground">
            {shown === null || shown.versionDate === null ? (
              readableCount > 1 ? (
                <Trans>
                  Data acestei versiuni nu este cunoscută, deci nu o putem ordona față de
                  celelalte versiuni. Afișăm una dintre versiunile cu text; celelalte se pot
                  alege din listă.
                </Trans>
              ) : (
                <Trans>
                  Data acestei versiuni nu este cunoscută, deci nu o putem ordona față de
                  celelalte versiuni. Afișăm singurul text disponibil.
                </Trans>
              )
            ) : (
              <Trans>
                Nu putem stabili versiunea curentă a actului. Afișăm un text disponibil,
                care poate să nu fie versiunea curentă.
              </Trans>
            )}
          </p>
        </div>
      )}
      {act.defaultOrderReviewed === false && (
        <p className="text-xs leading-5 text-muted-foreground">
          <Trans>
            Versiunile cu aceeași dată au fost ordonate după o regulă fixă, nu de un
            verificator.
          </Trans>
        </p>
      )}
    </>
  )
}

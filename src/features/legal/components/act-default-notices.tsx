import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import type { LegalActDetail } from '@/schemas/legal'
import { formatLegalDate } from '../lib/legal-format'
import {
  latestUnavailableVersion,
  versionDateOf,
  versionKindLabel,
  type ShownVersion,
} from '../lib/legal-versions'
import { legislationAlertClassName } from '../lib/legislation-theme'

type Props = {
  readonly act: LegalActDetail
  /** The version whose text is on screen. */
  readonly shown: ShownVersion | null
  /** True when the shown text is the act's default but NOT its current version. */
  readonly notCurrentDefault: boolean
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
export function ActDefaultNotices({ act, shown, notCurrentDefault }: Props) {
  const { i18n } = useLingui()
  const date = (value: string | null) => (value === null ? null : formatLegalDate(value, i18n.locale))
  const latest = latestUnavailableVersion(act)
  const latestKind = latest !== null ? versionKindLabel(latest.versionKind) : null
  const latestDate = latest !== null ? date(versionDateOf(latest)) : null
  const shownKind = shown !== null ? versionKindLabel(shown.versionKind) : null
  const shownDate = shown !== null ? date(shown.versionDate) : null

  return (
    <>
      {notCurrentDefault && (
        <div className={`${legislationAlertClassName} mb-4`} role="note">
          <p className="text-sm font-medium leading-6 text-[var(--pnrr-fg)]">
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
      {act.defaultOrderReviewed === false && (
        <p className="mb-4 text-xs text-[var(--pnrr-muted)]">
          <Trans>
            Versiunile cu aceeași dată au fost ordonate după o regulă fixă, nu de un
            verificator.
          </Trans>
        </p>
      )}
    </>
  )
}

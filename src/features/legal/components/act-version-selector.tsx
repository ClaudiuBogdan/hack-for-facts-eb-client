import { useNavigate } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { LegalActDetail, LegalActDocumentVersion } from '@/schemas/legal'
import { formatLegalDate } from '../lib/legal-format'
import {
  isSelectableVersion,
  orderVersionsNewestFirst,
  versionDateOf,
  versionKindLabel,
} from '../lib/legal-versions'

type Props = {
  readonly act: LegalActDetail
  /** The document id whose text is on screen (a form id on legal_v2). */
  readonly shownDocumentId: string | null
}

/** Same 2px near-black control language as the directory's selects. */
const controlClassName =
  'h-10 min-w-0 max-w-full rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-sm text-[var(--pnrr-fg)] shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'

/**
 * The version selector above the text (design
 * `docs/design/legal/features/version-cluster-consolidation.md`, without the
 * compare sheet).
 *
 * Lists the READABLE versions only — a header stub is never a reading target,
 * and a version without a text says so in the versions band instead of
 * offering a dead choice. The default version (`isCanonical`) is marked;
 * choosing it clears `?doc=`, any other sets it. One readable version is a
 * static label, not an empty dropdown.
 */
export function ActVersionSelector({ act, shownDocumentId }: Props) {
  const { i18n } = useLingui()
  const navigate = useNavigate()
  const options = orderVersionsNewestFirst(act.documents.filter(isSelectableVersion))
  if (options.length === 0) return null

  const label = (doc: LegalActDocumentVersion) => {
    const date = versionDateOf(doc)
    const parts = [versionKindLabel(doc.versionKind)]
    if (date !== null) parts.push(formatLegalDate(date, i18n.locale))
    const text = parts.join(' · ')
    return doc.isCanonical ? t`${text} (implicită)` : text
  }

  const only = options.length === 1 ? options[0] : undefined
  if (only !== undefined) {
    return (
      <p className="mb-4 text-sm text-[var(--pnrr-muted)]">
        <Trans>Versiunea afișată: {label(only)}</Trans>
      </p>
    )
  }

  // A shown text that is not one of the options (e.g. resolving an old page
  // id) leaves the control on its placeholder rather than on a wrong row.
  const value = options.some((doc) => doc.documentId === shownDocumentId)
    ? (shownDocumentId ?? '')
    : ''

  return (
    <label className="mb-4 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="text-sm font-semibold text-[var(--pnrr-fg)]">
        <Trans>Versiunea textului</Trans>
      </span>
      <select
        className={controlClassName}
        value={value}
        onChange={(event) => {
          const chosen = options.find((doc) => doc.documentId === event.target.value)
          if (chosen === undefined) return
          void navigate({
            to: '.',
            // A new text drops the old `?nod=`: its path belongs to the
            // previous text's outline.
            search: chosen.isCanonical ? {} : { doc: chosen.documentId },
            hash: 'act-text',
            replace: true,
            resetScroll: false,
          })
        }}
      >
        {value === '' && <option value="">{t`alege o versiune`}</option>}
        {options.map((doc) => (
          <option key={doc.documentId} value={doc.documentId}>
            {label(doc)}
          </option>
        ))}
      </select>
    </label>
  )
}

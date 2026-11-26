import { useNavigate } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ChevronDown } from 'lucide-react'
import type { LegalActDetail, LegalActDocumentVersion } from '@/schemas/legal'
import { formatLegalDate } from '../lib/legal-format'
import {
  defaultReadingOf,
  isSelectableVersion,
  latestUnavailableVersion,
  listedVersionDate,
  orderVersionsNewestFirst,
  shownVersionDate,
  versionKindLabel,
  versionName,
  type ShownVersion,
} from '../lib/legal-versions'

type Props = {
  readonly act: LegalActDetail
  /** The document id whose text is on screen (a form id on legal_v2). */
  readonly shownDocumentId: string | null
  /** The version on screen, with what the render says it served laid over it: what the control names. */
  readonly shown: ShownVersion
}

/**
 * The version selector (design `docs/design/legal/features/version-cluster-consolidation.md`, without the compare
 * sheet), in the box about the text shown (owner, 26 November 2026, the act page's redesign).
 *
 * Lists the READABLE versions only — a header stub is never a reading target, and a version without a text says so
 * in the versions band instead of offering a dead choice. The default version (`isCanonical`) is marked; choosing
 * it clears `?doc=`, any other sets it. One readable version is a static label, not an empty dropdown; none names
 * the version shown, as a static label too.
 *
 * The control is the browser's own select over a face that names the shown version whole: in the box at the right
 * in two lines (the date, then the kind), in the reading column in one line that wraps. Nothing is cut.
 */
export function ActVersionSelector({ act, shownDocumentId, shown }: Props) {
  const { i18n } = useLingui()
  const navigate = useNavigate()
  const options = orderVersionsNewestFirst(act.documents.filter(isSelectableVersion))
  // No version to choose (the shown one is not a listed, readable version):
  // the box still names the version on screen, never stands empty.
  if (options.length === 0) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        {t`Versiunea afișată: ${versionName(shown.versionKind, shownVersionDate(act, shown), i18n.locale)}`}
      </p>
    )
  }

  // The default reading: the current form, or — legal_v2
  // `latest_not_available` — the latest form with text, which is NOT current.
  const defaultReading = defaultReadingOf(act)
  // The latest form, when it has no text: listed so the reader sees it
  // exists, never selectable.
  const latestUnavailable = latestUnavailableVersion(act)

  const baseLabel = (doc: LegalActDocumentVersion) => {
    const date = listedVersionDate(doc)
    const parts = [versionKindLabel(doc.versionKind)]
    if (date !== null) parts.push(formatLegalDate(date, i18n.locale))
    return parts.join(' · ')
  }
  const label = (doc: LegalActDocumentVersion) => {
    const text = baseLabel(doc)
    if (doc.documentId !== defaultReading.documentId) return text
    if (defaultReading.basis === 'canonical') return t`${text} (implicită)`
    if (defaultReading.basis === 'latest_available') return t`${text} (afișată implicit, nu e curentă)`
    return t`${text} (afișată implicit)`
  }

  const only = options.length === 1 && latestUnavailable === null ? options[0] : undefined
  if (only !== undefined) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        <Trans>Versiunea afișată: {label(only)}</Trans>
      </p>
    )
  }

  // A shown text that is not one of the options (e.g. resolving an old page
  // id) leaves the control on its placeholder rather than on a wrong row.
  const value = options.some((doc) => doc.documentId === shownDocumentId)
    ? (shownDocumentId ?? '')
    : ''
  const date = shownVersionDate(act, shown)

  return (
    <div className="flex flex-col gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 min-[88rem]:flex-col min-[88rem]:items-stretch">
      {/* From 88rem the reading bar says it, over the box. */}
      <span aria-hidden className="text-muted-foreground min-[88rem]:hidden">
        <Trans>Versiunea textului</Trans>
      </span>
      <span className="relative flex min-h-11 w-full min-w-0 max-w-full items-center gap-2 rounded-md border border-input bg-background py-1.5 pl-3 pr-2.5 text-left font-medium leading-5 has-[select:focus-visible]:ring-1 has-[select:focus-visible]:ring-ring sm:min-h-10 sm:w-auto min-[88rem]:w-full">
        {value === '' ? (
          <span className="min-w-0 flex-1 font-normal text-muted-foreground">{t`alege o versiune`}</span>
        ) : (
          <span className="min-w-0 flex-1">
            <span className="min-[88rem]:hidden">{versionName(shown.versionKind, date, i18n.locale)}</span>
            {/* In the box: the date the version is named by, then what kind of version it is. */}
            {date !== null ? <span className="hidden min-[88rem]:block">{formatLegalDate(date, i18n.locale)}</span> : null}
            <span className={date !== null ? 'hidden text-xs font-normal text-muted-foreground min-[88rem]:block' : 'hidden min-[88rem]:block'}>
              {versionKindLabel(shown.versionKind)}
            </span>
          </span>
        )}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        {/* 16 px, unseen: a smaller field makes iOS zoom the page when it takes the focus. */}
        <select
          aria-label={t`Versiunea textului`}
          className="absolute inset-0 size-full cursor-pointer appearance-none text-base opacity-0"
          value={value}
          onChange={(event) => {
            const chosen = options.find((doc) => doc.documentId === event.target.value)
            if (chosen === undefined) return
            void navigate({
              to: '.',
              // A new text drops the old `?nod=`: its path belongs to the
              // previous text's outline.
              search:
                chosen.documentId === defaultReading.documentId ? {} : { doc: chosen.documentId },
              hash: 'act-text',
              replace: true,
              resetScroll: false,
            })
          }}
        >
          {value === '' && <option value="">{t`alege o versiune`}</option>}
          {latestUnavailable !== null && (
            <option value={latestUnavailable.documentId} disabled>
              {t`${baseLabel(latestUnavailable)} — text indisponibil`}
            </option>
          )}
          {options.map((doc) => (
            <option key={doc.documentId} value={doc.documentId}>
              {label(doc)}
            </option>
          ))}
        </select>
      </span>
    </div>
  )
}

import {
  LEGAL_UNOFFICIAL_CONSOLIDATION_CAVEAT,
  type LegalActDetail,
  type LegalActDocumentVersion,
  type LegalDocument,
} from '@/schemas/legal'
import type { LegalServedForm } from './tldf/schemas'

/**
 * Version facts shared by the versions band, the version selector and the
 * reader. A `documentId` is OPAQUE: a numeric Portal page id on the legacy
 * source, `f<form_id>` on legal_v2. Nothing here parses it.
 */

/** A document expression, from the version list or the canonical slot. */
type VersionLike = Pick<
  LegalActDocumentVersion,
  'versionKind' | 'caveat' | 'portalLabelRaw' | 'portalLabelDate'
>

const VERSION_KIND_LABEL: Record<string, string> = {
  original: 'forma publicată',
  corp: 'corpul actului',
  republicare: 'republicare',
  'stub-header': 'antetul actului',
  consolidare: 'formă consolidată neoficială',
}

/** The Romanian label of a version kind; an unknown kind shows as served. */
export function versionKindLabel(kind: string): string {
  return VERSION_KIND_LABEL[kind] ?? kind
}

/**
 * A consolidation — the Portal's unofficial, informative text (LEG-X3AV).
 * legal_v2 marks every one with the caveat; the kind alone also counts, so a
 * consolidation is never shown unlabelled because a field came back null.
 */
export function isConsolidationVersion(doc: VersionLike): boolean {
  return (
    doc.caveat === LEGAL_UNOFFICIAL_CONSOLIDATION_CAVEAT ||
    doc.versionKind === 'consolidare'
  )
}

/**
 * The text of this expression can be read here: its render is served, and on
 * legal_v2 the form is readable (`readable` is null on the legacy source).
 */
export function isReadableVersion(doc: LegalActDocumentVersion): boolean {
  return doc.render?.renderStatus === 'served' && doc.readable !== false
}

/**
 * A reading target for the version selector: readable, and not a header
 * stub (header-only, never a reading target — design
 * `version-cluster-consolidation.md`).
 */
export function isSelectableVersion(doc: LegalActDocumentVersion): boolean {
  return isReadableVersion(doc) && doc.versionKind !== 'stub-header'
}

/** The date a version is listed by: its version date, else its first publication. */
export function versionDateOf(doc: LegalActDocumentVersion): string | null {
  return doc.versionDate ?? doc.firstPublicationDate
}

/** Newest first; undated rows sink to the end rather than faking an epoch. */
export function orderVersionsNewestFirst(
  documents: readonly LegalActDocumentVersion[],
): LegalActDocumentVersion[] {
  return [...documents].sort((a, b) => {
    const aDate = versionDateOf(a)
    const bDate = versionDateOf(b)
    if (aDate === null && bDate === null) return 0
    if (aDate === null) return 1
    if (bDate === null) return -1
    return bDate.localeCompare(aDate)
  })
}

/** An old numeric Portal page id, as shipped `?doc=` links carry. */
export function isPortalPageId(documentId: string): boolean {
  return /^[1-9]\d*$/.test(documentId)
}

/**
 * How a `?doc=` value resolves against this act's versions:
 *
 *  - `own` — one of `act.documents`;
 *  - `probe` — an old page id on legal_v2: the server resolves it
 *    (`LegalAct.resolveDocument`, act-scoped), and the reader accepts the
 *    answer only if the form it names is one of this act's versions;
 *  - `foreign` — not this act's; refused (I-17).
 */
export type DocOverrideResolution =
  | { readonly kind: 'own'; readonly documentId: string }
  | { readonly kind: 'probe'; readonly documentId: string }
  | { readonly kind: 'foreign' }

export function resolveDocOverride(
  act: Pick<LegalActDetail, 'documents' | 'dataSource'>,
  docOverride: string,
): DocOverrideResolution {
  if (act.documents.some((doc) => doc.documentId === docOverride)) {
    return { kind: 'own', documentId: docOverride }
  }
  if (act.dataSource !== 'legal_v2' || !isPortalPageId(docOverride)) {
    return { kind: 'foreign' }
  }
  // The SERVER resolves an old page id (its route preference and binding
  // status decide which form a page shows — a client guess from the forms'
  // `sourceUrl` can pick another version). The answer is kept only when the
  // form it names is this act's.
  return { kind: 'probe', documentId: docOverride }
}

/** A version's facts the reader needs, from the list or the canonical slot. */
export type ShownVersion = Pick<
  LegalDocument,
  | 'documentId'
  | 'versionKind'
  | 'versionDate'
  | 'caveat'
  | 'portalLabelRaw'
  | 'portalLabelDate'
  | 'sourceUrl'
>

/** The version a document id names on this act, from its list or its canonical. */
export function findVersion(
  act: Pick<LegalActDetail, 'documents' | 'canonical'>,
  documentId: string | null,
): ShownVersion | null {
  if (documentId === null) return null
  const listed = act.documents.find((doc) => doc.documentId === documentId)
  if (listed !== undefined) return listed
  return act.canonical?.documentId === documentId ? act.canonical : null
}

/**
 * The Portal's own consolidation note for the banner's quote: the label as
 * written, with its date appended unless the label already carries that
 * year; "consolidarea din {date}" when only the date is filled; null when
 * neither is — the banner then drops the quoted sentence rather than quote
 * an empty note. The version date (`portal_order_date`) is never substituted:
 * it orders the Portal's list, it is not the Portal's note.
 */
export function portalConsolidationNote(
  doc: VersionLike,
  formatDate: (isoDate: string) => string,
): string | null {
  const raw = doc.portalLabelRaw?.trim() ?? ''
  const date = doc.portalLabelDate
  if (raw.length > 0) {
    if (date === null || raw.includes(date.slice(0, 4))) return raw
    return `${raw} ${formatDate(date)}`
  }
  return date === null ? null : `consolidarea din ${formatDate(date)}`
}

/**
 * The shown version with the render's `servedForm` laid over it: the REST
 * meta names the form whose text was actually served (legal_v2), so its
 * kind, caveat, label and source win; the version list fills the rest. With
 * no `servedForm` (legacy, mock) the listed version stands as it is.
 */
export function withServedForm(
  listed: ShownVersion | null,
  served: LegalServedForm | null,
): ShownVersion | null {
  if (served === null) return listed
  const documentId = served.documentId ?? listed?.documentId
  if (documentId === undefined) return listed
  return {
    documentId,
    versionKind: served.versionKind ?? listed?.versionKind ?? '',
    versionDate: served.versionDate ?? listed?.versionDate ?? null,
    caveat: served.caveat !== undefined ? served.caveat : (listed?.caveat ?? null),
    portalLabelRaw:
      served.portalLabelRaw !== undefined ? served.portalLabelRaw : (listed?.portalLabelRaw ?? null),
    portalLabelDate:
      served.portalLabelDate !== undefined
        ? served.portalLabelDate
        : (listed?.portalLabelDate ?? null),
    sourceUrl: served.sourceUrl ?? listed?.sourceUrl ?? null,
  }
}

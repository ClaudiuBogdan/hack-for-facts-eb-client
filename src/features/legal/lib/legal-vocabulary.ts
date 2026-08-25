import { t } from '@lingui/core/macro'

/**
 * Label maps for the raw slugs the server returns.
 *
 * These are **open vocabularies, not enums** — measured on production
 * 2026-08-01: 256 distinct `act_type` values and **6.005 distinct
 * `issuer_slug` values**, the latter with near-duplicates that were never
 * reconciled upstream (`guvernul` · `guvernul-romaniei` · `guvern` ·
 * `guvernul-prim-ministrul`).
 *
 * So each map covers the head and every miss falls through to
 * `prettifySlug`, which renders the source's own spelling rather than dropping
 * the value or showing a raw slug. Translating the head is worth it (top 22 act
 * types = 96,5% of acts; top 12 issuers = 63,6%); translating the tail is not
 * possible and pretending otherwise would just rot.
 *
 * The audience and domain vocabularies ARE closed and AI-derived — every
 * surface that renders them says so.
 */

/** Words that stay lowercase inside a Romanian institution name. */
const MINOR_WORDS = new Set([
  'a',
  'al',
  'ale',
  'de',
  'din',
  'in',
  'la',
  'pe',
  'pentru',
  'si',
  'privind',
  'pt',
])

/**
 * Turn an unmapped slug into something readable.
 *
 * The slugs carry no diacritics, so "ministerul-sanatatii" becomes "Ministerul
 * Sanatatii" and not "Ministerul Sănătății". That is the source's spelling, and
 * guessing diacritics back would be inventing data.
 */
export function prettifySlug(slug: string): string {
  const words = slug.split(/[-_]/).filter((word) => word.length > 0)
  if (words.length === 0) return slug

  return words
    .map((word, index) =>
      index > 0 && MINOR_WORDS.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')
}

/** `document_summaries.affected_audiences` — a closed, AI-derived vocabulary. */
export function legalAudienceLabel(slug: string): string {
  switch (slug) {
    case 'cetateni':
      return t`cetățeni`
    case 'firme':
      return t`firme`
    case 'institutii-publice':
      return t`instituții publice`
    case 'ong':
      return t`ONG-uri`
    case 'autoritati-locale':
      return t`autorități locale`
    case 'profesii-reglementate':
      return t`profesii reglementate`
    case 'angajati':
      return t`angajați`
    case 'studenti':
      return t`studenți`
    case 'pensionari':
      return t`pensionari`
    default:
      return slug.replace(/-/g, ' ')
  }
}

/** `legal.acts.status` — the closed 7-value fold vocabulary, human-readable. */
export function legalStatusLabel(status: string): string {
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
      return t`Statut necunoscut`
    default:
      return status
  }
}

/**
 * `legal.acts.act_type` — the issuing instrument.
 *
 * Covers the 22 most common values (96,5% of the corpus). `unknown` is a real
 * stored value on 1.985 acts and must not render as the English word.
 */
export function legalActTypeLabel(slug: string): string {
  switch (slug) {
    case 'lege':
      return t`Lege`
    case 'hotarare':
      return t`Hotărâre`
    case 'ordin':
      return t`Ordin`
    case 'decizie':
      return t`Decizie`
    case 'decret':
      return t`Decret`
    case 'oug':
      return t`Ordonanță de urgență`
    case 'og':
      return t`Ordonanță`
    case 'raport':
      return t`Raport`
    case 'norma':
      return t`Normă`
    case 'regulament':
      return t`Regulament`
    case 'rectificare':
      return t`Rectificare`
    case 'metodologie':
      return t`Metodologie`
    case 'comunicat':
      return t`Comunicat`
    case 'procedura':
      return t`Procedură`
    case 'acord':
      return t`Acord`
    case 'circulara':
      return t`Circulară`
    case 'instructiuni':
      return t`Instrucțiuni`
    case 'anexa':
      return t`Anexă`
    case 'anexe':
      return t`Anexe`
    case 'protocol':
      return t`Protocol`
    case 'ghid':
      return t`Ghid`
    case 'unknown':
      return t`Act normativ`
    default:
      return prettifySlug(slug)
  }
}

/**
 * `legal.acts.issuer_slug` — who issued it.
 *
 * Only the head is mapped; the tail (5.993 further values) is prettified. The
 * near-duplicate government slugs are folded onto one label deliberately —
 * they are the same institution spelled four ways upstream, and showing the
 * variance would be reporting a data defect as if it were a fact about the act.
 */
export function legalIssuerLabel(slug: string): string {
  switch (slug) {
    case 'guvernul':
    case 'guvernul-romaniei':
    case 'guvern':
      return t`Guvernul României`
    case 'guvernul-primul-ministru':
    case 'guvernul-prim-ministrul':
    case 'prim-ministrul':
      return t`Prim-ministrul`
    case 'presedintele-romaniei':
    case 'presedintele':
      return t`Președintele României`
    case 'parlamentul':
    case 'parlamentul-romaniei':
      return t`Parlamentul României`
    case 'curtea-constitutionala':
      return t`Curtea Constituțională`
    case 'inalta-curte':
    case 'inalta-curte-de-casatie-si-justitie':
      return t`Înalta Curte de Casație și Justiție`
    case 'ministerul-justitiei':
      return t`Ministerul Justiției`
    case 'ministerul-transporturilor':
      return t`Ministerul Transporturilor`
    case 'senatul':
      return t`Senatul`
    case 'camera-deputatilor':
      return t`Camera Deputaților`
    case 'banca-nationala-a-romaniei':
      return t`Banca Națională a României`
    case 'autoritatea-electorala-permanenta':
      return t`Autoritatea Electorală Permanentă`
    case 'ministerul-sanatatii':
      return t`Ministerul Sănătății`
    case 'ministerul-educatiei':
      return t`Ministerul Educației`
    case 'ministerul-finantelor-publice':
      return t`Ministerul Finanțelor Publice`
    case 'act-international':
      return t`Act internațional`
    default:
      return prettifySlug(slug)
  }
}

/**
 * `act_references.relation` — what one act does to another.
 *
 * Rendered from the acting act's point of view, so the same edge reads
 * correctly in both directions of the graph.
 */
export function legalRelationLabel(relation: string): string {
  switch (relation) {
    case 'MODIFICA':
      return t`modifică`
    case 'ABROGA':
      return t`abrogă`
    case 'COMPLETEAZA':
      return t`completează`
    case 'SUSPENDA':
      return t`suspendă`
    case 'APROBA':
      return t`aprobă`
    case 'RECTIFICA':
      return t`rectifică`
    case 'RESPINGE':
      return t`respinge`
    case 'FACE_REFERIRE':
      return t`face referire la`
    default:
      return relation.toLowerCase().replace(/_/g, ' ')
  }
}

/**
 * Monitorul Oficial part codes — the server's `MoPartCode` enum. `PIM` is the
 * Hungarian-language edition of Partea I (a real code: 113 issues in 2010),
 * not a typo of `PI`.
 */
export function legalGazettePartLabel(partCode: string): string {
  switch (partCode) {
    case 'PI':
      return t`Partea I`
    case 'PIM':
      return t`Partea I (maghiară)`
    case 'PII':
      return t`Partea a II-a`
    case 'PIII':
      return t`Partea a III-a`
    case 'PIV':
      return t`Partea a IV-a`
    case 'PV':
      return t`Partea a V-a`
    case 'PVI':
      return t`Partea a VI-a`
    case 'PVII':
      return t`Partea a VII-a`
    default:
      return partCode
  }
}

/** `document_nodes.node_kind` — the structural role of a node. */
export function legalNodeKindLabel(kind: string): string {
  switch (kind) {
    case 'articol':
      return t`articol`
    case 'preambul':
      return t`preambul`
    case 'capitol':
      return t`capitol`
    case 'titlu':
      return t`titlu`
    case 'sectiune':
      return t`secțiune`
    case 'anexa':
      return t`anexă`
    case 'paragraf':
      return t`paragraf`
    default:
      return kind.replace(/-/g, ' ')
  }
}

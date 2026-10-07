import { plural, t } from '@lingui/core/macro'
import type { JudicialCourtLevel, JudicialPartyKind } from '@/schemas/judicial'
import type { CodeAlias } from './case-model'
import { COURT_NAMES } from './court-names.generated'
import type { StageKey } from './judicial-model'

/**
 * Readable labels for the judicial API's codes. The API names courts by their
 * Portal Just institution code and matters (`category`) by a squashed code
 * (`Contenciosadministrativsifiscal`) — or, for ICCJ cases, by the source's
 * own label with cedilla diacritics. Both spellings of a matter read the same.
 */

/** A court's readable name; an unknown code (a court added after the names were generated) shows as itself. */
export function courtName(institutionCode: string): string {
  return COURT_NAMES[institutionCode] ?? institutionCode
}

export function courtLevelLabel(level: JudicialCourtLevel): string {
  switch (level) {
    case 'judecatorie':
      return t`Judecătorie`
    case 'tribunal':
      return t`Tribunal`
    case 'tribunal_militar':
      return t`Tribunal militar`
    case 'curte_de_apel':
      return t`Curte de apel`
    case 'curte_militara_apel':
      return t`Curtea Militară de Apel`
    case 'inalta_curte':
      return t`Înalta Curte de Casație și Justiție`
  }
}

const squash = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')

function categoryLabels(): Readonly<Record<string, string>> {
  return {
    civil: t`Civil`,
    penal: t`Penal`,
    litigiicuprofesionistii: t`Litigii cu profesioniștii`,
    contenciosadministrativsifiscal: t`Contencios administrativ și fiscal`,
    minorisifamilie: t`Minori și familie`,
    asigurarisociale: t`Asigurări sociale`,
    litigiidemunca: t`Litigii de muncă`,
    faliment: t`Faliment`,
    proprietateintelectuala: t`Proprietate intelectuală`,
    insolventapersoaneifizice: t`Insolvența persoanei fizice`,
    dreptmaritimsifluvial: t`Drept maritim și fluvial`,
    altematerii: t`Alte materii`,
  }
}

/** A case's matter; null stays null, and a matter the labels do not know shows as the API spells it. */
export function caseCategoryLabel(category: string | null): string | null {
  if (category === null) return null
  return categoryLabels()[squash(category)] ?? category
}

/** The levels as a reader names a group of them („Judecătorii"), for the controls that pick one. */
export function courtLevelPlural(level: 'judecatorie' | 'tribunal' | 'curte_de_apel'): string {
  switch (level) {
    case 'judecatorie':
      return t`Judecătorii`
    case 'tribunal':
      return t`Tribunale`
    case 'curte_de_apel':
      return t`Curți de apel`
  }
}

/** The levels in the genitive, as a sentence owns their cases („dosarele tribunalelor"). */
export function courtLevelGenitive(level: 'judecatorie' | 'tribunal' | 'curte_de_apel'): string {
  switch (level) {
    case 'judecatorie':
      return t`judecătoriilor`
    case 'tribunal':
      return t`tribunalelor`
    case 'curte_de_apel':
      return t`curților de apel`
  }
}

/** A party's role as the court lists it; a role the labels do not know shows as the API spells it. */
export function partyRoleLabel(role: string | null): string {
  switch (role) {
    case null:
      return t`Fără rol în sursă`
    case 'reclamant':
      return t`Reclamant`
    case 'parat':
      return t`Pârât`
    case 'intimat':
      return t`Intimat`
    case 'apelant':
      return t`Apelant`
    case 'petent':
      return t`Petent`
    case 'inculpat':
      return t`Inculpat`
    case 'recurent':
      return t`Recurent`
    case 'parte':
      return t`Parte`
    case 'contestator':
      return t`Contestator`
    case 'creditor':
      return t`Creditor`
    case 'debitor':
      return t`Debitor`
    case 'intervenient':
      return t`Intervenient`
    case 'other':
      return t`Alt rol`
    default:
      return role.charAt(0).toUpperCase() + role.slice(1)
  }
}

/** A count of parties of one kind, in words: „2 persoane fizice", „1 firmă". Never a name. */
export function partyKindCount(kind: JudicialPartyKind, count: number): string {
  switch (kind) {
    case 'public_entity':
      return plural(count, { one: '# instituție publică', few: '# instituții publice', other: '# de instituții publice' })
    case 'company':
      return plural(count, { one: '# firmă', few: '# firme', other: '# de firme' })
    case 'person':
      return plural(count, { one: '# persoană fizică', few: '# persoane fizice', other: '# de persoane fizice' })
    case 'unknown':
      return plural(count, { one: '# parte neclasificată', few: '# părți neclasificate', other: '# de părți neclasificate' })
  }
}

/** A count of cases in words, with the Romanian „de" from twenty up: „1 dosar", „12 dosare", „97 de dosare". */
export function casesCount(count: number): string {
  return plural(count, { one: '# dosar', few: '# dosare', other: '# de dosare' })
}

export function hearingsCount(count: number): string {
  return plural(count, { one: '# ședință', few: '# ședințe', other: '# de ședințe' })
}

export function partiesCount(count: number): string {
  return plural(count, { one: '# parte', few: '# părți', other: '# de părți' })
}

export function linksCount(count: number): string {
  return plural(count, { one: '# legătură', few: '# legături', other: '# de legături' })
}

export function courtsCount(count: number): string {
  return plural(count, { one: '# instanță', few: '# instanțe', other: '# de instanțe' })
}

/** A stage as the pages group them. */
export function stageLabel(stage: StageKey | 'other'): string {
  switch (stage) {
    case 'fond':
      return t`Fond`
    case 'apel':
      return t`Apel`
    case 'recurs':
      return t`Recurs`
    case 'contestatie':
      return t`Contestație`
    case 'extraordinare':
      return t`Revizuiri și contestații în anulare`
    case 'other':
      return t`Alte etape`
  }
}

/** The name of the code an unresolved citation abbreviates. */
export function codeAliasLabel(alias: CodeAlias): string {
  switch (alias) {
    case 'ncp':
      return t`Codul penal`
    case 'ncpp':
      return t`Codul de procedură penală`
    case 'ncpc':
      return t`Codul de procedură civilă`
    case 'ncc':
      return t`Codul civil`
  }
}

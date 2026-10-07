import { t } from '@lingui/core/macro'
import type { JudicialCourtLevel } from '@/schemas/judicial'
import { COURT_NAMES } from './court-names.generated'

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

import { t } from '@lingui/core/macro'
import type { LegalAnalyticsHead } from '@/schemas/legal-analytics'
import { fmt, pctOf } from './analytics-format'

/**
 * The independent reading of the Felul lens, stated where its figures are (design §11). It was made for the v6
 * rules: the development prototypes still show it as it is.
 */
export const READING_SENTENCE =
  'Felul actului e citit din titlu, de reguli (v6). Citite independent 385 de acte: 94% din încadrările ferme coincid. Încadrările nesigure (reguli de rezervă) sunt o clasă separată, numărată în nicio grupă și nici în stoc.'

/** The rules the independent reading audited: `head.rules.felul` of the layers built with them, exactly. */
const AUDITED_FELUL_RULES = 'felul-v6-2026-11-24'

/**
 * How the Felul lens is read, for the rules the layer was built with: the audit's figures only for the exact
 * rules that were audited. Another version says its name and no audit until one is made; without the layer's
 * head (not read, or failed) the sentence names no version and no audit.
 */
export function readingSentence(felulRules: string | undefined): string {
  if (felulRules === undefined) {
    return t`Felul actului e citit din titlu, de reguli. Încadrările nesigure (reguli de rezervă) sunt o clasă separată, numărată în nicio grupă și nici în stoc.`
  }
  if (felulRules === AUDITED_FELUL_RULES) {
    return t`Felul actului e citit din titlu, de reguli (v6). Citite independent 385 de acte: 94% din încadrările ferme coincid. Încadrările nesigure (reguli de rezervă) sunt o clasă separată, numărată în nicio grupă și nici în stoc.`
  }
  return t`Felul actului e citit din titlu, de reguli (${felulRules}). Încadrările nesigure (reguli de rezervă) sunt o clasă separată, numărată în nicio grupă și nici în stoc.`
}

/**
 * What every analytics page says about its figures; with the head, the figures come from the layer itself. The
 * uncertain and unplaced shares are of every act published (the flow), and said so; the stock holds neither, so
 * on the stock they are not given.
 */
export function analyticsNotes(head: LegalAnalyticsHead | undefined, population: 'flux' | 'stoc' = 'flux'): string[] {
  const unplaced = head ? pctOf(head.totals.unplaced, head.totals.acts) : null
  const uncertain = head ? pctOf(head.totals.uncertain, head.totals.acts) : null
  const shares =
    population === 'stoc'
      ? t`Stocul nu cuprinde încadrări nesigure sau acte neîncadrate. Procentele sunt calculate pe pagină din numărători.`
      : head
        ? t`Din toate actele publicate (${fmt(head.totals.acts)}): încadrări nesigure ${uncertain ?? ''}, neîncadrate ${unplaced ?? ''}. Procentele sunt calculate pe pagină din numărători.`
        : t`Procentele sunt calculate pe pagină din numărători.`
  return [
    head
      ? t`Cifrele vin din stratul de analiză ${head.layer.layerId}, calculat pe corpusul legislativ din ${head.layer.releaseBuiltAt.slice(0, 10)}: ${fmt(head.totals.acts)} acte publice.`
      : t`Cifrele vin din stratul de analiză publicat, calculat pe corpusul legislativ servit.`,
    readingSentence(head?.rules['felul']),
    shares,
    t`Stocul („legislația așa cum este"): actele care stabilesc reguli și stau singure, încadrate ferm — reguli noi, norme de aplicare, parametri periodici, acorduri internaționale, organizarea instituțiilor. Definiție provizorie; starea (în vigoare/abrogat) nu e un filtru aici.`,
    t`Versiuni listate de Portal: datele distincte la care Portalul a listat o versiune consolidată (neoficială), doar pentru actele pe care le consolidează.`,
    t`Actele fără an nu intră când alegi o perioadă; fiecare grafic în timp spune câte sunt.`,
    t`Emitentul e scris în sursă la cele mai multe acte; pentru legi, ordonanțe și decrete fără emitent scris e derivat din tip și dată. Liniile de minister unesc denumiri succesive.`,
    t`Legăturile (ordonanță → lege, decret → lege, act → actul pe care îl modifică, decizie → act) sunt citite din titluri: trimiteri, nu efecte.`,
  ]
}

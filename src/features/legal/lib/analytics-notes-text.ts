import { t } from '@lingui/core/macro'
import type { LegalAnalyticsHead } from '@/schemas/legal-analytics'
import { fmt, pct } from './analytics-format'

/** The independent reading of the Felul lens, stated where its figures are (design §11). */
export const READING_SENTENCE =
  'Felul actului e citit din titlu, de reguli (v6). Citite independent 385 de acte: 94% din încadrările ferme coincid. Încadrările nesigure (reguli de rezervă) sunt o clasă separată, numărată în nicio grupă și nici în stoc.'

/** What every analytics page says about its figures; with the head, the figures come from the layer itself. */
export function analyticsNotes(head: LegalAnalyticsHead | undefined): string[] {
  const unplaced = head ? pct(head.totals.unplaced / Math.max(1, head.totals.acts)) : null
  const uncertain = head ? pct(head.totals.uncertain / Math.max(1, head.totals.acts)) : null
  return [
    head
      ? t`Cifrele vin din stratul de analiză ${head.layer.layerId}, calculat pe corpusul legislativ din ${head.layer.releaseBuiltAt.slice(0, 10)}: ${fmt(head.totals.acts)} acte publice.`
      : t`Cifrele vin din stratul de analiză publicat, calculat pe corpusul legislativ servit.`,
    READING_SENTENCE,
    head
      ? t`Încadrări nesigure: ${uncertain ?? ''}; neîncadrate: ${unplaced ?? ''}. Procentele sunt calculate pe pagină din numărători.`
      : t`Procentele sunt calculate pe pagină din numărători.`,
    t`Stocul („legislația așa cum este"): actele care stabilesc reguli și stau singure, încadrate ferm — reguli noi, norme de aplicare, parametri periodici, acorduri internaționale, organizarea instituțiilor. Definiție provizorie; starea (în vigoare/abrogat) nu e un filtru aici.`,
    t`Versiuni listate de Portal: datele distincte la care Portalul a listat o versiune consolidată (neoficială), doar pentru actele pe care le consolidează.`,
    t`Actele fără an nu intră când alegi o perioadă; fiecare grafic în timp spune câte sunt.`,
    t`Emitentul e scris în sursă la cele mai multe acte; pentru legi, ordonanțe și decrete fără emitent scris e derivat din tip și dată. Liniile de minister unesc denumiri succesive.`,
    t`Legăturile (ordonanță → lege, decret → lege, act → actul pe care îl modifică, decizie → act) sunt citite din titluri: trimiteri, nu efecte.`,
  ]
}

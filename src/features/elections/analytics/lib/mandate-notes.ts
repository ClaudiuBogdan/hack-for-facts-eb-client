import { t } from '@lingui/core/macro'
import { countyNameRo } from '@/lib/territory-counties'
import type { LocalMandates } from './mandates'

/** What a reader should know before the Mandate view's numbers: alerts in amber, the platform's choices after them. */
export function mandateNotes(data: LocalMandates | undefined): { readonly alerts: readonly string[]; readonly facts: readonly string[] } {
  const alerts: string[] = []
  if (data?.missing.length) alerts.push(t`Fără ${data.missing.map((code) => countyNameRo(code) ?? code).join(', ')}: nu e încă în date, iar totalurile pe țară nu îl cuprind.`)
  if (data?.suspect) alerts.push(t`Unele cifre au un defect cunoscut (cuprind contestații anulate); sunt marcate acolo unde apar.`)
  return {
    alerts,
    facts: [
      t`Consiliile județene au două repartizări de mandate, arătate separat: nu se adună.`,
      t`Independenții sunt o singură linie, fără nume; numele de pe buletin rămân pe pagina fiecărei curse.`,
      t`Alianțele Dreapta Unită și PSD + PNL sunt linii proprii; celelalte alianțe și partidele mici sunt „Alte partide".`,
    ],
  }
}

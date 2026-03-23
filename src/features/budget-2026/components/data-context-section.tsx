import { Info } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Currency } from '@/schemas/charts'
import { getBudget2026ExchangeRateLabel } from '../formatting'
import { SectionWrapper } from './section-wrapper'

type Props = {
  readonly currency: Currency
}

export function DataContextSection({ currency }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const exchangeRateLabel = getBudget2026ExchangeRateLabel(currency)

  return (
    <SectionWrapper id="data-context">
      <Card className="rounded-[28px] border-blue-200/50 bg-blue-50/50 shadow-sm dark:border-blue-900/30 dark:bg-blue-950/20">
        <CardContent className="px-4 py-4 sm:px-6 sm:py-5 md:px-7">
          <div className="flex items-start gap-3 sm:gap-4">
            <Info
              className="mt-1 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400"
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-[13px] leading-6 text-foreground sm:text-sm sm:leading-7">
                {'Aceasta pagina prezinta componenta de buget de stat din Anexa 3 pentru 55 de institutii (ordonatori principali de credite). Seria afisata combina realizari 2024, executie preliminata 2025, propuneri 2026 si estimari 2027-2029.'}
              </p>

              {isExpanded ? (
                <div className="space-y-3">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {'Multe institutii apar in Anexa 3 si cu alte surse de finantare, precum venituri proprii, fonduri UE sau credite externe. Aici urmarim exclusiv tabelul „Buget pe capitole - buget de stat”, adica alocarea directa din bugetul de stat.'}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {'Clasificarea functionala arata domeniul finantat (de exemplu Sanatate, Invatamant, Aparare), iar clasificarea economica arata natura cheltuielii (salarii, bunuri si servicii, transferuri, investitii). Pentru ca pagina foloseste aceiasi indicatori din acelasi tabel, anii raman comparabili intre ei.'}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {'In sursa oficiala, valorile sunt publicate in mii de lei. Pe pagina, ele sunt convertite si afisate in moneda selectata global (RON, EUR sau USD), folosind notatia compacta a aplicatiei: „mii” = mii, „mil.” = milioane, „mld.” = miliarde.'}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {exchangeRateLabel
                      ? `Conversia fixa folosita aici: ${exchangeRateLabel}.`
                      : 'Pentru RON nu se aplica nicio conversie.'}
                  </p>
                </div>
              ) : null}

              <div className="flex items-center pt-1">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto justify-start px-0 text-sm font-semibold"
                  onClick={() => setIsExpanded((v) => !v)}
                >
                  {isExpanded ? 'Arata mai putin' : 'Citeste mai mult'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </SectionWrapper>
  )
}

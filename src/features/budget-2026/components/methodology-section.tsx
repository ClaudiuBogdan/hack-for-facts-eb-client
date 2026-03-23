import { useState } from 'react'
import {
  ExternalLink,
  Database,
  Scale,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Currency } from '@/schemas/charts'
import { getBudget2026ExchangeRateLabel } from '../formatting'
import { SectionWrapper } from './section-wrapper'

function SummaryCards({ currency }: { readonly currency: Currency }) {
  const exchangeRateLabel = getBudget2026ExchangeRateLabel(currency)

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-border/40 bg-background/80 p-5">
        <Database className="mb-3 h-5 w-5 text-blue-500" />
        <h3 className="text-sm font-semibold">Sursa</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {'Anexa 3 a proiectului legii bugetului de stat pe anul 2026, publicata de Ministerul Finantelor. Sunt incluse 55 de institutii (ordonatori principali de credite).'}
        </p>
      </div>

      <div className="rounded-2xl border border-border/40 bg-background/80 p-5">
        <Scale className="mb-3 h-5 w-5 text-blue-500" />
        <h3 className="text-sm font-semibold">Unitati si definitii</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {'Sursa oficiala publica sumele in mii de lei, dar pagina le afiseaza in moneda selectata global. Notatia compacta folosita aici este: „mii” = mii, „mil.” = milioane, „mld.” = miliarde.'}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {exchangeRateLabel
            ? `Conversie fixa pe aceasta pagina: ${exchangeRateLabel}.`
            : 'In modul RON, valorile sunt afisate fara conversie suplimentara.'}
        </p>
      </div>

      <div className="rounded-2xl border border-border/40 bg-background/80 p-5">
        <FileText className="mb-3 h-5 w-5 text-blue-500" />
        <h3 className="text-sm font-semibold">Clasificari</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {'Bugetul este prezentat pe doua axe: functionala (pentru ce: Sanatate, Aparare, Invatamant) si economica (cum: salarii, bunuri, transferuri, investitii).'}
        </p>
      </div>
    </div>
  )
}

function FullArticle({ currency }: { readonly currency: Currency }) {
  const exchangeRateLabel = getBudget2026ExchangeRateLabel(currency)

  return (
    <div className="space-y-8 border-t border-border/40 pt-8">
      <div className="space-y-3">
        <h3 className="text-base font-bold tracking-tight">
          {'Ce arata aceasta pagina'}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {'Pagina prezinta componenta de buget de stat din Anexa 3 pentru anul 2026. Datele detaliaza alocarile celor 55 de institutii care primesc finantare directa de la bugetul de stat si pastreaza, in acelasi format, seria 2024-2029 pentru comparatie.'}
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-bold tracking-tight">
          {'Sursele de finantare din Anexa 3'}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {'Anexa 3 contine mai multe tabele pentru fiecare institutie. Aceasta pagina foloseste doar tabelul „Buget pe capitole - buget de stat” (codul 5001), adica finantarea directa din bugetul de stat. Celelalte tabele din Anexa 3, precum venituri proprii, credite externe sau fonduri UE, nu sunt incluse aici.'}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {exchangeRateLabel
            ? `Pentru afisarea in ${currency}, pagina aplica un curs fix de referinta: ${exchangeRateLabel}.`
            : 'Pentru afisarea in RON, pagina pastreaza valorile din setul local derivat din Anexa 3.'}
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-bold tracking-tight">
          {'Clasificari functionale si economice'}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {'Bugetul poate fi citit pe doua axe:'}
        </p>
        <ul className="ml-4 list-disc space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Functional</strong>
            {' (pentru ce se cheltuie): Sanatate, Invatamant, Aparare, Transporturi, etc.'}
          </li>
          <li>
            <strong className="text-foreground">Economic</strong>
            {' (cum se cheltuie): Cheltuieli de personal, Bunuri si servicii, Transferuri, Dobanzi, Investitii, etc.'}
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-bold tracking-tight">
          {'Cum au fost procesate datele'}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {'Datele publicate aici provin dintr-un CSV consolidat generat din PDF-urile Anexei 3, folosind extractie automata si un parser dedicat. Setul rezultat este verificat prin validari de consistenta (totaluri sintetice vs. detaliate) si validari de rollup (sume parinte vs. copil).'}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {'Setul de baza folosit in pagina pastreaza doar randuri explicite din sursa si nu introduce valori reziduale sintetice pentru a inchide artificial totalurile. In unele grafice, randurile foarte mici pot fi grupate vizual pentru lizibilitate.'}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {'Unele vizualizari agregate comprima sau omit fluxurile foarte mici pentru lizibilitate, dar nu schimba seriile de baza din care sunt calculate totalurile afisate in celelalte sectiuni.'}
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-5 dark:border-amber-900/30 dark:bg-amber-950/20">
        <h3 className="flex items-center gap-2 text-base font-bold tracking-tight">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {'Avertismente'}
        </h3>
        <ul className="ml-4 list-disc space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            {'Acesta este un proiect de lege, nu legea adoptata. Cifrele pot suferi modificari in procesul parlamentar.'}
          </li>
          <li>
            {'Datele au fost extrase automat din PDF-uri si pot contine erori minore de procesare (rotunjiri, pozitionare coloane).'}
          </li>
          <li>
            {'Estimarile pentru 2027-2029 sunt indicative si se modifica in fiecare ciclu bugetar.'}
          </li>
        </ul>
      </div>
    </div>
  )
}

type Props = {
  readonly currency: Currency
}

export function MethodologySection({ currency }: Props) {
  const [showFullArticle, setShowFullArticle] = useState(false)

  return (
    <SectionWrapper id="methodology">
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-zinc-50 via-white to-zinc-50 p-8 shadow-sm shadow-primary/3 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/5 blur-[60px]" />

        <div className="relative space-y-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
              <FileText className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                {'Sursa datelor si metodologie'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {'Informatii despre sursa, procesarea si limitarile datelor din aceasta pagina'}
              </p>
            </div>
          </div>

          <SummaryCards currency={currency} />

          <div className="flex flex-wrap items-center gap-3 border-t border-border/40 pt-6">
            <a
              href="https://mfinante.gov.ro/ro/acasa/transparenta/proiecte-acte-normative"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[22px] bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {'Sursa oficiala'}
            </a>
            <span className="text-xs text-muted-foreground">
              {'Ministerul Finantelor — Proiecte de acte normative'}
            </span>
          </div>

          {showFullArticle ? <FullArticle currency={currency} /> : null}

          <div className="flex justify-center border-t border-border/40 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="gap-2 text-sm font-semibold"
              onClick={() => setShowFullArticle((v) => !v)}
            >
              {showFullArticle ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  {'Ascunde detalii'}
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  {'Citeste mai mult despre date si metodologie'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}

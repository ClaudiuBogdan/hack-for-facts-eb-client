import { Trans } from '@lingui/react/macro'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Info, LibraryBig } from 'lucide-react'
import type { ReactNode } from 'react'

interface PnrrInfoSheetProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function PnrrInfoSheet({ open, onOpenChange }: PnrrInfoSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden border-l-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-0 sm:max-w-xl [&>button.absolute]:right-5 [&>button.absolute]:top-5 [&>button.absolute]:h-8 [&>button.absolute]:w-8 [&>button.absolute]:rounded-none [&>button.absolute]:bg-transparent [&>button.absolute]:opacity-100 [&>button.absolute]:ring-offset-0 [&>button.absolute]:hover:bg-[var(--pnrr-card)] [&>button.absolute]:focus:ring-[var(--pnrr-blue)]">
        <SheetHeader className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-6 pr-14 text-left">
          <div className="mb-3 inline-flex w-fit items-center gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] px-3 py-2 text-xs font-black uppercase tracking-wide text-[var(--pnrr-bg)]">
            <Info className="h-4 w-4" />
            <Trans>Info</Trans>
          </div>
          <SheetTitle className="text-left text-4xl font-black leading-none tracking-tight text-[var(--pnrr-fg)]">
            <Trans>Cum citim cifrele PNRR</Trans>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 p-6">
            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5">
              <SectionTitle icon={LibraryBig}>
                <Trans>Pe scurt</Trans>
              </SectionTitle>
              <div className="mt-4 space-y-4 text-base font-medium leading-relaxed text-[var(--pnrr-fg)]">
                <p>
                  <Trans>
                    Dashboardul pornește de la lista publică de proiecte PNRR.
                    Sumele din dashboard se calculează prin adunarea valorilor
                    proiectelor din lista publică. Ele nu arată bani deja
                    plătiți și nu sunt bugetul oficial al întregului plan.
                  </Trans>
                </p>
                <p className="text-[var(--pnrr-muted)]">
                  <Trans>
                    PNRR are și reguli naționale și europene care nu apar direct
                    în tabel: cereri de plată, jaloane, ținte și evaluări ale
                    Comisiei Europene.
                  </Trans>
                </p>
              </div>
            </section>

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
              <SectionHeader>
                <Trans>Dicționar pentru cifrele mari</Trans>
              </SectionHeader>
              <Accordion type="single" collapsible className="w-full">
                <InfoAccordionItem
                  value="listed-value"
                  title={<Trans>Valoarea proiectelor listate</Trans>}
                >
                  <Trans>
                    Adunăm câmpul Valoare (EUR) pentru proiectele care apar în
                    listă. Aceasta este valoarea proiectelor din setul de date,
                    nu suma care a intrat deja în conturi și nici bugetul
                    oficial al întregului PNRR.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="deduplicated-value"
                  title={
                    <Trans>
                      Valoare estimată după eliminarea posibilelor duplicate
                    </Trans>
                  }
                >
                  <Trans>
                    Unele proiecte pot apărea de mai multe ori sau cu informații
                    ușor diferite. Totalul deduplicat încearcă să nu le numere
                    de două ori. Este o estimare a dashboardului, nu o corecție
                    oficială a sursei.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="completed-share"
                  title={
                    <Trans>
                      Ponderea valorii proiectelor marcate finalizate
                    </Trans>
                  }
                >
                  <Trans>
                    Arată cât din valoarea proiectelor listate aparține
                    proiectelor marcate ca finalizate. Nu este „rata de
                    absorbție” oficială: nu măsoară banii primiți de România și
                    nici plățile către beneficiari.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="reported-progress"
                  title={<Trans>Progres tehnic vs progres financiar raportat</Trans>}
                >
                  <Trans>
                    Progresul tehnic spune cât de avansată este lucrarea sau
                    activitatea raportată. Progresul financiar spune cât de
                    avansată este partea financiară raportată pentru proiect.
                    Niciunul nu este același lucru cu plata Comisiei Europene.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="grant-loan"
                  title={<Trans>Granturi și împrumuturi</Trans>}
                >
                  <Trans>
                    Grantul este partea nerambursabilă. Împrumutul este partea
                    rambursabilă a PNRR la nivelul României. Eticheta
                    „împrumut” nu înseamnă că fiecare beneficiar a luat un
                    credit individual.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="missing-duplicates"
                  title={<Trans>Date lipsă și posibile duplicate</Trans>}
                >
                  <Trans>
                    Dacă un proiect nu are progres financiar publicat în set,
                    nu înseamnă automat că nu s-a plătit nimic. Iar când vedem
                    rânduri foarte asemănătoare, le marcăm ca posibile duplicate
                    ca să fie mai ușor de verificat.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="risk-signals"
                  title={<Trans>Semnale de risc, nu verdict</Trans>}
                >
                  <Trans>
                    Semnalele de risc sunt scurtături pentru verificare:
                    proiecte mari cu progres scăzut, decalaje între progresul
                    tehnic și cel financiar sau date incomplete. Ele nu sunt
                    concluzii oficiale.
                  </Trans>
                </InfoAccordionItem>
              </Accordion>
            </section>

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
              <SectionHeader>
                <Trans>Dimensiuni ale datelor</Trans>
              </SectionHeader>
              <Accordion type="single" collapsible className="w-full">
                <InfoAccordionItem
                  value="component"
                  title={<Trans>Componentă PNRR</Trans>}
                >
                  <Trans>
                    Componentele PNRR grupează reforme și investiții tematice.
                    Ele ajută la filtrare, dar nu spun singure câți bani au
                    fost plătiți sau ce risc are proiectul.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="measure"
                  title={<Trans>Măsură PNRR</Trans>}
                >
                  <div className="space-y-3">
                    <p>
                      <Trans>
                        Măsura este nivelul de plan sub care sunt organizate
                        proiectele. O măsură poate include mai multe proiecte,
                        beneficiari, jaloane și ținte.
                      </Trans>
                    </p>
                    <p>
                      <Trans>
                        Măsurile pot fi investiții (I) sau reforme (R), fiecare
                        cu numele oficial aprobat în plan.
                      </Trans>
                    </p>
                  </div>
                </InfoAccordionItem>

                <InfoAccordionItem value="county" title={<Trans>Județ</Trans>}>
                  <Trans>
                    Locația geografică a proiectului. Proiectele naționale sau
                    fără localizare unică sunt marcate separat pentru a nu
                    distorsiona comparațiile județene.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="cri"
                  title={<Trans>Coordonator de reformă/investiție (CRI)</Trans>}
                >
                  <Trans>
                    CRI este instituția care coordonează implementarea și
                    raportarea. Beneficiarul proiectului poate fi o altă
                    instituție sau entitate.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="beneficiary-classification"
                  title={<Trans>Clasificarea beneficiarilor</Trans>}
                >
                  <div className="space-y-3">
                    <p>
                      <Trans>
                        Clasificarea public / privat sau non-public este o
                        regulă operațională a dashboardului. Ea ajută analiza,
                        dar cazurile speciale pot necesita verificare manuală.
                      </Trans>
                    </p>
                    <p>
                      <Trans>
                        Public include instituții locale, județene, centrale și
                        naționale, plus companii publice identificate prin CUI.
                        Privat / non-public include companii, ONG-uri, fundații,
                        organizații religioase și beneficiari non-publici
                        neclasificați.
                      </Trans>
                    </p>
                    <p>
                      <Trans>
                        Național este o categorie de localizare sau beneficiar
                        pentru rânduri fără o atribuire locală unică; nu este un
                        al treilea sector de nivel principal.
                      </Trans>
                    </p>
                  </div>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="funding"
                  title={<Trans>Sursa finanțării</Trans>}
                >
                  <Trans>
                    Grant, împrumut sau grant + împrumut. Valorile originale
                    sunt în EUR și sunt convertite automat în moneda selectată.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="progress"
                  title={<Trans>Stadiu de implementare raportat</Trans>}
                >
                  <Trans>
                    Progres tehnic și financiar raportat în datele publice.
                    Procentele peste 100% sunt tratate ca anomalii de date care
                    trebuie verificate, nu ca verdict.
                  </Trans>
                </InfoAccordionItem>
              </Accordion>
            </section>

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
              <SectionHeader>
                <Trans>Semnale de risc și calitatea datelor</Trans>
              </SectionHeader>
              <div className="border-b border-[var(--pnrr-border)] p-5 text-sm font-medium leading-relaxed text-[var(--pnrr-muted)]">
                <Trans>
                  Semnalele de risc sunt separate de problemele de calitate a
                  datelor. Ele ajută verificarea, dar nu sunt verdict juridic
                  sau financiar.
                </Trans>
              </div>
              <div className="divide-y divide-[var(--pnrr-border)]">
                <DefinitionRow
                  title={<Trans>Progres financiar raportat peste 100%</Trans>}
                  description={
                    <Trans>
                      Procent financiar peste pragul obișnuit; poate fi eroare,
                      regularizare sau schimbare a valorii de referință.
                    </Trans>
                  }
                />

                <DefinitionRow
                  title={<Trans>Decalaj financiar-tehnic</Trans>}
                  description={
                    <Trans>
                      Progres financiar raportat mult peste progresul tehnic
                      raportat; necesită verificare în documente.
                    </Trans>
                  }
                />

                <DefinitionRow
                  title={<Trans>Valoare mare și progres scăzut</Trans>}
                  description={
                    <Trans>
                      Valoare listată peste 10 mil. EUR și progres tehnic
                      raportat sub 30%.
                    </Trans>
                  }
                />

                <DefinitionRow
                  title={<Trans>Finalizat tehnic, progres financiar scăzut</Trans>}
                  description={
                    <Trans>
                      Proiect marcat finalizat tehnic, dar cu progres financiar
                      raportat sub 80%; indică un decalaj care trebuie
                      verificat.
                    </Trans>
                  }
                />

                <DefinitionRow
                  title={<Trans>Posibile duplicate cu date diferite</Trans>}
                  description={
                    <Trans>
                      Rânduri similare sunt raportate cu valori, progres sau
                      localizări diferite.
                    </Trans>
                  }
                />

                <DefinitionRow
                  title={<Trans>Date financiare nepublicate în set</Trans>}
                  description={
                    <Trans>
                      Lipsa progresului financiar publicat nu înseamnă zero
                      plăți.
                    </Trans>
                  }
                />
              </div>
            </section>

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5">
              <SectionTitle>
                <Trans>Conversie valutară</Trans>
              </SectionTitle>
              <p className="mt-3 text-sm font-medium leading-relaxed text-[var(--pnrr-muted)]">
                <Trans>
                  Datele originale sunt exprimate în EUR. Valorile afișate sunt
                  convertite automat în moneda selectată folosind rate fixe de
                  referință.
                </Trans>
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <CurrencyBox label="RON" value="1 EUR = 5,14 RON" />
                <CurrencyBox label="USD" value="1 USD = 4,44 RON" />
              </div>
              <p className="mt-3 text-xs font-medium leading-relaxed text-[var(--pnrr-muted)]">
                <Trans>
                  Ratele sunt setate la data ultimei actualizări a datelor și
                  pot diferi de cursurile zilnice BNR.
                </Trans>
              </p>
            </section>

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5">
              <SectionTitle>
                <Trans>Sursa datelor</Trans>
              </SectionTitle>
              <p className="mt-3 text-sm font-medium leading-relaxed text-[var(--pnrr-muted)]">
                <Trans>
                  Datele provin de la Ministerul Investițiilor și Proiectelor
                  Europene (MIPE), prin portalul oficial PNRR. Ultima
                  actualizare: 30 aprilie 2026.
                </Trans>
              </p>
            </section>
          </div>
        </ScrollArea>

        <DrawerFooterClose onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

function SectionHeader({ children }: { readonly children: ReactNode }) {
  return (
    <div className="border-b-2 border-[var(--pnrr-border)] p-5">
      <h3 className="text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
        {children}
      </h3>
    </div>
  )
}

function SectionTitle({
  children,
  icon: Icon,
}: {
  readonly children: ReactNode
  readonly icon?: typeof LibraryBig
}) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </h3>
  )
}

function InfoAccordionItem({
  value,
  title,
  children,
}: {
  readonly value: string
  readonly title: ReactNode
  readonly children: ReactNode
}) {
  return (
    <AccordionItem
      value={value}
      className="border-b border-[var(--pnrr-border)] last:border-b-0"
    >
      <AccordionTrigger className="px-5 py-4 text-left text-base font-black text-[var(--pnrr-fg)] hover:no-underline [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-[var(--pnrr-muted)]">
        {title}
      </AccordionTrigger>
      <AccordionContent className="px-5 pb-5 text-sm font-medium leading-relaxed text-[var(--pnrr-muted)]">
        {children}
      </AccordionContent>
    </AccordionItem>
  )
}

function DefinitionRow({
  title,
  description,
}: {
  readonly title: ReactNode
  readonly description: ReactNode
}) {
  return (
    <div className="grid gap-2 p-5 sm:grid-cols-[180px_1fr] sm:gap-4">
      <p className="text-sm font-black leading-snug text-[var(--pnrr-fg)]">
        {title}
      </p>
      <p className="text-sm font-medium leading-relaxed text-[var(--pnrr-muted)]">
        {description}
      </p>
    </div>
  )
}

function CurrencyBox({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}) {
  return (
    <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-3">
      <p className="text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[var(--pnrr-fg)]">{value}</p>
    </div>
  )
}

function DrawerFooterClose({ onClose }: { readonly onClose: () => void }) {
  return (
    <div className="border-t-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-4">
      <button
        type="button"
        onClick={onClose}
        className="flex h-11 w-full items-center justify-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] px-4 text-sm font-black uppercase tracking-wide text-[var(--pnrr-bg)] transition-colors hover:bg-[var(--pnrr-card)] hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
      >
        <Trans>Close</Trans>
      </button>
    </div>
  )
}

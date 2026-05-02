import { Trans } from '@lingui/react/macro'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
            <Trans>Despre datele PNRR</Trans>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 p-6">
            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5">
              <SectionTitle icon={LibraryBig}>
                <Trans>Prezentare generală</Trans>
              </SectionTitle>
              <div className="mt-4 space-y-4 text-base font-medium leading-relaxed text-[var(--pnrr-fg)]">
                <p>
                  <Trans>
                    Acest dashboard prezintă toate proiectele din Planul Național de
                    Redresare și Reziliență (PNRR) al României. Datele sunt preluate
                    de la Ministerul Investițiilor și Proiectelor Europene.
                  </Trans>
                </p>
                <p className="text-[var(--pnrr-muted)]">
                  <Trans>
                    Fiecare proiect are asociate mai multe dimensiuni: componenta
                    PNRR, măsura specifică, județul, instituția responsabilă (CRI),
                    sursa de finanțare și stadiul de implementare.
                  </Trans>
                </p>
              </div>
            </section>

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
              <SectionHeader>
                <Trans>Dimensiuni ale datelor</Trans>
              </SectionHeader>
              <Accordion type="single" collapsible className="w-full">
                <InfoAccordionItem value="component" title={<Trans>Componentă PNRR</Trans>}>
                  <Trans>
                    Cele 16 componente ale PNRR (C1-C16) reprezintă domeniile
                    strategice de investiții și reforme. Fiecare componentă conține
                    una sau mai multe măsuri.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem value="measure" title={<Trans>Măsură PNRR</Trans>}>
                  <div className="space-y-3">
                    <p>
                      <Trans>
                        Codul măsurii combină codul componentei și codul măsurii
                        (ex: C4.I1, C15.I9). Acesta este unic în contextul
                        componentei.
                      </Trans>
                    </p>
                    <p>
                      <Trans>
                        Măsurile pot fi investiții (I) sau reforme (R), fiecare cu
                        denumirea oficială aprobată în plan.
                      </Trans>
                    </p>
                  </div>
                </InfoAccordionItem>

                <InfoAccordionItem value="county" title={<Trans>Județ</Trans>}>
                  <Trans>
                    Localizarea geografică a proiectului. Proiectele naționale,
                    fără localizare specifică, sunt marcate separat și pot fi incluse
                    sau excluse din filtre.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem value="cri" title={<Trans>Instituție responsabilă (CRI)</Trans>}>
                  <Trans>
                    Coordonatorul responsabil de implementare, de obicei un minister
                    sau o agenție națională.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem value="funding" title={<Trans>Sursă de finanțare</Trans>}>
                  <Trans>
                    Grant, împrumut sau finanțare mixtă. Valorile originale sunt în
                    EUR și sunt convertite automat în moneda selectată.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem value="progress" title={<Trans>Stadiu implementare</Trans>}>
                  <Trans>
                    Progresul tehnic și financiar raportat de beneficiari. Procentele
                    pot depăși 100% în cazul schimbărilor de scop sau al erorilor de
                    raportare.
                  </Trans>
                </InfoAccordionItem>
              </Accordion>
            </section>

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
              <SectionHeader>
                <Trans>Riscuri și calitatea datelor</Trans>
              </SectionHeader>
              <div className="border-b border-[var(--pnrr-border)] p-5 text-sm font-medium leading-relaxed text-[var(--pnrr-muted)]">
                <Trans>
                  Riscurile sunt separate de problemele de raportare ca utilizatorii
                  să poată prioritiza proiectele care cer verificare directă.
                </Trans>
              </div>
              <div className="divide-y divide-[var(--pnrr-border)]">
                <DefinitionRow
                  title={<Trans>Depășire financiară</Trans>}
                  description={<Trans>Progres financiar raportat peste 100% din valoarea contractată.</Trans>}
                />
                <DefinitionRow
                  title={<Trans>Plăți înaintea livrării</Trans>}
                  description={<Trans>Progres financiar mult înaintea progresului tehnic.</Trans>}
                />
                <DefinitionRow
                  title={<Trans>Proiecte mari cu progres redus</Trans>}
                  description={<Trans>Valoare peste 10 mil. EUR și progres tehnic sub 30%.</Trans>}
                />
                <DefinitionRow
                  title={<Trans>Lucrări finalizate, decontare blocată</Trans>}
                  description={<Trans>Finalizat tehnic, dar decontarea este sub 80%.</Trans>}
                />
                <DefinitionRow
                  title={<Trans>Duplicate cu date diferite</Trans>}
                  description={<Trans>Același proiect este raportat cu valori, progres sau localizare diferite.</Trans>}
                />
                <DefinitionRow
                  title={<Trans>Progres financiar lipsă</Trans>}
                  description={<Trans>Proiecte mari sau finalizate tehnic fără date financiare publicate.</Trans>}
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
                  convertite automat în moneda selectată din setările contului,
                  folosind cursuri de referință fixe.
                </Trans>
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <CurrencyBox label="RON" value="1 EUR = 5,14 RON" />
                <CurrencyBox label="USD" value="1 USD = 4,44 RON" />
              </div>
              <p className="mt-3 text-xs font-medium leading-relaxed text-[var(--pnrr-muted)]">
                <Trans>
                  Cursurile sunt stabilite la data ultimei actualizări a datelor și
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
                  Europene (MIPE), prin portalul oficial PNRR. Ultima actualizare:
                  30 aprilie 2026.
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
    <AccordionItem value={value} className="border-b border-[var(--pnrr-border)] last:border-b-0">
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
      <p className="mt-1 text-sm font-black text-[var(--pnrr-fg)]">
        {value}
      </p>
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
        <Trans>Închide</Trans>
      </button>
    </div>
  )
}

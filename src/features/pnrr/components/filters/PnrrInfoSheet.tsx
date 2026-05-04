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
            <Trans>How to read PNRR figures</Trans>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 p-6">
            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5">
              <SectionTitle icon={LibraryBig}>
                <Trans>In short</Trans>
              </SectionTitle>
              <div className="mt-4 space-y-4 text-base font-medium leading-relaxed text-[var(--pnrr-fg)]">
                <p>
                  <Trans>
                    The main figure "Total PNRR allocation" comes from the
                    official aggregated indicator published by MIPE. It is the
                    official plan budget, not the sum of project rows.
                  </Trans>
                </p>
                <p className="text-[var(--pnrr-muted)]">
                  <Trans>
                    The rest of the analyses use the official project list:
                    projects grouped by id_angajament, official records at row
                    level, and amounts listed separately from payments to
                    beneficiaries.
                  </Trans>
                </p>
              </div>
            </section>

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
              <SectionHeader>
                <Trans>Dictionary for big figures</Trans>
              </SectionHeader>
              <Accordion type="single" collapsible className="w-full">
                <InfoAccordionItem
                  value="allocated-total"
                  title={<Trans>Total PNRR allocation</Trans>}
                >
                  <Trans>
                    It is the official aggregated value from the
                    indicatori_total file, the alocat_eur field. We display it
                    as the main value for parity with the official table. In RON
                    it is converted using the rate used in the dashboard: 1 EUR
                    = 5 RON.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="listed-value"
                  title={<Trans>Listed / contracted value</Trans>}
                >
                  <Trans>
                    Este suma câmpului valoare_fe din fișierul principal
                    progres_tehnic_proiecte. Această sumă poate fi mai mică
                    decât alocarea totală deoarece reprezintă valorile publicate
                    pe rândurile de proiect, nu întregul buget al planului.
                    Graficele, filtrele și topurile pe proiecte folosesc această
                    valoare de rând.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="project-records"
                  title={<Trans>Projects vs official records</Trans>}
                >
                  <Trans>
                    "Project count" is the distinct number of id_angajament.
                    The main file has more records than projects, because the
                    same project can have multiple rows on measures, components
                    or funding sources. Project tables group these rows, and
                    charts that distribute values sum the official rows.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="payments"
                  title={<Trans>Amounts received and payments</Trans>}
                >
                  <Trans>
                    Topul beneficiarilor după sume primite folosește fișierul
                    oficial dedicat persoanelor/beneficiarilor cu plăți. Nu îl
                    calculăm din progresul financiar al proiectelor, deoarece
                    progresul financiar nu conține toate evenimentele de plată,
                    prefinanțările, corecțiile sau tratamentul TVA/neeligibil.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="completed-share"
                  title={
                    <Trans>
                      Share of value of projects marked as completed
                    </Trans>
                  }
                >
                  <Trans>
                    Shows how much of the listed project value belongs to
                    projects marked as completed. It is not the official
                    "absorption rate": it does not measure money received by
                    Romania or payments to beneficiaries.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="reported-progress"
                  title={<Trans>Technical progress vs reported financial progress</Trans>}
                >
                  <Trans>
                    Technical progress shows how advanced the reported work or
                    activity is. Financial progress shows how advanced the
                    reported financial part is for the project. Neither is the
                    same as European Commission payment.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="grant-loan"
                  title={<Trans>Grants and loans</Trans>}
                >
                  <Trans>
                    The grant is the non-reimbursable part. The loan is the
                    reimbursable part of the PNRR at Romania level. The
                    "loan" label does not mean that each beneficiary took an
                    individual credit.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="currency"
                  title={<Trans>EUR/RON conversion</Trans>}
                >
                  <Trans>
                    Official data is published in EUR for indicators and in RON
                    for project values. For comparisons we use the official rate
                    applied in the dashboard: 1 EUR = 5 RON. Small differences
                    may come from rounding and from the level at which each
                    source is published.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="missing-duplicates"
                  title={<Trans>Missing data and possible duplicates</Trans>}
                >
                  <Trans>
                    If a project does not have published financial progress in
                    the dataset, it does not automatically mean nothing was
                    paid. And when we see very similar rows, we mark them as
                    possible duplicates to make them easier to verify.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="risk-signals"
                  title={<Trans>Risk signals, not verdict</Trans>}
                >
                  <Trans>
                    Risk signals are shortcuts for verification: large projects
                    with low progress, gaps between technical and financial
                    progress, or incomplete data. They are not official
                    conclusions.
                  </Trans>
                </InfoAccordionItem>
              </Accordion>
            </section>

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
              <SectionHeader>
                <Trans>Data dimensions</Trans>
              </SectionHeader>
              <Accordion type="single" collapsible className="w-full">
                <InfoAccordionItem
                  value="component"
                  title={<Trans>PNRR Component</Trans>}
                >
                  <Trans>
                    PNRR components group thematic reforms and investments.
                    They help with filtering, but alone they do not tell how
                    much money was paid or what risk a project has.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="measure"
                  title={<Trans>PNRR Measure</Trans>}
                >
                  <div className="space-y-3">
                    <p>
                      <Trans>
                        The measure is the plan level under which projects are
                        organized. A measure can include multiple projects,
                        beneficiaries, milestones, and targets.
                      </Trans>
                    </p>
                    <p>
                      <Trans>
                        Measures can be investments (I) or reforms (R), each
                        with the officially approved name in the plan.
                      </Trans>
                    </p>
                  </div>
                </InfoAccordionItem>

                <InfoAccordionItem value="county" title={<Trans>County</Trans>}>
                  <Trans>
                    The geographical location of the project. National projects
                    or those without a unique location are marked separately so
                    as not to distort county comparisons.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="cri"
                  title={<Trans>Reform/Investment Coordinator (CRI)</Trans>}
                >
                  <Trans>
                    CRI is the institution that coordinates implementation and
                    reporting. The project beneficiary may be a different
                    institution or entity.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="beneficiary-classification"
                  title={<Trans>Beneficiary classification</Trans>}
                >
                  <div className="space-y-3">
                    <p>
                      <Trans>
                        The public / private or non-public classification is an
                        operational rule of the dashboard. It helps analysis,
                        but special cases may require manual verification.
                      </Trans>
                    </p>
                    <p>
                      <Trans>
                        Public includes local, county, central, and national
                        institutions, plus public companies identified by CUI.
                        Private / non-public includes companies, NGOs,
                        foundations, religious organizations, and unclassified
                        non-public beneficiaries.
                      </Trans>
                    </p>
                    <p>
                      <Trans>
                        National is a location or beneficiary category for rows
                        without a unique local assignment; it is not a third
                        main-level sector.
                      </Trans>
                    </p>
                  </div>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="funding"
                  title={<Trans>Funding source</Trans>}
                >
                  <Trans>
                    Grant, loan, or grant + loan. Original values are in EUR and
                    are automatically converted to the selected currency.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="progress"
                  title={<Trans>Reported implementation status</Trans>}
                >
                  <Trans>
                    Technical and financial progress reported in public data.
                    Percentages over 100% are treated as data anomalies to be
                    verified, not as verdicts.
                  </Trans>
                </InfoAccordionItem>
              </Accordion>
            </section>

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
              <SectionHeader>
                <Trans>Risk signals and data quality</Trans>
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
                  title={<Trans>Reported financial progress over 100%</Trans>}
                  description={
                    <Trans>
                      Financial percentage above usual threshold; may be error,
                      regularization, or change in reference value.
                    </Trans>
                  }
                />

                <DefinitionRow
                  title={<Trans>Financial-technical gap</Trans>}
                  description={
                    <Trans>
                      Reported financial progress well above reported technical
                      progress; requires verification in documents.
                    </Trans>
                  }
                />

                <DefinitionRow
                  title={<Trans>Large value and low progress</Trans>}
                  description={
                    <Trans>
                      Listed value over 10 mil. EUR and reported technical
                      progress under 30%.
                    </Trans>
                  }
                />

                <DefinitionRow
                  title={<Trans>Technically completed, low financial progress</Trans>}
                  description={
                    <Trans>
                      Project marked as technically completed, but with reported
                      financial progress under 80%; indicates a gap that needs
                      verification.
                    </Trans>
                  }
                />

                <DefinitionRow
                  title={<Trans>Possible duplicates with different data</Trans>}
                  description={
                    <Trans>
                      Similar rows are reported with different values, progress,
                      or locations.
                    </Trans>
                  }
                />

                <DefinitionRow
                  title={<Trans>Financial data not published in dataset</Trans>}
                  description={
                    <Trans>
                      Missing published financial progress does not mean zero
                      payments.
                    </Trans>
                  }
                />
              </div>
            </section>

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5">
              <SectionTitle>
                <Trans>Currency conversion</Trans>
              </SectionTitle>
              <p className="mt-3 text-sm font-medium leading-relaxed text-[var(--pnrr-muted)]">
                <Trans>
                  PNRR project values use the official fixed conversion rate
                  applied in the dashboard. Displayed RON values are converted
                  with this rate.
                </Trans>
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <CurrencyBox label="RON" value="1 EUR = 5 RON" />
              </div>
              <p className="mt-3 text-xs font-medium leading-relaxed text-[var(--pnrr-muted)]">
                <Trans>
                  This is the fixed rate used by the PNRR dashboard model, not
                  a daily BNR exchange rate.
                </Trans>
              </p>
            </section>

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5">
              <SectionTitle>
                <Trans>Data source</Trans>
              </SectionTitle>
              <p className="mt-3 text-sm font-medium leading-relaxed text-[var(--pnrr-muted)]">
                <Trans>
                  Data comes from the Ministry of Investments and European
                  Projects (MIPE), through the official PNRR portal. Last
                  update: April 30, 2026.
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

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
            <Trans>About the PNRR data</Trans>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 p-6">
            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5">
              <SectionTitle icon={LibraryBig}>
                <Trans>Overview</Trans>
              </SectionTitle>
              <div className="mt-4 space-y-4 text-base font-medium leading-relaxed text-[var(--pnrr-fg)]">
                <p>
                  <Trans>
                    This dashboard shows all projects in Romania's National
                    Recovery and Resilience Plan (PNRR). The data is sourced
                    from the Ministry of Investments and European Projects.
                  </Trans>
                </p>
                <p className="text-[var(--pnrr-muted)]">
                  <Trans>
                    Each project is associated with several dimensions: PNRR
                    component, specific measure, county, responsible institution
                    (CRI), funding source, and implementation status.
                  </Trans>
                </p>
              </div>
            </section>

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
              <SectionHeader>
                <Trans>Data dimensions</Trans>
              </SectionHeader>
              <Accordion type="single" collapsible className="w-full">
                <InfoAccordionItem
                  value="component"
                  title={<Trans>PNRR component</Trans>}
                >
                  <Trans>
                    The 16 PNRR components (C1-C16) represent strategic
                    investment and reform areas. Each component contains one or
                    more measures.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="measure"
                  title={<Trans>PNRR measure</Trans>}
                >
                  <div className="space-y-3">
                    <p>
                      <Trans>
                        The measure code combines the component code and measure
                        code (for example: C4.I1, C15.I9). It is unique within
                        the component.
                      </Trans>
                    </p>
                    <p>
                      <Trans>
                        Measures may be investments (I) or reforms (R), each
                        with the official name approved in the plan.
                      </Trans>
                    </p>
                  </div>
                </InfoAccordionItem>

                <InfoAccordionItem value="county" title={<Trans>County</Trans>}>
                  <Trans>
                    The geographic location of the project. National projects
                    without a specific location are marked separately and can be
                    included or excluded from filters.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="cri"
                  title={<Trans>Responsible institution (CRI)</Trans>}
                >
                  <Trans>
                    The coordinator responsible for implementation, usually a
                    ministry or national agency.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="funding"
                  title={<Trans>Funding source</Trans>}
                >
                  <Trans>
                    Grant, loan, or mixed funding. Original values are in EUR
                    and are automatically converted to the selected currency.
                  </Trans>
                </InfoAccordionItem>

                <InfoAccordionItem
                  value="progress"
                  title={<Trans>Implementation status</Trans>}
                >
                  <Trans>
                    Technical and financial progress reported by beneficiaries.
                    Percentages may exceed 100% in cases of scope changes or
                    reporting errors.
                  </Trans>
                </InfoAccordionItem>
              </Accordion>
            </section>

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
              <SectionHeader>
                <Trans>Risks and data quality</Trans>
              </SectionHeader>
              <div className="border-b border-[var(--pnrr-border)] p-5 text-sm font-medium leading-relaxed text-[var(--pnrr-muted)]">
                <Trans>
                  Risks are separated from reporting issues so users can
                  prioritize projects that require direct verification.
                </Trans>
              </div>
              <div className="divide-y divide-[var(--pnrr-border)]">
                <DefinitionRow
                  title={<Trans>Financial overrun</Trans>}
                  description={
                    <Trans>
                      Reported financial progress over 100% of the contracted
                      value.
                    </Trans>
                  }
                />

                <DefinitionRow
                  title={<Trans>Payments ahead of delivery</Trans>}
                  description={
                    <Trans>
                      Financial progress far ahead of technical progress.
                    </Trans>
                  }
                />

                <DefinitionRow
                  title={<Trans>Large projects with low progress</Trans>}
                  description={
                    <Trans>
                      Value over EUR 10M and technical progress under 30%.
                    </Trans>
                  }
                />

                <DefinitionRow
                  title={<Trans>Completed works, blocked reimbursement</Trans>}
                  description={
                    <Trans>
                      Technically completed, but reimbursement is under 80%.
                    </Trans>
                  }
                />

                <DefinitionRow
                  title={<Trans>Duplicates with different data</Trans>}
                  description={
                    <Trans>
                      The same project is reported with different values,
                      progress, or location.
                    </Trans>
                  }
                />

                <DefinitionRow
                  title={<Trans>Missing financial progress</Trans>}
                  description={
                    <Trans>
                      Large or technically completed projects without published
                      financial data.
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
                  The original data is expressed in EUR. Displayed values are
                  automatically converted to the currency selected in account
                  settings using fixed reference rates.
                </Trans>
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <CurrencyBox label="RON" value="1 EUR = 5,14 RON" />
                <CurrencyBox label="USD" value="1 USD = 4,44 RON" />
              </div>
              <p className="mt-3 text-xs font-medium leading-relaxed text-[var(--pnrr-muted)]">
                <Trans>
                  Rates are set on the date of the latest data update and may
                  differ from daily NBR rates.
                </Trans>
              </p>
            </section>

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5">
              <SectionTitle>
                <Trans>Data source</Trans>
              </SectionTitle>
              <p className="mt-3 text-sm font-medium leading-relaxed text-[var(--pnrr-muted)]">
                <Trans>
                  The data comes from the Ministry of Investments and European
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

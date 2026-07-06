import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { CoverageRibbonFromGate } from '@/components/shared/procurement-data/coverage-ribbon'
import { RequestDatasetAction } from '@/components/shared/procurement-data/request-dataset-action'
import type { CapabilityGate, DataStatus } from '@/schemas/procurement'
import { procurementSectionLabelClassName } from '../lib/procurement-theme'
import { PROCUREMENT_DATASET_ID } from '../lib/mock-mode'

type Props = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly gate?: CapabilityGate
  readonly status: DataStatus
}

/** "About this data" side panel: coverage, glossary, provenance, request CTA. */
export function ProcurementInfoSheet({
  open,
  onOpenChange,
  gate,
  status,
}: Props) {
  const glossary = [
    {
      term: t`Procedure`,
      description: t`A public tender: the notice, the evaluation and the award are tracked as one procedure.`,
    },
    {
      term: t`Contract`,
      description: t`An awarded contract between a contracting authority and a supplier, from SEAP or e-licitatie.`,
    },
    {
      term: t`Direct acquisition`,
      description: t`A purchase below the tender thresholds, made directly in the SEAP catalogue.`,
    },
    {
      term: t`Modification`,
      description: t`An amendment (act adițional) that changes a contract's value; linked to its contract when the source data allows it.`,
    },
    {
      term: t`CPV`,
      description: t`The EU common procurement vocabulary. Categories are reliable at division level (first two digits).`,
    },
    {
      term: t`Coverage gate`,
      description: t`Per-grain data-quality thresholds that decide which filters and rankings are served as authoritative.`,
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="flex w-full max-w-full flex-col gap-0 overflow-hidden border-l-2 border-[#b1b4b6] bg-white p-0 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-bg)] sm:max-w-md"
      >
        <SheetHeader className="border-b-2 border-[#b1b4b6] p-6 pr-14 text-left dark:border-[var(--pnrr-border)]">
          <SheetTitle className="text-left text-2xl font-black tracking-tight text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            <Trans>About this data</Trans>
          </SheetTitle>
          <SheetDescription className="pt-1 text-left text-sm font-semibold text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            <Trans>
              Sources, coverage and honest limits of the procurement dataset.
            </Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {gate ? (
            <section className="space-y-2">
              <p className={procurementSectionLabelClassName}>
                <Trans>Coverage</Trans>
              </p>
              <CoverageRibbonFromGate gate={gate} status={status} collapsible />
            </section>
          ) : null}

          <section className="space-y-3">
            <p className={procurementSectionLabelClassName}>
              <Trans>Glossary</Trans>
            </p>
            <dl className="space-y-3">
              {glossary.map((entry) => (
                <div key={entry.term}>
                  <dt className="text-sm font-bold text-[var(--pnrr-fg)]">
                    {entry.term}
                  </dt>
                  <dd className="mt-0.5 text-sm text-[var(--pnrr-muted)]">
                    {entry.description}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-2">
            <p className={procurementSectionLabelClassName}>
              <Trans>Sources</Trans>
            </p>
            <p className="text-sm text-[var(--pnrr-muted)]">
              <Trans>
                Records come from SEAP/SICAP bulk data and e-licitatie.ro.
                Values failing sanity checks are shown as unavailable rather
                than guessed; duplicates across sources are collapsed to one
                canonical record.
              </Trans>
            </p>
            <RequestDatasetAction dataset={PROCUREMENT_DATASET_ID} />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { RequestDatasetAction } from '@/components/shared/procurement-data/request-dataset-action'
import { procurementSectionLabelClassName } from '../lib/procurement-theme'
import { PROCUREMENT_DATASET_ID } from '../lib/dataset'

type Props = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

/** "About this data" side panel: coverage, glossary, provenance, request CTA. */
export function ProcurementInfoSheet({
  open,
  onOpenChange,
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
      description: t`An amendment (act adițional) that changes a contract's value; linked to its contract when the source data allows it. Analyzed as counts only — raw amendment money is quality-checked, not summed.`,
    },
    {
      term: t`Awarded value`,
      description: t`What was signed — the accepted award value of a contract or purchase. The default money figure; framework umbrellas are excluded from it.`,
    },
    {
      term: t`Estimated value`,
      description: t`What was budgeted — the value published before award. Reliable on procedures; on contracts it often repeats a whole framework's total, so a contract-level sum abstains.`,
    },
    {
      term: t`Framework ceiling`,
      description: t`The maximum a framework agreement allows, counted once per framework. An upper bound on commitment — never money spent, never added to awarded values.`,
    },
    {
      term: t`Call-off (subsequent contract)`,
      description: t`A contract executed under a framework agreement. Reported for only part of the frameworks, so totals are a lower bound; never summed with contract awards.`,
    },
    {
      term: t`Modification-adjusted value`,
      description: t`The final contract value after a verified chain of amendments. Contracts whose amendments cannot be ordered reliably are excluded, not served as awarded.`,
    },
    {
      term: t`Coverage gate`,
      description: t`Each money figure has its own measured coverage verdict: served in full, disclosed as partial (with an understatement warning), or withheld — never silently substituted.`,
    },
    {
      term: t`CPV`,
      description: t`The EU common procurement vocabulary. Categories are reliable at division level (first two digits).`,
    },
    {
      term: t`Answerability`,
      description: t`Every analysis answer states whether it is served, degraded, or unavailable, with machine-readable reasons and caveats.`,
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

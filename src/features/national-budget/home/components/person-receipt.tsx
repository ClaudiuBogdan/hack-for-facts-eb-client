import { t } from '@lingui/core/macro'

import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { cn } from '@/lib/utils'
import { usePageYear } from '../hooks/use-page-year'
import { monthsCovered, useHundred, useOfficialTotals } from '../hooks/use-person-data'
import { BORROWED_FILL, REST_FILL, inPeriod, leiText, leiWord, populationText, previousText, toneOf } from '../lib/person-format'
import { receiptOf } from '../lib/receipt'
import { Note, Section } from './person-shell'

/**
 * The year's spending at one person's scale, as a printed receipt (owner, 26
 * November 2026, from the prototype national-budget/persoana, variant bon):
 * every spending line in lei per resident, the total, and what covered it
 * (receipts, then the cash deficit); beside it the four largest lines, with
 * what they hold and their change on a year earlier. The figures are
 * `receiptOf`'s (`lib/receipt.ts`).
 *
 * The lines are the 100-lei flow's, in its order and colours, so the two read
 * as one: the flow says the shares, the receipt the lei.
 */

/** A receipt figure: whole lei; the receipt's head says „lei pe locuitor" to the eye, each figure says its unit to a screen reader. */
function Lei({ lei }: { readonly lei: number }) {
  return (
    <span className="shrink-0 tabular-nums">
      {formatHubNumber(lei)}
      <span className="sr-only"> {leiWord(lei)}</span>
    </span>
  )
}

function Receipt() {
  const { view } = usePageYear()
  const spending = useHundred(view, 'spending')
  const totals = useOfficialTotals(view)
  const receipt = receiptOf({
    lines: spending.lines,
    whole: spending.whole,
    revenue: totals.revenue,
    balance: totals.balance,
    year: view.year,
    months: monthsCovered(view),
    rest: spending.rest,
  })
  if (!receipt) return <p className="text-sm text-muted-foreground">{t`Datele disponibile pentru acest an nu au cheltuielile pe rânduri.`}</p>

  const named = receipt.lines.filter((line) => !line.rest)
  const previous = previousText(view)

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
      <figure className="lg:col-span-6">
        {/* The one printed object on the page: mono, as a till prints it. */}
        <div className="mx-auto max-w-md bg-background px-5 pb-9 pt-7 font-mono text-[13px] shadow-[0_1px_0_hsl(var(--border)),0_12px_32px_-12px_rgb(0_0_0/0.18)] ring-1 ring-border sm:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide">{t`Bugetul general consolidat`}</p>
            <p className="mt-1 text-muted-foreground">{t`${view.text} · lei pe locuitor`}</p>
          </div>
          <div className="my-5 border-t border-dashed border-foreground/30" />
          <ul className="space-y-2.5">
            {receipt.lines.map((line, rank) => (
              <li key={line.key} className="flex items-baseline gap-2">
                <span aria-hidden="true" className={cn('size-2 shrink-0 -translate-y-px rounded-[2px]', line.rest && REST_FILL)} style={line.rest ? undefined : toneOf(rank, named.length)} />
                <span className="min-w-0">{line.label}</span>
                <span aria-hidden="true" className="min-w-4 flex-1 -translate-y-[3px] border-b border-dotted border-foreground/30" />
                <Lei lei={line.perResident} />
              </li>
            ))}
          </ul>
          <div className="my-5 border-t border-dashed border-foreground/30" />
          <p className="flex items-baseline justify-between text-base font-semibold">
            <span className="uppercase">{t`Total`}</span>
            <span className="tabular-nums">{leiText(receipt.total)}</span>
          </p>
          {receipt.split ? (
            <div className="mt-5 space-y-1.5 text-muted-foreground">
              <p className="flex items-baseline justify-between gap-4">
                <span>{t`din încasări`}</span>
                <Lei lei={receipt.split.receipts} />
              </p>
              {receipt.split.deficit ? (
                <p className="flex items-baseline justify-between gap-4">
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-[2px]', BORROWED_FILL)} />
                    {t`din deficit bugetar (cash)`}
                  </span>
                  <Lei lei={receipt.split.deficit} />
                </p>
              ) : null}
            </div>
          ) : null}
          <p className="mt-6 text-center text-muted-foreground">
            <span aria-hidden="true">*** </span>
            {t`${leiText(receipt.monthly)} pe lună`}
            <span aria-hidden="true"> ***</span>
          </p>
        </div>
      </figure>
      <div className="lg:col-span-5 lg:col-start-8">
        {/* Beside the receipt, its four largest lines told out; on a phone they would only repeat its first four. */}
        <ol className="hidden space-y-7 lg:block">
          {named.slice(0, 4).map((line) => (
            <li key={line.key}>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">{leiText(line.perResident)}</p>
              <p className="mt-1 text-base font-medium">{line.label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {line.hint}
                {line.change ? ` · ${t`${line.change} față de ${previous}`}` : ''}
              </p>
            </li>
          ))}
        </ol>
        <Note className="lg:mt-8">
          {t`Plățile bugetului general consolidat (toate bugetele publice, fără transferurile dintre ele) ${inPeriod(view.text)}, după natura cheltuielii, din buletinele de execuție ale Ministerului Finanțelor, împărțite la cei ${populationText(view.year) ?? ''} de locuitori (populația rezidentă de la 1 ianuarie). Nu e ce a plătit fiecare: e cât revine, în medie, fiecărui locuitor. Rândurile sunt rotunjite la leu astfel încât să dea totalul.`}
        </Note>
      </div>
    </div>
  )
}

export function ReceiptSection() {
  return (
    <Section id="bon" title={t`Cât a cheltuit statul pe fiecare dintre noi`} lede={t`Cheltuielile statului, împărțite la populația țării, rând cu rând, ca pe un bon.`}>
      <Receipt />
    </Section>
  )
}

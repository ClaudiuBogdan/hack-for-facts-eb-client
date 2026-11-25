import { cn } from '@/lib/utils'
import { leiNumber, leiText, populationText, usePersonSpending, usePersonTotals } from './persoana.data'
import { Fig, HeadFrame } from './persoana.head'
import { BORROWED_FILL, BorrowingSection, DomainsSection, FurtherSection, MinistriesSection, NowSection, RevenueSection, inPeriod, toneOf } from './persoana.sections'
import { Note, PersonPage, Section, usePersonYear, type SectionEntry } from './persoana.shell'

/**
 * Version „Bonul": the year's spending per resident as a printed receipt —
 * every line in lei, the total, and what paid for it (taxes, then the
 * borrowed part). The receipt is the page's one memorable object; the
 * sections under it stay plain.
 */

const SECTIONS: readonly SectionEntry[] = [
  { id: 'bon', nav: 'Bonul' },
  { id: 'venituri', nav: 'De unde' },
  { id: 'domenii', nav: 'Pe domenii' },
  { id: 'ministere', nav: 'Cine' },
  { id: 'imprumut', nav: 'Împrumutul' },
  { id: 'anul', nav: 'Anul în curs' },
]

function Title() {
  const { view } = usePersonYear()
  const totals = usePersonTotals(view)
  return (
    <>
      {view.partial ? `Din ianuarie, statul a cheltuit ` : `În ${view.year}, statul a cheltuit `}
      <Fig>{leiText(totals.spending)}</Fig> pentru fiecare locuitor.
    </>
  )
}

function Lede() {
  const { view } = usePersonYear()
  const totals = usePersonTotals(view)
  const monthly = usePersonTotals(view, 'month')
  const people = populationText(view.year)
  return (
    <p className="mt-6 max-w-[54ch] text-lg leading-relaxed text-muted-foreground">
      Adică <strong className="font-semibold text-foreground tabular-nums">{leiText(monthly.spending)} pe lună</strong>, pentru fiecare dintre cei {people} de locuitori, de la bebeluși la pensionari. Din acești bani, {leiText(totals.revenue)} au venit din taxe,
      contribuții și fonduri europene; restul, {leiText(totals.balance === null ? null : -totals.balance)}, s-a împrumutat.
    </p>
  )
}

// ──────────────────────────────────────────────────────────── the receipt ──

function Receipt() {
  const { view } = usePersonYear()
  const { whole, lines } = usePersonSpending(view)
  const totals = usePersonTotals(view)
  const borrowed = totals.balance !== null && totals.balance < 0 ? -totals.balance : null
  const named = lines.filter((line) => !line.rest).length
  if (whole === null) return <p className="text-sm text-muted-foreground">Buletinul acestui an nu are cheltuielile.</p>
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
      <figure className="lg:col-span-6">
        <div className="relative mx-auto max-w-md bg-background px-6 pb-10 pt-7 font-mono text-[13px] shadow-[0_1px_0_hsl(var(--border)),0_12px_32px_-12px_hsl(var(--foreground)/0.18)] ring-1 ring-border sm:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wide">BUGETUL GENERAL CONSOLIDAT</p>
            <p className="mt-1 text-muted-foreground">
              {view.text} · per locuitor
            </p>
          </div>
          <div className="my-5 border-t border-dashed border-foreground/30" />
          <ul className="space-y-2.5">
            {lines.map((line, rank) => (
              <li key={line.key} className="flex items-baseline gap-2">
                <span aria-hidden="true" className={cn('size-2 shrink-0 translate-y-[-1px] rounded-[2px]', line.rest && 'bg-muted-foreground/40')} style={line.rest ? undefined : toneOf(rank, named).style} />
                <span className="min-w-0 truncate">{line.label}</span>
                <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-foreground/30" />
                <span className="shrink-0 tabular-nums">{leiNumber(line.lei)}</span>
              </li>
            ))}
          </ul>
          <div className="my-5 border-t border-dashed border-foreground/30" />
          <p className="flex items-baseline justify-between text-base font-semibold">
            <span>TOTAL</span>
            <span className="tabular-nums">{leiText(whole)}</span>
          </p>
          <div className="mt-5 space-y-1.5 text-muted-foreground">
            <p className="flex justify-between">
              <span>plătit din taxe și contribuții</span>
              <span className="tabular-nums">{leiNumber(totals.revenue)}</span>
            </p>
            {borrowed ? (
              <p className="flex justify-between">
                <span className="inline-flex items-center gap-2">
                  <span className={cn('size-2 rounded-[2px]', BORROWED_FILL)} />
                  plătit din împrumut
                </span>
                <span className="tabular-nums">{leiNumber(borrowed)}</span>
              </p>
            ) : null}
          </div>
          <p className="mt-6 text-center text-muted-foreground">*** {leiText(whole / 12)} pe lună ***</p>
        </div>
      </figure>
      <div className="lg:col-span-5 lg:col-start-8">
        <ol className="space-y-7">
          {lines
            .filter((line) => !line.rest)
            .slice(0, 4)
            .map((line) => (
              <li key={line.key}>
                <p className="text-3xl font-semibold tracking-tight tabular-nums">{leiText(line.lei)}</p>
                <p className="mt-1 text-base font-medium">{line.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {line.hint}
                  {line.change ? ` · ${line.change} față de anul trecut` : ''}
                </p>
              </li>
            ))}
        </ol>
        <Note>Plățile bugetului general consolidat (toate bugetele publice, fără transferurile dintre ele) {inPeriod(view.text)}, după natura cheltuielii, din buletinele de execuție ale Ministerului Finanțelor, împărțite la populația rezidentă de la 1 ianuarie. Nu e ce a plătit fiecare: e cât revine, în medie, fiecărui locuitor.</Note>
      </div>
    </div>
  )
}

export function PersonBonVariant() {
  return (
    <PersonPage
      sections={SECTIONS}
      head={
        <HeadFrame title={<Title />}>
          <Lede />
        </HeadFrame>
      }
    >
      <Section id="bon" title="Pe ce s-au dus banii" lede="Bonul unui locuitor: cât a cheltuit statul pe fiecare rând, împărțit la toată populația.">
        <Receipt />
      </Section>
      <RevenueSection unit="year" />
      <DomainsSection unit="year" />
      <MinistriesSection unit="year" />
      <BorrowingSection unit="year" />
      <NowSection unit="year" />
      <FurtherSection />
    </PersonPage>
  )
}

import { cn } from '@/lib/utils'
import { leiText, usePersonSpending, usePersonTotals } from './persoana.data'
import { Fig, HeadFrame } from './persoana.head'
import { BorrowingSection, DomainsSection, FurtherSection, MinistriesSection, NowSection, REST_FILL, RevenueSection, inPeriod, toneOf } from './persoana.sections'
import { Note, PersonPage, Section, usePersonYear, type SectionEntry } from './persoana.shell'

/**
 * Version „Pe lună": every amount per resident per month, the scale of a
 * household's own bills. The opening figure is one month's spending as a
 * single bar, then each line as a large monthly amount in a ruled grid.
 */

const SECTIONS: readonly SectionEntry[] = [
  { id: 'luna', nav: 'O lună' },
  { id: 'venituri', nav: 'De unde' },
  { id: 'domenii', nav: 'Pe domenii' },
  { id: 'ministere', nav: 'Cine' },
  { id: 'imprumut', nav: 'Împrumutul' },
  { id: 'anul', nav: 'Anul în curs' },
]

function Title() {
  const { view } = usePersonYear()
  const monthly = usePersonTotals(view, 'month')
  return (
    <>
      Statul cheltuie <Fig>{leiText(monthly.spending)}</Fig> pe lună pentru fiecare locuitor.
    </>
  )
}

function Lede() {
  const { view } = usePersonYear()
  const totals = usePersonTotals(view)
  const monthly = usePersonTotals(view, 'month')
  const borrowed = monthly.balance === null ? null : -monthly.balance
  return (
    <p className="mt-6 max-w-[54ch] text-lg leading-relaxed text-muted-foreground">
      {inPeriod(view.text).replace(/^î/u, 'Î')}: {leiText(totals.spending)} {view.partial ? 'până acum' : 'pe tot anul'}. Dintr-o lună, {leiText(monthly.revenue)} vin din taxe, contribuții și fonduri europene, iar{' '}
      <strong className="font-semibold text-foreground tabular-nums">{leiText(borrowed)}</strong> se împrumută.
    </p>
  )
}

// ────────────────────────────────────────────────────────────── one month ──

function Month() {
  const { view } = usePersonYear()
  const { whole, lines } = usePersonSpending(view, 'month')
  if (whole === null) return <p className="text-sm text-muted-foreground">Buletinul acestui an nu are cheltuielile.</p>
  const named = lines.filter((line) => !line.rest).length
  return (
    <div>
      <div className="flex h-16 w-full overflow-hidden rounded-md" role="img" aria-label={`O lună de cheltuieli per locuitor, ${leiText(whole)}`}>
        {lines.map((line, rank) => (
          <span
            key={line.key}
            title={`${line.label}: ${leiText(line.lei)}`}
            className={cn('h-full border-r-2 border-background last:border-r-0', line.rest && REST_FILL)}
            style={{ width: `${line.share * 100}%`, ...(line.rest ? {} : toneOf(rank, named).style) }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>0 lei</span>
        <span>{leiText(whole)}</span>
      </div>
      <ul className="mt-10 grid grid-cols-1 border-t sm:grid-cols-2 lg:grid-cols-3">
        {lines.map((line, rank) => (
          <li key={line.key} className="border-b py-5 sm:px-5 sm:[&:nth-child(2n+1)]:pl-0 lg:[&:nth-child(2n+1)]:pl-5 lg:[&:nth-child(3n+1)]:pl-0">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className={cn('size-3 shrink-0 rounded-[3px]', line.rest && REST_FILL)} style={line.rest ? undefined : toneOf(rank, named).style} />
              <span className="text-sm font-medium">{line.label}</span>
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{leiText(line.lei)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {line.hint}
              {line.change ? ` · ${line.change}` : ''}
            </p>
          </li>
        ))}
      </ul>
      <Note>
        Plățile bugetului general consolidat {inPeriod(view.text)}, după natura cheltuielii, împărțite la populația rezidentă de la 1 ianuarie și la {view.partial ? 'lunile scurse' : '12 luni'}. Variația: față de aceeași perioadă a anului trecut. E cât revine, în medie, fiecărui locuitor, nu ce a plătit fiecare.
      </Note>
    </div>
  )
}

export function PersonLunaVariant() {
  return (
    <PersonPage
      sections={SECTIONS}
      head={
        <HeadFrame title={<Title />}>
          <Lede />
        </HeadFrame>
      }
    >
      <Section id="luna" title="O lună de buget, pentru un locuitor" lede="Cum se împart cheltuielile unei luni, pentru fiecare locuitor, după natura lor.">
        <Month />
      </Section>
      <RevenueSection unit="month" />
      <DomainsSection unit="month" />
      <MinistriesSection unit="month" />
      <BorrowingSection unit="month" />
      <NowSection unit="month" />
      <FurtherSection />
    </PersonPage>
  )
}

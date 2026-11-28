import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { countyNameRo } from '@/lib/territory-counties'
import { ElectionsLoadError } from '../../catalog/catalog-parts'
import { useScopedMandates } from '../hooks/use-scoped-mandates'
import { useAnalyticsFormat } from '../lib/analytics-format'
import { total } from '../lib/lines'
import type { LocalMandates } from '../lib/mandates'
import { sectionId } from '../lib/analytics-views'
import { Absent, CountyTiles, PhasePair, Waffle } from './analytics-charts'

/**
 * The Mandate view: who holds the mayoralties and the council seats after the
 * local elections of 2024, for the whole country or one county. The national
 * figures leave out the counties the API names as missing (București); a
 * county council's two allocation phases are drawn apart.
 */

const countyName = (code: string) => countyNameRo(code) ?? code

const jump = (section: string) =>
  function JumpLink(label: ReactNode, className: string) {
    return (
      <a href={`#${sectionId('mandate', section)}`} className={className}>
        {label}
      </a>
    )
  }

/** Four figures over the sections; a missing one is left out, never shown as 0. */
export function MandateFigures({ judet, initial }: { readonly judet: string | undefined; readonly initial?: LocalMandates }) {
  const format = useAnalyticsFormat()
  const scoped = useScopedMandates(judet, initial)
  if (scoped.status === 'pending') return <div className="h-36 animate-pulse bg-muted/30" aria-hidden="true" />
  if (scoped.status === 'error') return null
  const where = judet === 'B' ? t`în București` : judet ? t`în județul ${countyName(judet)}` : t`fără București`
  const facts: HubFact[] = [
    ...(scoped.mayors ? [{ key: 'primari', value: total(scoped.mayors), digits: 0, label: t`Primari`, note: where, link: jump('primarii') }] : []),
    ...(scoped.councillors ? [{ key: 'consilieri', value: total(scoped.councillors), digits: 0, label: t`Consilieri locali`, note: where, link: jump('consilieri') }] : []),
    ...(scoped.first
      ? [
          {
            key: 'consiliu',
            value: total(scoped.first),
            digits: 0,
            label: t`Consilieri județeni, prima repartizare`,
            note: scoped.second ? t`a doua repartizare: ${format.n(total(scoped.second))}; nu se adună` : t`a doua repartizare: nu e încă în date`,
            link: jump('consiliu'),
          },
        ]
      : []),
    ...(!judet && scoped.data
      ? [{ key: 'judete', value: scoped.data.counties.filter((county) => county.mayors).length, digits: 0, label: t`Județe cu date`, note: t`din 41 și București`, link: jump('judete') }]
      : []),
  ]
  if (facts.length === 0) return <p className="py-8 text-sm text-muted-foreground">{t`${countyName(judet ?? '')}: mandatele nu sunt încă în date.`}</p>
  return <HubFiguresBand facts={facts} locale={format.locale} plain arrow />
}

/** One section of the view. */
export function MandateSection({
  section,
  judet,
  initial,
  onJudet,
}: {
  readonly section: string
  readonly judet: string | undefined
  readonly initial?: LocalMandates
  readonly onJudet: (code: string | undefined) => void
}) {
  const scoped = useScopedMandates(judet, initial)
  if (scoped.status === 'pending') return <div className="h-48 animate-pulse bg-muted/30" aria-hidden="true" />
  if (scoped.status === 'error') return <ElectionsLoadError onRetry={scoped.retry}>{t`Nu am putut citi mandatele.`}</ElectionsLoadError>
  switch (section) {
    case 'primarii':
      return scoped.mayors ? <Waffle rows={scoped.mayors} per={judet ? 1 : 10} columns={judet ? 25 : 50} /> : <Absent label={t`Primarii`} />
    case 'consilieri':
      return scoped.councillors ? <Waffle rows={scoped.councillors} per={judet ? 10 : 100} columns={judet ? 30 : 50} /> : <Absent label={t`Consilierii locali`} />
    case 'consiliu':
      return judet === 'B' ? <Absent label={t`Consiliul General al Municipiului București`} /> : <PhasePair first={scoped.first} second={scoped.second} />
    case 'judete':
      return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
          <CountyTiles
            counties={new Map((scoped.data?.counties ?? []).map((county) => [county.code, county.mayors]))}
            chosen={judet}
            onChoose={(code) => onJudet(code === judet ? undefined : code)}
          />
          <p className="max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
            {t`Fiecare județ în culoarea partidului cu cele mai multe primării. Un județ fără date e punctat, la fel o egalitate. Alege un județ ca să vezi doar cifrele lui.`}
          </p>
        </div>
      )
    case 'alegeri':
      return (
        <div className="grid gap-6 lg:grid-cols-3">
          <Absent label="2016">{t`Localele din 2016 nu sunt încă în date.`}</Absent>
          <Absent label="2020">{t`Localele din 2020 nu sunt încă în date.`}</Absent>
          {scoped.mayors ? (
            <div className="min-w-0">
              <p className="mb-3 text-sm font-medium text-foreground">2024</p>
              <Waffle rows={scoped.mayors} per={judet ? 1 : 20} columns={25} />
            </div>
          ) : (
            <Absent label="2024" />
          )}
        </div>
      )
    default:
      return null
  }
}

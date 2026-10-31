import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { eventTitle, scopeLabel } from '../shared/labels'
import type { HubData } from '../shared/model'
import type { PlaceIndex } from '../shared/places'
import { PROTOTYPE_HREF, useFormat } from '../shared/parts'
import { OFFICE_ROLES, placesPerEvent, type PlaceSheet } from './model'
import { ContestChip, EventName, OfficeName, PlacePage, editionsCount } from './parts'

/**
 * Variant C — the spine is every election in the catalog, newest first, with
 * what is reported here beside where the source reports it at all: the rows
 * at this code, how many SIRUTA codes the election is reported at, and the
 * scope types its editions use. Absence is explained in place — reported per
 * locality elsewhere, reported only wider, or not in the data — so the page
 * needs no separate band for it.
 */
function ComparisonSpine({ sheet, places, hub }: { readonly sheet: PlaceSheet; readonly places: PlaceIndex; readonly hub: HubData }) {
  const format = useFormat()
  const per = placesPerEvent(places, hub)
  const here = new Map(sheet.events.map((entry) => [entry.event.key, entry]))
  const absent = new Map(sheet.absent.map((entry) => [entry.event.key, entry]))
  const HEAD = 'pb-2 text-left font-normal'
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{t`Fiecare alegere din date: ce e raportat la această localitate și unde raportează sursa`}</caption>
        <thead>
          <tr className="align-bottom">
            <th scope="col" className={cn(HEAD, 'w-2/5 pr-3')}>
              <MonoLabel className="text-muted-foreground">
                <Trans>Alegerea</Trans>
              </MonoLabel>
            </th>
            <th scope="col" className={cn(HEAD, 'px-2')}>
              <MonoLabel className="text-muted-foreground">
                <Trans>Aici</Trans>
              </MonoLabel>
            </th>
            <th scope="col" className={cn(HEAD, 'hidden px-2 text-right md:table-cell')}>
              <MonoLabel className="text-muted-foreground">
                <Trans>Localități raportate</Trans>
              </MonoLabel>
            </th>
            <th scope="col" className={cn(HEAD, 'hidden pl-2 md:table-cell')}>
              <MonoLabel className="text-muted-foreground">
                <Trans>Unde raportează sursa</Trans>
              </MonoLabel>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 border-y border-border/70">
          {hub.events.map((event) => {
            const entry = here.get(event.key)
            const gap = absent.get(event.key)
            const scopes = (entry ? [...new Set(entry.event.editions.flatMap((edition) => edition.counts.map(([, scope]) => scope)))] : (gap?.scopes ?? [])).map((scope) =>
              scopeLabel(scope),
            )
            const reported = per.get(event.key)
            return (
              <tr key={event.key} className={cn('align-top', entry ? 'text-foreground' : 'text-muted-foreground')}>
                <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                  <a href={PROTOTYPE_HREF.election(event.key)} className={cn('block hover:underline hover:underline-offset-4', entry && 'font-semibold')}>
                    <EventName event={event} long />
                  </a>
                  <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
                    {editionsCount(event.editions.length)}
                    <span className="md:hidden"> · {scopes.join(' · ')}</span>
                  </span>
                </th>
                <td className="px-2 py-2.5">
                  {entry ? (
                    <ul className="space-y-1">
                      {OFFICE_ROLES.flatMap((role) => sheet.offices.filter((office) => office.role === role)).map((office) => {
                        const rows = entry.rows.filter((row) => row.office === office.office)
                        if (rows.length === 0) return null
                        return (
                          <li key={office.office} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <OfficeName office={office.office} className={cn('text-sm', office.role === 'own' ? 'text-foreground' : 'text-muted-foreground')} />
                            <span className="flex flex-wrap gap-1">
                              {rows.map((row) => (
                                <ContestChip key={row.contestKey} round={row.round} editionKey={row.edition.key} />
                              ))}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  ) : gap === undefined ? (
                    // E1: the „2014" local editions and 2016 are one election; its rows here sit under the other grouping.
                    <span className="text-xs">
                      <Trans>— aceeași alegere e raportată aici sub cealaltă grupare (✱)</Trans>
                    </span>
                  ) : gap.reason === 'elsewhere' ? (
                    <span className="text-xs">
                      <Trans>— nu la acest cod</Trans>
                    </span>
                  ) : (
                    <span className="text-xs">
                      <Trans>— nu pe localități</Trans>
                    </span>
                  )}
                </td>
                <td className="hidden px-2 py-2.5 text-right tabular-nums md:table-cell">{reported ? format.n(reported) : '—'}</td>
                <td className="hidden py-2.5 pl-2 text-xs md:table-cell">{scopes.join(' · ')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {sheet.calendarMissing.length > 0 ? (
        <div className="mt-8">
          <MonoLabel className="block text-muted-foreground">
            <Trans>Nu sunt în date, după calendarul Transparenta.eu (de confirmat)</Trans>
          </MonoLabel>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {sheet.calendarMissing.map((entry) => (
              <li key={`${entry.family}-${String(entry.year)}-${entry.instance ?? ''}`}>
                {eventTitle({ family: entry.family, year: entry.year, instance: null })}
                {entry.instance === 'annulled'
                  ? ` (${t`anulate`})`
                  : entry.instance === 'rerun'
                    ? ` (${t`reluate`})`
                    : // The calendar holds two 2007 referendums and the data one: the other is the one missing, not the year.
                      entry.loaded > 0
                      ? ` (${t`${format.n((entry.count ?? 1) - entry.loaded)} din ${format.n(entry.count ?? 1)}; cealaltă e în date`})`
                      : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function LocalitateComparatie() {
  return (
    <PlacePage
      spine={{
        id: 'alegeri',
        label: t`Aici și în altă parte`,
        title: <Trans>Ce e raportat aici, față de restul datelor</Trans>,
        lede: (sheet) => (
          <Trans>
            {electionsHere(sheet)} din {sheet.catalogElections} alegeri din date au un rând la acest cod („locale 2014” ✱ e numărată cu 2016). „Localități raportate” numără coduri
            SIRUTA, nu curse.
          </Trans>
        ),
        full: true,
        coversAbsent: true,
        render: (sheet, context) => <ComparisonSpine sheet={sheet} places={context.places} hub={context.hub} />,
      }}
    />
  )
}

function electionsHere(sheet: PlaceSheet): string {
  return sheet.elections === 1 ? t`Una` : String(sheet.elections)
}

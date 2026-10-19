import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowUpRight } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { eventTitle, officeLabel, placeKind, roundLabel, scopeLabel } from '../shared/labels'
import { PROTOTYPE_HREF, sectionIndex, useFormat } from '../shared/parts'
import { placeWord, rowNature, type RowIdentity } from './model'
import { usePageData, type PageData } from './page'
import {
  Band,
  ContestFigures,
  ContestHead,
  ContestMissing,
  ContestSourceLine,
  CurrentMark,
  EditionWord,
  EMPTY,
  LevelsList,
  NatureWord,
  OfficeWord,
  OUT_LINK,
  PlaceRowsTable,
  ResultsEmpty,
  RoundTag,
  RowTable,
  type Figure,
} from './parts'

/**
 * Variant „context": where the row sits is the spine. The head carries a
 * ladder — the election, its edition, the place, the row — and the bands
 * widen from the edition (its sibling editions side by side) to the place
 * (everything reported there in this edition), the office's levels, a short
 * history, and where results will go.
 */
export function ScrutinContext() {
  const data = usePageData()
  if (data.state !== 'ready') return <ContestMissing contestKey={data.read.key} parsed={data.read.parsed} failed={data.state === 'failed'} onRetry={data.read.retry} />
  return <ContextView data={data} />
}

/** The shared `placeKind` misses Bucharest's sectors (the INS kind is „Sectoarele municipiului Bucuresti"); said here until it is fixed there. */
function kindOfSector(kind: string): string | null {
  return kind.startsWith('Secto') ? t`sector` : null
}

/** The ladder at the head's right: four steps from the election to this row, each a link where a page exists. */
function Ladder({ identity }: { readonly identity: RowIdentity }) {
  const place = placeWord(identity)
  const nature = identity.office === null ? null : rowNature(identity.office, identity.scopeType)
  const steps: readonly { readonly key: string; readonly kicker: string; readonly label: ReactNode; readonly href?: string; readonly note?: ReactNode }[] = [
    {
      key: 'event',
      kicker: t`Alegerea`,
      label: identity.event ? eventTitle(identity.event) : t`negrupată`,
      href: identity.event ? PROTOTYPE_HREF.election(identity.event.key) : undefined,
      note: identity.event ? <Trans>{identity.event.editions.length} ediții de date</Trans> : null,
    },
    {
      key: 'edition',
      kicker: t`Ediția de date`,
      label: <EditionWord edition={identity.edition} editionKey={identity.parsed.editionKey} />,
      href: identity.event ? PROTOTYPE_HREF.election(identity.event.key, identity.parsed.editionKey) : undefined,
      note: identity.edition ? <Trans>{identity.edition.contests} rânduri de scrutin</Trans> : <Trans>nu e în fixtură</Trans>,
    },
    {
      key: 'place',
      kicker: identity.scopeType === 'siruta' ? t`Locul de raportare` : scopeLabel(identity.scopeType),
      label: place.code ? <span className="font-mono">{place.text}</span> : place.text,
      href: identity.scopeType === 'siruta' ? PROTOTYPE_HREF.place(identity.scopeKey) : undefined,
      note:
        identity.scopeType === 'siruta' ? (
          identity.ins ? (
            [placeKind(identity.ins.kind), identity.ins.county].filter(Boolean).join(', ')
          ) : (
            <Trans>SIRUTA {identity.scopeKey}</Trans>
          )
        ) : (
          <span className="font-mono">{identity.scopeKey}</span>
        ),
    },
    {
      key: 'row',
      kicker: t`Rândul`,
      label: (
        <span>
          <OfficeWord office={identity.office} />
          <CurrentMark />
        </span>
      ),
      note: nature ? <NatureWord nature={nature} /> : null,
    },
  ]
  return (
    <ol className="divide-y divide-border/70 border-y border-border/70">
      {steps.map((step) => {
        const body = (
          <>
            <MonoLabel className="pt-0.5 text-muted-foreground">{step.kicker}</MonoLabel>
            <span className="min-w-0">
              <span className="block text-sm text-foreground">{step.label}</span>
              {step.note ? <span className="mt-0.5 block text-xs text-muted-foreground">{step.note}</span> : null}
            </span>
            {step.href ? <ArrowUpRight className="size-3.5 self-center text-muted-foreground" aria-hidden="true" /> : <span />}
          </>
        )
        const className = 'grid grid-cols-[7rem_minmax(0,1fr)_auto] items-start gap-x-3 px-1 py-2'
        return (
          <li key={step.key}>
            {step.href ? (
              <a href={step.href} className={cn(className, 'transition-colors hover:bg-muted/40')}>
                {body}
              </a>
            ) : (
              <div className={className}>{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function ContextView({ data }: { readonly data: Extract<PageData, { state: 'ready' }> }) {
  const format = useFormat()
  const { identity, lineage, rowsHere, rollups, siblings, countyRows, pending } = data
  const sections = [
    { id: 'editie', label: t`Ediția` },
    { id: 'loc', label: t`Locul` },
    { id: 'niveluri', label: t`Nivelurile` },
    { id: 'istoric', label: t`Istoric` },
    { id: 'rezultate', label: t`Rezultate` },
  ]
  const index = (id: string) => sectionIndex(sections, id)
  const place = placeWord(identity)
  const officesHere = rowsHere ? new Set(rowsHere.map((row) => row.office)).size : null
  const officeText = identity.office === null ? t`funcția` : (officeLabel(identity.office) ?? identity.office)
  // This row's label, or that it has none; another edition's label (the place index's) is said as such.
  const labelPhrase = !identity.live
    ? t`eticheta rândului se încarcă`
    : identity.scopeLabel
      ? t`rândul îl scrie „${identity.scopeLabel}”`
      : identity.lookupLabel
        ? t`rândul nu are etichetă de loc; indexul locurilor îl scrie „${identity.lookupLabel}”, după prima sursă care îl etichetează`
        : t`rândul nu are etichetă de loc`

  const figures: readonly Figure[] = [
    {
      key: 'editions',
      value: identity.event ? identity.event.editions.length : null,
      label: <Trans>Ediții de date ale alegerii</Trans>,
      note: identity.event ? <Trans>se suprapun; nu se adună</Trans> : <Trans>ediție negrupată</Trans>,
      href: '#editie',
    },
    {
      key: 'rows',
      value: identity.edition?.contests ?? null,
      label: <Trans>Rânduri de scrutin în ediție</Trans>,
      note: <Trans>funcție × loc raportat, nu curse</Trans>,
      href: '#editie',
    },
    {
      key: 'offices',
      value: officesHere,
      pending: rowsHere === undefined,
      label: <Trans>Funcții raportate aici, în ediție</Trans>,
      note: rowsHere === null ? <Trans>indexul leagă doar coduri SIRUTA</Trans> : <Trans>la acest loc de raportare</Trans>,
      href: '#loc',
    },
    { key: 'results', value: null, label: <Trans>Voturi, prezență, candidați</Trans>, note: <Trans>nepublicate încă</Trans>, href: '#rezultate' },
  ]

  return (
    <div className="relative w-full overflow-x-clip bg-background">
      <ContestHead identity={identity} pending={pending} topRight={<RoundTag identity={identity} />} aside={<Ladder identity={identity} />} />
      <HomeSectionNav title={t`Rând de scrutin`} sections={sections} />
      <ContestFigures figures={figures} />

      <Band
        id="editie"
        index={index('editie')}
        title={<Trans>Ediția, lângă celelalte</Trans>}
        lede={
          identity.event ? (
            <Trans>Edițiile de date care descriu {eventTitle(identity.event).toLowerCase()}, una lângă alta, cu rândul acesta acolo unde există. Nu se adună.</Trans>
          ) : (
            <Trans>Ediția nu e grupată într-o alegere de platformă.</Trans>
          )
        }
        wide
      >
        <RowTable
          head={[
            <Trans key="d">Ediția de date</Trans>,
            <Trans key="r">Tur raportat de ediție</Trans>,
            <Trans key="t">Acest rând</Trans>,
            <Trans key="n">Rânduri de scrutin</Trans>,
          ]}
          rows={siblings.map((sibling) => {
            const own = sibling.rows?.find((row) => row.key !== identity.key)
            return {
              key: sibling.edition.key,
              current: sibling.current,
              href: sibling.current
                ? undefined
                : own
                  ? PROTOTYPE_HREF.contest(own.key)
                  : identity.event
                    ? PROTOTYPE_HREF.election(identity.event.key, sibling.edition.key)
                    : undefined,
              cells: [
                <span key="d">
                  <EditionWord edition={sibling.edition} editionKey={sibling.edition.key} />
                  {sibling.current ? <CurrentMark /> : null}
                </span>,
                <span key="r" className="text-muted-foreground">
                  {roundLabel(sibling.edition.round)}
                </span>,
                <span key="t" className={cn(sibling.rows && sibling.rows.length > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                  {sibling.current ? (
                    // The round is known only once the row lands: a placeholder, never „tur neraportat" before then.
                    identity.live ? (
                      roundLabel(identity.round)
                    ) : (
                      <span className="text-muted-foreground" aria-label={t`se încarcă`}>
                        …
                      </span>
                    )
                  ) : sibling.rows === null ? (
                    <Trans>nu se poate lega</Trans>
                  ) : sibling.rows.length === 0 ? (
                    <Trans>fără acest rând</Trans>
                  ) : (
                    sibling.rows.map((row) => roundLabel(row.round)).join(', ')
                  )}
                </span>,
                <span key="n" className="tabular-nums">
                  {format.n(sibling.edition.contests)}
                </span>,
              ],
            }
          })}
          caption={<Trans>✱ = etichetată 2014, date din 2016. „Fără acest rând” spune doar că ediția nu îl are; nu că nu au fost alegeri.</Trans>}
        />
      </Band>

      <Band
        id="loc"
        index={index('loc')}
        title={identity.scopeType === 'siruta' ? <Trans>Locul de raportare</Trans> : <Trans>Locul, așa cum l-a cheiat sursa</Trans>}
        lede={
          identity.scopeType === 'siruta' ? (
            identity.ins ? (
              <Trans>
                {[identity.ins.name, placeKind(identity.ins.kind) ?? kindOfSector(identity.ins.kind), identity.ins.county].filter(Boolean).join(', ')} — în lista INS de azi;{' '}
                {labelPhrase}. Rândurile raportate aici în ediția „{identity.parsed.editionKey}”:
              </Trans>
            ) : (
              <Trans>
                Codul SIRUTA {identity.scopeKey} nu e în lista INS de azi; {labelPhrase}. Rândurile raportate aici în ediția „{identity.parsed.editionKey}”:
              </Trans>
            )
          ) : (
            <Trans>
              {scopeLabel(identity.scopeType)}, cheia sursei „{identity.scopeKey}”{place.asReported ? `, etichetată „${place.text}”` : ''}. API-ul nu filtrează rândurile după loc,
              deci ce a mai raportat sursa aici se vede din pagina ediției.
            </Trans>
          )
        }
        aside={
          identity.scopeType === 'siruta' && identity.ins ? (
            <a href={`/ins/teritorii/${encodeURIComponent(identity.scopeKey)}`} className={OUT_LINK}>
              <Trans>Localitatea la INS</Trans>
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          ) : undefined
        }
        wide
      >
        {rowsHere === undefined ? <HubPending rows={3} /> : rowsHere === null ? null : <PlaceRowsTable rows={rowsHere} currentKey={identity.key} />}
      </Band>

      <Band
        id="niveluri"
        index={index('niveluri')}
        title={<Trans>Nivelurile funcției</Trans>}
        lede={<Trans>Rândurile cu funcția „{officeText}” din aceeași ediție, după tipul locului raportat; un nivel nu e suma celor de sub el.</Trans>}
      >
        {rollups.length === 0 ? (
          <p className={EMPTY}>
            <Trans>Ediția nu e în fixtura catalogului.</Trans>
          </p>
        ) : (
          <LevelsList rollups={rollups} identity={identity} countyRows={countyRows} />
        )}
      </Band>

      <Band
        id="istoric"
        index={index('istoric')}
        title={<Trans>Istoric</Trans>}
        lede={
          data.joinable ? (
            <Trans>Alegerile în care sursele au raportat „{officeText}” la același loc, cu edițiile lor; cea mai nouă prima.</Trans>
          ) : (
            <Trans>Cheia locului e a sursei: rândul nu se leagă de alte ediții.</Trans>
          )
        }
        wide
      >
        {lineage === undefined ? (
          <HubPending rows={4} />
        ) : lineage === null ? (
          <p className={EMPTY}>
            <Trans>Pentru acest tip de loc nu există o cheie comună între ediții; pagina nu potrivește după nume.</Trans>
          </p>
        ) : (
          <RowTable
            head={[<Trans key="e">Alegerea</Trans>, <Trans key="d">Ediții cu acest rând</Trans>, <Trans key="n">Rânduri, pe ediție</Trans>]}
            rows={lineage.map((entry) => {
              const first = entry.editions[0]?.rows[0]
              const current = entry.editions.some((item) => item.rows.some((row) => row.key === identity.key))
              return {
                key: entry.event.key,
                current,
                href: current || !first ? undefined : PROTOTYPE_HREF.contest(first.key),
                cells: [
                  <span key="e" className="text-foreground">
                    {eventTitle(entry.event)}
                    {current ? <CurrentMark /> : null}
                  </span>,
                  <span key="d" className="flex flex-wrap gap-x-4 gap-y-1">
                    {entry.editions.map((item) => (
                      <span key={item.edition.key} className="inline-flex items-baseline gap-x-2">
                        <EditionWord edition={item.edition} editionKey={item.edition.key} />
                        <span className="text-xs text-muted-foreground">{item.rows.map((row) => roundLabel(row.round)).join(', ')}</span>
                      </span>
                    ))}
                  </span>,
                  // Each edition's own count, in the editions' order: the editions of one election are never added.
                  <span key="n" className="tabular-nums">
                    {entry.editions.map((item) => format.n(item.rows.length)).join(' · ')}
                  </span>,
                ],
              }
            })}
            caption={
              <Trans>
                Un rând pe ediție și tur; numărul e al fiecărei ediții, în ordinea lor, iar edițiile aceleiași alegeri nu se adună. ✱ = etichetată 2014, date din 2016. Rândul se
                deschide pe prima ediție a alegerii.
              </Trans>
            }
          />
        )}
      </Band>

      <Band id="rezultate" index={index('rezultate')} title={<Trans>Rezultate</Trans>} lede={<Trans>Ce va apărea aici când API-ul le va servi, cu statutul fiecărei cifre.</Trans>}>
        <ResultsEmpty />
      </Band>

      <RuledFrame className="py-8">
        <ContestSourceLine identity={identity} />
      </RuledFrame>
    </div>
  )
}

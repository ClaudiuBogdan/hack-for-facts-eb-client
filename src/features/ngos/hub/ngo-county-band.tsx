import { useMemo } from 'react'
import type { LinkOptions } from '@tanstack/react-router'
import { msg, plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { HubCountyBand, type HubCountyBandDefinition } from '@/features/statistics/components/hub/hub-county-band'
import type { NgoHubLayerKey } from '@/schemas/ngos'
import { formatNgoNumber } from './ngo-format'
import { REGISTRY_STATUS_VALUE, registryCountyLayer, registrySearch } from './registry-figures'
import type { NgoRegistrySummary } from './registry-summary-types'

/**
 * The counties on the INS and procurement hubs' county band — the map beside
 * the ranking — over the registry: its NGOs per 10,000 residents, how many
 * are registered, or the year's new ones per 100,000. Coloured in the
 * choropleth ramp's five blues, as the NGO hub has always drawn its
 * counties: more or fewer, the national rate marked on the legend. A county
 * opens the registry on its NGOs where the registry is on; without it, the
 * counties are named shapes and plain rows.
 */
export function NgoCountyBand({
  summary,
  layerKey,
  registry,
}: {
  readonly summary: NgoRegistrySummary
  readonly layerKey: NgoHubLayerKey
  readonly registry: boolean
}) {
  const { i18n } = useLingui()
  const layer = useMemo(() => registryCountyLayer(summary, layerKey), [summary, layerKey])
  const year = summary.year
  const unplaced = summary.noCounty
  // Resolved here, through `i18n`, so a locale switch re-renders the band.
  const definition = useMemo<HubCountyBandDefinition>(() => {
    const population = i18n._(msg`Populația: INS, 1 ianuarie ${year}.`)
    const source = i18n._(msg`Sursa: Registrul național ONG.`)
    if (layerKey === 'total') {
      const registered = summary.status.registered
      // Grouped as the page's figures are („3.795"); `#` groups the plural's own count.
      const noCounty = formatNgoNumber(unplaced)
      return {
        legend: i18n._(msg`ONG-uri înregistrate`),
        unit: i18n._(msg`ONG-uri`),
        // Agreed with the figure, as Romanian counts: „1 ONG", „12 ONG-uri", „2.653 de ONG-uri".
        countUnit: (count: number) => plural(count, { one: 'ONG', few: 'ONG-uri', other: 'de ONG-uri' }),
        digits: 0,
        ramp: 'steps',
        caveat: plural(registered, {
          one: `Un ONG înregistrat în țară, dintre care ${noCounty} fără județ în registru.`,
          few: `# ONG-uri înregistrate în țară, dintre care ${noCounty} fără județ în registru.`,
          other: `# de ONG-uri înregistrate în țară, dintre care ${noCounty} fără județ în registru.`,
        }),
        source,
      }
    }
    return layerKey === 'densitate'
      ? {
          legend: i18n._(msg`ONG-uri înregistrate`),
          unit: i18n._(msg`la 10.000 de locuitori`),
          digits: 1,
          ramp: 'steps',
          caveat: `${plural(unplaced, {
            one: 'Media țării cuprinde și # ONG fără județ în registru.',
            few: 'Media țării cuprinde și cele # ONG-uri fără județ în registru.',
            other: 'Media țării cuprinde și cele # de ONG-uri fără județ în registru.',
          })} ${population}`,
          source,
        }
      : {
          legend: i18n._(msg`ONG-uri noi în ${year}`),
          unit: i18n._(msg`la 100.000 de locuitori`),
          digits: 1,
          ramp: 'steps',
          caveat: `${i18n._(msg`După anul din numărul de registru; media țării cuprinde și intrările fără județ.`)} ${population}`,
          source,
        }
  }, [layerKey, year, unplaced, summary.status.registered, i18n])
  const countyLink = useMemo(() => {
    if (!registry) return null
    const spelling = new Map(summary.counties.map((county) => [county.code, county.source]))
    // The registry's own spelling of the county: its filter matches it exactly.
    return (code: string): LinkOptions => ({
      to: '/ngos/registry',
      search: registrySearch({
        county: spelling.get(code) ?? '',
        ...(layerKey === 'noi' ? {} : { status: REGISTRY_STATUS_VALUE.registered }),
      }),
    })
  }, [registry, summary.counties, layerKey])
  return <HubCountyBand key={layer.code} layer={layer} definition={definition} countyLink={countyLink} />
}

import { useMemo } from 'react'
import type { LinkOptions } from '@tanstack/react-router'
import { msg, plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { HubCountyBand, type HubCountyBandDefinition } from '@/features/statistics/components/hub/hub-county-band'
import type { NgoHubLayerKey } from '@/schemas/ngos'
import { REGISTRY_STATUS_VALUE, registryCountyLayer, registrySearch } from './registry-figures'
import type { NgoRegistrySummary } from './registry-summary-types'

/**
 * The counties on the INS and procurement hubs' county band — the map beside
 * the ranking, coloured against the national rate — over the registry: its
 * NGOs per 10,000 residents, or the year's new ones per 100,000. A county
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
    return layerKey === 'densitate'
      ? {
          legend: i18n._(msg`ONG-uri înregistrate`),
          unit: i18n._(msg`la 10.000 de locuitori`),
          digits: 1,
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
          caveat: `${i18n._(msg`După anul din numărul de registru; media țării cuprinde și intrările fără județ.`)} ${population}`,
          source,
        }
  }, [layerKey, year, unplaced, i18n])
  const countyLink = useMemo(() => {
    if (!registry) return null
    const spelling = new Map(summary.counties.map((county) => [county.code, county.source]))
    // The registry's own spelling of the county: its filter matches it exactly.
    return (code: string): LinkOptions => ({
      to: '/ong-uri/registru',
      search: registrySearch({
        county: spelling.get(code) ?? '',
        ...(layerKey === 'densitate' ? { status: REGISTRY_STATUS_VALUE.registered } : {}),
      }),
    })
  }, [registry, summary.counties, layerKey])
  return <HubCountyBand key={layer.code} layer={layer} definition={definition} countyLink={countyLink} />
}

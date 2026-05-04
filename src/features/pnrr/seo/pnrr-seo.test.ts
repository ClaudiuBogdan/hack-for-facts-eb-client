import { describe, expect, it } from 'vitest'
import type { RawPnrrProject } from '@/schemas/pnrr'
import { parsePnrrSearchString } from '@/schemas/pnrr'
import {
  buildPnrrRouteHead,
  buildPnrrSeoSnapshotFromRawProjects,
  buildPnrrSeoSnapshotSearchKey,
  buildPnrrShareImageUrl,
  normalizePnrrSeoSnapshotSearch,
} from './pnrr-seo'

type HeadMetaEntry = {
  readonly title?: string
  readonly name?: string
  readonly property?: string
  readonly content?: string
}

function makeRaw(overrides: Partial<RawPnrrProject> = {}): RawPnrrProject {
  return {
    'Titlu Proiect': 'Modernizare infrastructura scolara',
    'Nume Beneficiar': 'MUNICIPIUL TEST',
    CUI: '12345678',
    'County': 'Cluj',
    'Sursă Finanțare': 'grant',
    'Valoare (EUR)': 1_000_000,
    'Progres Tehnic': '50%',
    'Progres Financiar': '40%',
    'Cod Componentă': 'C10',
    'Cod Măsură': 'I1',
    Localitate: 'Test',
    CRI: 'MDLPA',
    ...overrides,
  }
}

function getMetaContent(
  meta: readonly HeadMetaEntry[],
  key: { readonly name?: string; readonly property?: string },
): string | undefined {
  const entry = meta.find((item) => {
    if (key.name) return item.name === key.name
    if (key.property) return item.property === key.property
    return false
  })

  return entry?.content
}

describe('pnrr-seo', () => {
  it('builds compact default overview stats from raw projects', () => {
    const snapshot = buildPnrrSeoSnapshotFromRawProjects({
      rawProjects: [
        makeRaw({
          'Progres Tehnic': '100%',
          'Progres Financiar': '',
        }),
        makeRaw({
          'Titlu Proiect': 'Autostrada test',
          'Sursă Finanțare': 'loan',
          'Valoare (EUR)': 3_000_000,
          'Progres Tehnic': '0%',
          'Progres Financiar': '0%',
        }),
      ],
    })

    expect(snapshot.projectCount).toBe(2)
    expect(snapshot.totalValueEur).toBe(4_000_000)
    expect(snapshot.completedCount).toBe(1)
    expect(snapshot.completedValueEur).toBe(1_000_000)
    expect(snapshot.loanTotalEur).toBe(3_000_000)
    expect(snapshot.loanPercent).toBe(75)
    expect(snapshot.missingFinancialProgressCount).toBe(1)
    expect(snapshot.missingFinancialProgressPercent).toBe(50)
  })

  it('builds a compact snapshot from raw projects and applies filters', () => {
    const snapshot = buildPnrrSeoSnapshotFromRawProjects({
      rawProjects: [
        makeRaw(),
        makeRaw({
          'Titlu Proiect': 'Spital regional',
          'County': 'Iasi',
          'Valoare (EUR)': 5_000_000,
          'Cod Componentă': 'C12',
          'Progres Tehnic': '100%',
          'Progres Financiar': '50%',
        }),
      ],
      search: {
        components: ['C12'],
      },
    })

    expect(snapshot.projectCount).toBe(1)
    expect(snapshot.totalValueEur).toBe(5_000_000)
    expect(snapshot.completedCount).toBe(1)
    expect(snapshot.completedValueEur).toBe(5_000_000)
    expect(snapshot.loanTotalEur).toBe(0)
    expect(snapshot.missingFinancialProgressCount).toBe(0)
    expect(snapshot.anomalyCount).toBe(1)
    expect(snapshot.topComponents[0]).toMatchObject({
      id: 'C12',
      count: 1,
      valueEur: 5_000_000,
    })
    expect(snapshot.topCounties[0]).toMatchObject({
      id: 'Iași',
      count: 1,
    })
  })

  it('builds share image URLs with sanitized filter query params', () => {
    const url = buildPnrrShareImageUrl({
      siteUrl: 'https://transparenta.eu',
      search: {
        components: ['C7', 'C10'],
        onlyAnomalies: true,
        page: 3,
        mapLat: 45,
      },
    })
    const parsedUrl = new URL(url)

    expect(parsedUrl.pathname).toBe('/pnrr/share-image.png')
    expect(parsedUrl.searchParams.get('components')).toBe('["C7","C10"]')
    expect(parsedUrl.searchParams.get('onlyAnomalies')).toBe('true')
    expect(parsedUrl.searchParams.get('v')).toBe('20260430-ron5-official-total')
    expect(parsedUrl.searchParams.has('page')).toBe(false)
    expect(parsedUrl.searchParams.has('mapLat')).toBe(false)
  })

  it('round-trips primitive-looking text filters in share image URLs', () => {
    const url = buildPnrrShareImageUrl({
      siteUrl: 'https://transparenta.eu',
      search: {
        search: '2024',
        beneficiarySearch: 'true',
        onlyAnomalies: true,
      },
    })
    const parsedSearch = parsePnrrSearchString(new URL(url).search)

    expect(parsedSearch).toMatchObject({
      search: '2024',
      beneficiarySearch: 'true',
      onlyAnomalies: true,
    })
  })

  it('builds stable keys only from snapshot-affecting filters', () => {
    const first = buildPnrrSeoSnapshotSearchKey({
      components: ['C10', 'C7'],
      view: 'overview',
      page: 1,
      sortBy: 'value',
      mapLat: 45,
      mapLng: 24,
      mapZoom: 7,
    })
    const second = buildPnrrSeoSnapshotSearchKey({
      components: ['C7', 'C10'],
      view: 'projects',
      page: 5,
      sortBy: 'title',
    })

    expect(first).toBe(second)
    expect(normalizePnrrSeoSnapshotSearch({ includeNational: true })).toEqual({})
    expect(normalizePnrrSeoSnapshotSearch({ includeNational: false })).toEqual({
      includeNational: false,
    })
  })

  it('builds route-specific head metadata and JSON-LD', () => {
    const snapshot = buildPnrrSeoSnapshotFromRawProjects({
      rawProjects: [makeRaw()],
    })
    const head = buildPnrrRouteHead({
      siteUrl: 'https://transparenta.eu',
      snapshot,
      search: {
        onlyAnomalies: true,
      },
      locale: 'ro',
    })

    expect(head.links).toEqual([
      { rel: 'canonical', href: 'https://transparenta.eu/pnrr' },
    ])
    expect(getMetaContent(head.meta, { name: 'robots' })).toBe('index,follow')
    expect(getMetaContent(head.meta, { property: 'og:url' })).toBe(
      'https://transparenta.eu/pnrr',
    )
    expect(getMetaContent(head.meta, { property: 'og:image' })).toContain(
      '/pnrr/share-image.png?onlyAnomalies=true',
    )
    expect(getMetaContent(head.meta, { property: 'og:image:width' })).toBe(
      '1200',
    )
    expect(getMetaContent(head.meta, { property: 'og:locale' })).toBe('ro_RO')
    expect(getMetaContent(head.meta, { name: 'twitter:image' })).toContain(
      '/pnrr/share-image.png?onlyAnomalies=true',
    )

    const scripts = head.scripts.map((script) => JSON.parse(script.children))
    expect(scripts.map((script) => script['@type'])).toEqual([
      'Dataset',
      'WebPage',
    ])
    expect(scripts[0].dateModified).toBe(snapshot.lastUpdated)
  })

  it('localizes route head metadata for English', () => {
    const snapshot = buildPnrrSeoSnapshotFromRawProjects({
      rawProjects: [makeRaw()],
    })
    const head = buildPnrrRouteHead({
      siteUrl: 'https://transparenta.eu',
      snapshot,
      locale: 'en',
    })
    const scripts = head.scripts.map((script) => JSON.parse(script.children))

    expect(head.meta.find((entry) => entry.title)?.title).toBe(
      'PNRR - National Recovery and Resilience Plan | Transparenta.eu',
    )
    expect(getMetaContent(head.meta, { name: 'description' })).toContain(
      'Interactive dashboard',
    )
    expect(getMetaContent(head.meta, { property: 'og:locale' })).toBe('en_US')
    expect(getMetaContent(head.meta, { property: 'og:image:alt' })).toBe(
      'Transparenta.eu preview for Romania PNRR projects',
    )
    expect(scripts[0].name).toBe('Romania PNRR projects')
    expect(scripts[0].measurementTechnique).toContain('projects analyzed')
  })
})

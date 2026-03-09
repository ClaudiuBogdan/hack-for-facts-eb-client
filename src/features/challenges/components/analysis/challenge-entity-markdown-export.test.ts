import { describe, expect, it } from 'vitest'
import {
  buildChallengeEntityAnalysisMarkdown,
  buildChallengeEntityItemMarkdown,
  type ChallengeEntityMarkdownGroupedSectionContext,
  type ChallengeEntityMarkdownExportContext,
} from './challenge-entity-markdown-export'
import type { ExecutionLineItem } from '@/lib/api/entities'

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function buildBaseContext(): ChallengeEntityMarkdownExportContext {
  return {
    locale: 'ro',
    entity: {
      name: 'Primăria Sibiu',
      cui: '12345678',
      countyName: 'Județul Sibiu',
      population: 134309,
    },
    filters: {
      year: 2025,
      reportType: 'PRINCIPAL_AGGREGATED',
      normalization: 'total',
      currency: 'RON',
      inflationAdjusted: false,
      treemapAccountCategory: 'ch',
      budgetTotal: 1234567.89,
      expenseType: 'functionare',
      treemapPrimary: 'fn',
      currentTreemapPrimary: 'fn',
      treemapDepth: 'subchapter',
      breadcrumbs: [
        {
          code: '51',
          label: 'Autorități publice',
          type: 'fn',
        },
        {
          code: '51.01',
          label: 'Autorități executive',
          type: 'fn',
        },
      ],
      groupedSearchTerm: 'fn:51.01',
      excludedEconomicCodes: ['51'],
      amountRange: {
        minValue: 100,
        maxValue: 900,
        selectedMin: 120,
        selectedMax: 640,
      },
    },
    treemap: {
      title: 'Distribuția Cheltuielilor',
      subtitle: 'Cum s-au cheltuit banii',
      visibleNodes: [
        {
          code: '51.01',
          name: 'Autorități executive',
          value: 640,
          isLeaf: true,
          children: [],
        },
      ],
    },
    grouped: {
      title: 'Cheltuieli',
      groupBy: 'fn',
      depth: 'subchapter',
      baseTotal: 1234567.89,
      visibleItems: {
        kind: 'subchapter',
        codePrefix: 'fn',
        groups: [
          {
            code: '51.01',
            name: 'Autorități executive',
            totalAmount: 640,
            functionals: [
              {
                code: '51.01.03',
                name: 'Autorități executive',
                totalAmount: 640,
                economics: [
                  {
                    code: '10.01',
                    name: 'Cheltuieli de personal',
                    amount: 500,
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  }
}

function buildBasePageContext() {
  const { grouped, ...pageContext } = buildBaseContext()
  return pageContext
}

const itemScopedLineItems: ExecutionLineItem[] = [
  {
    line_item_id: 'line-1',
    account_category: 'ch',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '51.01.03',
      functional_name: 'Autorități executive',
    },
    economicClassification: {
      economic_code: '10.01',
      economic_name: 'Cheltuieli de personal',
    },
    ytd_amount: 500,
    quarterly_amount: 500,
    monthly_amount: 500,
    amount: 500,
  },
  {
    line_item_id: 'line-2',
    account_category: 'ch',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '51.01.04',
      functional_name: 'Alte servicii executive',
    },
    economicClassification: {
      economic_code: '20.01.01',
      economic_name: 'Furnituri de birou',
    },
    ytd_amount: 140,
    quarterly_amount: 140,
    monthly_amount: 140,
    amount: 140,
  },
  {
    line_item_id: 'line-3',
    account_category: 'ch',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '65.02.01',
      functional_name: 'Învățământ preșcolar',
    },
    economicClassification: {
      economic_code: '10.01.01',
      economic_name: 'Salarii de bază',
    },
    ytd_amount: 180,
    quarterly_amount: 180,
    monthly_amount: 180,
    amount: 180,
  },
]

const groupedContext: ChallengeEntityMarkdownGroupedSectionContext = {
  title: 'Cheltuieli',
  groupBy: 'fn',
  depth: 'paragraph',
  baseTotal: 1234567.89,
}

describe('buildChallengeEntityAnalysisMarkdown', () => {
  it('builds a Romanian prompt with entity context, active filters, visible categories, and grouped items', () => {
    const rawMarkdown = buildChallengeEntityAnalysisMarkdown(buildBaseContext())
    const markdown = normalizeWhitespace(rawMarkdown)

    expect(markdown).toContain('# Analiza bugetului local')
    expect(markdown).toContain('## Context UAT')
    expect(markdown).toContain('Primăria Sibiu')
    expect(markdown).toContain('`12345678`')
    expect(markdown).toContain('Populație: 134.309 locuitori')
    expect(markdown).toContain('## Rol de sistem')
    expect(markdown).toContain('Ești un analist senior de finanțe publice locale')
    expect(markdown).toContain(
      'Tip raport: Execuție bugetară agregată la nivel de ordonator principal',
    )
    expect(markdown).toContain('Total buget: 1,234,567.89 RON')
    expect(markdown).toContain('Tip cheltuială: Operațiuni')
    expect(markdown).toContain('Cale selectată: `FN:51` Autorități publice -> `FN:51.01` Autorități executive')
    expect(markdown).toContain('Căutare în elementele grupate: `fn:51.01`')
    expect(markdown).toContain(
      'Filtru de sumă pentru categoriile vizibile: 120 RON -> 640 RON (100 RON -> 900 RON)',
    )
    expect(markdown).toContain('## Categorii vizibile în distribuție')
    expect(markdown).toContain('`FN:51.01` Autorități executive: 640 RON')
    expect(markdown).toContain('## Elemente grupate vizibile')
    expect(markdown).toContain('Structură grupată: Funcțională · Subcapitol')
    expect(markdown).toContain('`FN:51.01.03` Autorități executive: 640 RON')
    expect(markdown).toContain('`EC:10.01` Cheltuieli de personal: 500 RON')
    expect(rawMarkdown.toLowerCase()).not.toContain('treemap')
    expect(rawMarkdown.indexOf('## Rol de sistem')).toBeLessThan(
      rawMarkdown.indexOf('## Context UAT'),
    )
    expect(rawMarkdown.trimEnd().endsWith('Întrebarea mea specifică:')).toBe(true)
  })

  it('builds an English prompt in the active page language', () => {
    const rawMarkdown = buildChallengeEntityAnalysisMarkdown({
      ...buildBaseContext(),
      locale: 'en',
      entity: {
        name: 'Cluj-Napoca City Hall',
        cui: '87654321',
        countyName: 'Cluj',
        population: 286598,
      },
      filters: {
        ...buildBaseContext().filters,
        normalization: 'per_capita',
        inflationAdjusted: true,
        budgetTotal: 1234.5,
      },
      treemap: {
        title: 'Spending breakdown',
        subtitle: 'How the money was spent',
        visibleNodes: [
          {
            code: '65',
            name: 'Education',
            value: 240,
            isLeaf: false,
            children: [],
          },
        ],
      },
    })
    const markdown = normalizeWhitespace(rawMarkdown)

    expect(markdown).toContain('# Local Budget Analysis')
    expect(markdown).toContain('## UAT Context')
    expect(markdown).toContain('Population: 286,598 inhabitants')
    expect(markdown).toContain('## System Role')
    expect(markdown).toContain('You are a senior local public-finance analyst')
    expect(markdown).toContain(
      'Report type: Aggregated budget execution at main-creditor level',
    )
    expect(markdown).toContain('Normalization: Per capita')
    expect(markdown).toContain('Budget total: 1,234.50 RON/capita')
    expect(markdown).toContain('Inflation adjusted: Yes')
    expect(markdown).toContain('## Visible Category Breakdown')
    expect(markdown).toContain('`FN:65` Education: 240 RON/capita')
    expect(markdown).toContain('## Model Instructions')
    expect(rawMarkdown.toLowerCase()).not.toContain('treemap')
    expect(rawMarkdown.indexOf('## System Role')).toBeLessThan(
      rawMarkdown.indexOf('## UAT Context'),
    )
    expect(rawMarkdown.trimEnd().endsWith('My specific request:')).toBe(true)
  })

  it('renders functional paragraph exports with nested economic items', () => {
    const markdown = normalizeWhitespace(
      buildChallengeEntityAnalysisMarkdown({
        ...buildBaseContext(),
        grouped: {
          title: 'Cheltuieli',
          groupBy: 'fn',
          depth: 'paragraph',
          baseTotal: 180,
          visibleItems: {
            kind: 'functional',
            groups: [
              {
                code: '65.02.01',
                name: 'Învățământ preșcolar',
                totalAmount: 180,
                economics: [
                  {
                    code: '20.01.01',
                    name: 'Furnituri de birou',
                    amount: 180,
                  },
                ],
              },
            ],
          },
        },
      }),
    )

    expect(markdown).toContain('Structură grupată: Funcțională · Paragraf')
    expect(markdown).toContain('`FN:65.02.01` Învățământ preșcolar: 180 RON')
    expect(markdown).toContain('`EC:20.01.01` Furnituri de birou: 180 RON')
  })

  it('renders economic paragraph exports and category breakdown unavailability messages', () => {
    const markdown = normalizeWhitespace(
      buildChallengeEntityAnalysisMarkdown({
        ...buildBaseContext(),
        filters: {
          ...buildBaseContext().filters,
          treemapAccountCategory: 'vn',
          treemapPrimary: 'fn',
          currentTreemapPrimary: 'ec',
          expenseType: undefined,
          groupedSearchTerm: undefined,
        },
        treemap: {
          title: 'Distribuția Veniturilor',
          subtitle: 'Cum sunt grupate veniturile',
          visibleNodes: [],
          unavailableReason: 'Veniturile nu au cod economic.',
        },
        grouped: {
          title: 'Venituri',
          groupBy: 'ec',
          depth: 'paragraph',
          baseTotal: 240,
          visibleItems: {
            kind: 'subchapter',
            codePrefix: 'ec',
            groups: [
              {
                code: '20.01.01',
                name: 'Impozit exemplu',
                totalAmount: 240,
                functionals: [
                  {
                    code: '00.01.01',
                    name: 'Venituri curente',
                    totalAmount: 240,
                    economics: [],
                  },
                ],
              },
            ],
          },
        },
      }),
    )

    expect(markdown).toContain('Distribuția pe categorii indisponibilă: Veniturile nu au cod economic.')
    expect(markdown).toContain('Structură grupată: Economică · Paragraf')
    expect(markdown).toContain('`EC:20.01.01` Impozit exemplu: 240 RON')
    expect(markdown).toContain('`FN:00.01.01` Venituri curente: 240 RON')
  })

  it('computes visible treemap totals from magnitudes for signed nodes', () => {
    const markdown = normalizeWhitespace(
      buildChallengeEntityAnalysisMarkdown({
        ...buildBaseContext(),
        treemap: {
          title: 'Distribuția Cheltuielilor',
          subtitle: 'Cum s-au cheltuit banii',
          visibleNodes: [
            {
              code: '10.01',
              name: 'Corecții salariale',
              value: -40,
              isLeaf: true,
              children: [],
            },
            {
              code: '20.01',
              name: 'Bunuri și servicii',
              value: 100,
              isLeaf: true,
              children: [],
            },
          ],
        },
      }),
    )

    expect(markdown).toContain('Total vizibil în categorii: 140 RON')
    expect(markdown).toContain('`FN:10.01` Corecții salariale: -40 RON (28,57%)')
    expect(markdown).toContain('`FN:20.01` Bunuri și servicii: 100 RON (71,43%)')
  })

  it('builds an item-scoped prompt for a grouped chapter subtree', () => {
    const markdown = normalizeWhitespace(
      buildChallengeEntityItemMarkdown({
        pageContext: buildBasePageContext(),
        groupedContext: {
          ...groupedContext,
          depth: 'chapter',
        },
        request: {
          subjectLabel: 'Autorități publice',
          path: [{ type: 'fn', code: '51' }],
        },
        lineItems: itemScopedLineItems,
      }),
    )

    expect(markdown).toContain('## Element selectat')
    expect(markdown).toContain('Element: `FN:51` Autorități publice')
    expect(markdown).toContain('Total buget: 1,234,567.89 RON')
    expect(markdown).toContain('Valoare selectată: 640 RON')
    expect(markdown).toContain('## Subelemente detaliate')
    expect(markdown).toContain('`FN:51.01` Autorități executive')
  })

  it('builds an item-scoped prompt for a grouped subchapter subtree', () => {
    const markdown = normalizeWhitespace(
      buildChallengeEntityItemMarkdown({
        pageContext: buildBasePageContext(),
        groupedContext,
        request: {
          subjectLabel: 'Autorități executive',
          path: [{ type: 'fn', code: '51.01' }],
        },
        lineItems: itemScopedLineItems,
      }),
    )

    expect(markdown).toContain('Path complet: `FN:51.01`')
    expect(markdown).toContain('`FN:51.01.03` Autorități executive: 500 RON')
    expect(markdown).toContain('`FN:51.01.04` Alte servicii executive: 140 RON')
  })

  it('builds an item-scoped prompt for a grouped functional/economic leaf subtree', () => {
    const markdown = normalizeWhitespace(
      buildChallengeEntityItemMarkdown({
        pageContext: buildBasePageContext(),
        groupedContext,
        request: {
          subjectLabel: 'Învățământ preșcolar',
          path: [{ type: 'fn', code: '65.02.01' }],
        },
        lineItems: itemScopedLineItems,
      }),
    )

    expect(markdown).toContain('Element: `FN:65.02.01` Învățământ preșcolar')
    expect(markdown).toContain('`EC:10.01.01` Salarii de bază: 180 RON')
  })

  it('builds an item-scoped prompt for a treemap node with a full typed path', () => {
    const markdown = normalizeWhitespace(
      buildChallengeEntityItemMarkdown({
        pageContext: {
          ...buildBasePageContext(),
          locale: 'en',
        },
        groupedContext: {
          ...groupedContext,
          groupBy: 'ec',
        },
        request: {
          subjectLabel: 'Cheltuieli de personal',
          path: [
            { type: 'fn', code: '51.01.03' },
            { type: 'ec', code: '10.01' },
          ],
        },
        lineItems: itemScopedLineItems,
      }),
    )

    expect(markdown).toContain('Full path: `FN:51.01.03` -> `EC:10.01`')
    expect(markdown).toContain('Selected value: 500 RON')
    expect(markdown).toContain('None')
  })

  it('uses the displayed classification code for collapsed mixed-path rows', () => {
    const markdown = normalizeWhitespace(
      buildChallengeEntityItemMarkdown({
        pageContext: buildBasePageContext(),
        groupedContext: {
          ...groupedContext,
          groupBy: 'ec',
        },
        request: {
          subjectLabel: 'Salarii de bază',
          path: [
            { type: 'ec', code: '10.01.01' },
            { type: 'fn', code: '65.02' },
          ],
          displayedItem: { type: 'ec', code: '10.01.01' },
        },
        lineItems: itemScopedLineItems,
      }),
    )

    expect(markdown).toContain('Element: `EC:10.01.01` Salarii de bază')
    expect(markdown).toContain('Path complet: `EC:10.01.01` -> `FN:65.02`')
  })
})

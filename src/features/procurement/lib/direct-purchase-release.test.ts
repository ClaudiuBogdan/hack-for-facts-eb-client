import { describe, expect, it } from 'vitest'
import { contextGapOf, NO_NAMES, type DpNames } from './direct-purchase-model'
import { mapReleasePurchase, releaseOutcomeOf } from './direct-purchase-release'
import { COMPANY, RELEASE_CASES, RELEASE_ID, SERVED_TEXT, rawReleaseDetail, rawReleaseItem, servedItemText } from './direct-purchase-release.fixture'

/**
 * A release-1 purchase as the page's sheet: its money as the serving contract
 * says it, its supplier under D6, and nothing the release does not serve.
 */

const names = (over: Partial<DpNames> = {}): DpNames => ({ ...NO_NAMES, ...over })

describe('mapReleasePurchase — the contract example rows', () => {
  it('counted as reported', () => {
    const purchase = mapReleasePurchase(RELEASE_CASES.countedAsReported(), NO_NAMES)
    expect(purchase).toMatchObject({ id: RELEASE_ID, code: 'DA37709621', family: 'catalog', outcome: { kind: 'accepted' }, value: 12500, unverifiedValue: null, estimate: null })
    expect(purchase.money).toEqual({ kind: 'counted', value: 12500, reported: 12500, symbolic: false })
    expect(purchase.dataAsOf).toBe('2026-11-18T03:10:00.123456Z')
    expect(purchase.listedNow).toBe(true)
  })

  it('corrected: the counted value is the correction; the line stays as reported', () => {
    const purchase = mapReleasePurchase(RELEASE_CASES.corrected(), NO_NAMES)
    expect(purchase.value).toBe(3150)
    expect(purchase.money).toMatchObject({ kind: 'corrected', value: 3150, reported: 3150000, rule: { code: 'quantity_unit_mix', effect: 'correct' } })
    expect(purchase.detail?.items[0]).toMatchObject({ line: 3150000, unitPrice: 8400, catalogPrice: 8.4 })
    // The lines are never summed against the value.
    expect(purchase.detail?.itemsTotal).toBeNull()
  })

  it.each([
    ['excludedApproximate', 1680000, 'approximate_only'],
    ['excludedAboveSpending', 358324000, 'exceeds_buyer_spending'],
  ] as const)('%s: no counted value, the reported one kept, the reason and the rule', (key, reported, rule) => {
    const purchase = mapReleasePurchase(RELEASE_CASES[key](), NO_NAMES)
    expect(purchase.value).toBeNull()
    expect(purchase.money).toMatchObject({ kind: 'not-counted', reported, reason: { code: 'reviewed_entry_error' }, rule: { code: rule, effect: 'exclude' } })
  })

  it('an open review case is its current state', () => {
    expect(mapReleasePurchase(RELEASE_CASES.openCaseKept(), NO_NAMES).money).toEqual({ kind: 'counted', value: 188800000, reported: 188800000, symbolic: false })
  })

  it('refused: an attempt, its reported offer as the value, not counted', () => {
    const purchase = mapReleasePurchase(RELEASE_CASES.refused(), NO_NAMES)
    expect(purchase.outcome).toEqual({ kind: 'refused' })
    expect(purchase.value).toBe(40000)
    expect(purchase.money).toMatchObject({ kind: 'not-counted', reason: { code: 'not_accepted' } })
  })

  it('before 2025: served, not counted, not qualified', () => {
    expect(mapReleasePurchase(RELEASE_CASES.before2025(), NO_NAMES).money).toMatchObject({ kind: 'not-counted', reported: 8400, reason: { code: 'value_not_qualified' } })
  })

  it('removed from the portal: out of totals with its reason, and not listed', () => {
    const purchase = mapReleasePurchase(RELEASE_CASES.noLongerListed(), NO_NAMES)
    expect(purchase.listedNow).toBe(false)
    expect(purchase.money).toMatchObject({ kind: 'not-counted', reported: 5200, reason: { code: 'removed_from_portal' } })
  })

  it('symbolic price', () => {
    expect(mapReleasePurchase(RELEASE_CASES.symbolicPrice(), NO_NAMES).money).toEqual({ kind: 'counted', value: 0.01, reported: 0.01, symbolic: true })
  })
})

describe('mapReleasePurchase — D6', () => {
  it('a company is named and keeps its code', () => {
    const purchase = mapReleasePurchase(RELEASE_CASES.countedAsReported(), NO_NAMES)
    expect(purchase.supplier).toEqual({ cui: '14837428', name: 'Floraria Iris SRL', identity: null, hasBudget: false })
  })

  it('step 2: a masked person keeps the masked name and code, a code-only supplier its code, neither tidied as a firm', () => {
    const masked = mapReleasePurchase(rawReleaseDetail({ supplier: { displayKind: 'person_masked', partyId: 'p-m', name: 'Ion P*** PFA', fiscalCode: '30111222' } }), NO_NAMES)
    expect(masked.supplier).toEqual({ cui: '30111222', name: 'Ion P*** PFA', identity: null, hasBudget: false })
    const codeOnly = mapReleasePurchase(rawReleaseDetail({ supplier: { displayKind: 'code_only', partyId: 'p-c', name: null, fiscalCode: '30111223' } }), NO_NAMES)
    expect(codeOnly.supplier).toEqual({ cui: '30111223', name: 'Nume nepublicat', identity: null, hasBudget: false })
  })

  it('a natural person has no name, no code, and no context', () => {
    const purchase = mapReleasePurchase(RELEASE_CASES.naturalPerson(), NO_NAMES)
    expect(purchase.supplier).toEqual({ cui: null, name: '', identity: null, hasBudget: false, withheld: 'natural-person' })
    expect(contextGapOf(purchase)).toBe('withheld')
  })

  it('a name served beside the natural-person kind is dropped', () => {
    const purchase = mapReleasePurchase(rawReleaseDetail({ supplier: { displayKind: 'natural_person', partyId: 'x', name: 'Ion Popescu', fiscalCode: '1234567890123' } }), NO_NAMES)
    expect(purchase.supplier).toEqual({ cui: null, name: '', identity: null, hasBudget: false, withheld: 'natural-person' })
    expect(JSON.stringify(purchase)).not.toContain('Popescu')
    expect(JSON.stringify(purchase)).not.toContain('1234567890123')
  })

  it('a label read for the code never names a withheld supplier', () => {
    const purchase = mapReleasePurchase(RELEASE_CASES.naturalPerson(), names({ labels: new Map([['14837428', 'FLORARIA IRIS SRL']]) }))
    expect(purchase.supplier.name).toBe('')
  })

  it('no supplier at all', () => {
    expect(mapReleasePurchase(rawReleaseDetail({ supplier: null }), NO_NAMES).supplier).toMatchObject({ cui: null, name: '', withheld: 'none' })
  })

  it('the buyer keeps its name, preferring the budget platform’s', () => {
    const plain = mapReleasePurchase(RELEASE_CASES.countedAsReported(), NO_NAMES)
    expect(plain.authority).toMatchObject({ cui: '361684', name: 'Banca Nationala a Romaniei' })
    const known = mapReleasePurchase(RELEASE_CASES.countedAsReported(), names({ authority: { name: 'Banca Națională a României', identity: null as never, hasBudget: true } }))
    expect(known.authority).toMatchObject({ name: 'Banca Națională a României', hasBudget: true })
  })

  it('a release purchase between two named parties has a context to read', () => {
    expect(contextGapOf(mapReleasePurchase(rawReleaseDetail({ supplier: COMPANY }), NO_NAMES))).toBeNull()
  })
})

describe('mapReleasePurchase — what the release does not serve', () => {
  it('no estimate, terms, documents, EU fund, line descriptions or categories', () => {
    const purchase = mapReleasePurchase(rawReleaseDetail({}, [rawReleaseItem(), rawReleaseItem({ itemIndex: 1, name: 'Coroana' })]), NO_NAMES)
    expect(purchase.estimate).toBeNull()
    expect(purchase.detail).toMatchObject({ delivery: null, payment: null, documents: 0, euFund: null, redacted: false, contractType: 'supply' })
    expect(purchase.detail?.items.map((item) => [item.description, item.cpvLabel, item.code])).toEqual([
      [null, null, null],
      [null, null, null],
    ])
  })

  it('the category label as written, its revision tag dropped', () => {
    expect(mapReleasePurchase(RELEASE_CASES.countedAsReported(), NO_NAMES).cpv).toEqual({ code: '03121210', label: { ro: 'Aranjamente florale', en: null } })
  })

  it('decisions dated from the release', () => {
    expect(mapReleasePurchase(RELEASE_CASES.countedAsReported(), NO_NAMES).detail).toMatchObject({ firm: { at: '2025-06-01T15:00:00.654321Z' }, institution: { at: '2025-06-02T09:00:00.123456Z' } })
  })
})

describe('mapReleasePurchase — free text withheld until its privacy review', () => {
  it('withheld: the title is the category’s label, no description, the lines unnamed, said', () => {
    const purchase = mapReleasePurchase(RELEASE_CASES.countedAsReported(), NO_NAMES)
    expect(purchase.title).toBe('Aranjamente florale')
    expect(purchase.withheldText).toEqual({ title: true, description: true, lines: true })
    expect(purchase.detail?.description).toBeNull()
    expect(purchase.detail?.items[0]).toMatchObject({ name: '', nameWithheld: true })
  })

  it('a value served beside its withheld marker is never shown', () => {
    const purchase = mapReleasePurchase(
      rawReleaseDetail({ title: 'Ion Popescu, tel. 0722', titleWithheld: 'privacy', description: 'contact: ion@x.ro', descriptionWithheld: 'privacy' }, [rawReleaseItem({ name: 'Popescu', nameWithheld: 'privacy' })]),
      NO_NAMES,
    )
    expect(JSON.stringify(purchase)).not.toMatch(/Popescu|0722|ion@x/u)
  })

  it('served after review: the institution’s title, description and line names', () => {
    const purchase = mapReleasePurchase(rawReleaseDetail(SERVED_TEXT, [rawReleaseItem(servedItemText('Aranjament floral mic'))]), NO_NAMES)
    expect(purchase).toMatchObject({ title: 'Aranjamente florale pentru eveniment', withheldText: { title: false, description: false, lines: false }, detail: { description: 'Diverse aranjamente florale' } })
    expect(purchase.detail?.items[0]).toMatchObject({ name: 'Aranjament floral mic' })
    expect(purchase.detail?.items[0]?.nameWithheld).toBeUndefined()
  })

  it('a withheld unit is never kept, and the lines are said to be withheld', () => {
    const purchase = mapReleasePurchase(rawReleaseDetail(SERVED_TEXT, [rawReleaseItem({ ...servedItemText('Coroană'), unit: 'saci Ion Popescu', unitWithheld: 'privacy' })]), NO_NAMES)
    expect(purchase.detail?.items[0]?.unit).toBeNull()
    expect(purchase.withheldText.lines).toBe(true)
    expect(JSON.stringify(purchase)).not.toContain('Popescu')
  })

  it('no title and no category: no name invented', () => {
    expect(mapReleasePurchase(rawReleaseDetail({ categoryCode: null, categoryLabel: null }), NO_NAMES).title).toBeNull()
  })
})

describe('releaseOutcomeOf', () => {
  it.each([
    ['accepted', 'accepted'],
    ['refused', 'refused'],
    ['expired', 'expired'],
    ['unknown', 'unknown'],
    ['something-new', 'unknown'],
  ])('%s → %s', (raw, kind) => {
    expect(releaseOutcomeOf(raw).kind).toBe(kind)
  })
})

describe('the transport refuses money that is not decimal text', () => {
  it.each(['0x10', '1e3', '', ' 12', '12,5'])('%j fails the read, never a figure the source did not write', async (text) => {
    const { procurementDaPurchaseSchema } = await import('../api/graphql/procurement-da-release-queries')
    expect(procurementDaPurchaseSchema.safeParse({ procurementDaPurchase: rawReleaseDetail({ reportedValue: text }) }).success).toBe(false)
  })

  it('plain decimal text parses', async () => {
    const { procurementDaPurchaseSchema } = await import('../api/graphql/procurement-da-release-queries')
    expect(procurementDaPurchaseSchema.safeParse({ procurementDaPurchase: rawReleaseDetail({ reportedValue: '-12.50' }) }).success).toBe(true)
  })
})

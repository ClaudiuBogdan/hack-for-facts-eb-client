import { displayCompanyName } from '@/features/private-companies/lib/company-profile-model'
import type { RawDaParty, RawDaPurchase, RawDaPurchaseDetail, RawDaPurchaseItem } from '../api/graphql/procurement-da-release-queries'
import { buyerName } from './buyer-model'
import { cpvDivisionLabelEn, cpvDivisionLabelRo } from './cpv-labels'
import { tidyName, tidyTitle } from './home-model'
import { cpvKey, isPurchase, type DirectPurchase, type DpContractType, type DpDetail, type DpItem, type DpLabel, type DpNames, type DpOutcome, type DpParty } from './direct-purchase-model'
import { countedValueOf, supplierNameOf, valueOf, type DpValue } from './direct-purchase-value'

/**
 * A direct purchase read from the API's release-1 surface
 * (`procurementDaPurchase`), as the page shows it: the same sheet as a legacy
 * record, its money said by the serving contract (`money`) and its supplier
 * under D6. What the release does not serve — the estimate, delivery and
 * payment, refusal reasons, documents, EU funding, line descriptions and
 * categories — is absent, never filled from the legacy surface. The lines'
 * values are as reported and never summed.
 *
 * Free text (the title, the description, a line's name) is withheld until its
 * privacy review: the API serves it null with a marker, the title shown is
 * the category's label, and the page says the text is withheld.
 */

function numberOf(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** The release's outcome: who refused, or let it lapse, is not served. */
export function releaseOutcomeOf(outcome: string): DpOutcome {
  switch (outcome) {
    case 'accepted':
      return { kind: 'accepted' }
    case 'refused':
      return { kind: 'refused' }
    case 'expired':
      return { kind: 'expired' }
    default:
      return { kind: 'unknown' }
  }
}

/** The money as the contract defines it, from the API's decimal text and served sentences. */
export function releaseValueOf(raw: Pick<RawDaPurchase, 'reportedValue' | 'counted' | 'countedValue' | 'notCountedReason' | 'valueCorrected' | 'reviewRule' | 'symbolicPrice'>): DpValue {
  const rule = raw.reviewRule
  return valueOf({
    reportedValue: numberOf(raw.reportedValue),
    counted: raw.counted,
    countedValue: numberOf(raw.countedValue),
    notCountedReason: raw.notCountedReason ? { code: raw.notCountedReason.code, label: { ro: raw.notCountedReason.labelRo, en: raw.notCountedReason.labelEn } } : null,
    valueCorrected: raw.valueCorrected,
    rule: rule ? { code: rule.rule, effect: rule.effect, sentence: { ro: rule.descriptionRo, en: rule.descriptionEn } } : null,
    symbolicPrice: raw.symbolicPrice,
  })
}

/** The supplier under D6: a company by its served name and code; anyone else withheld, with no name and no code to look one up by. */
export function releaseSupplierOf(raw: RawDaParty | null): DpParty {
  const supplier = supplierNameOf(raw ? { displayKind: raw.displayKind, name: raw.name, cui: raw.fiscalCode } : null)
  if (supplier.kind === 'company') return { cui: supplier.cui, name: displayCompanyName(supplier.name), identity: null, hasBudget: false }
  return { cui: null, name: '', identity: null, hasBudget: false, withheld: supplier.kind }
}

/** The buyer, a public authority: its served name and code, and the budget platform's record of it when the names read found one. */
export function releaseBuyerOf(raw: RawDaParty | null, names: DpNames): DpParty {
  const cui = raw?.fiscalCode?.trim() || null
  const own = raw?.name?.trim() || null
  const label = cui ? names.labels.get(cui) : undefined
  return {
    cui,
    name: names.authority?.name ?? buyerName(tidyName(label ?? own ?? cui ?? '—'), null, false),
    identity: names.authority?.identity ?? null,
    hasBudget: names.authority?.hasBudget ?? false,
  }
}

function contractTypeOf(text: string | null): DpContractType | null {
  const key = text?.trim().toLocaleLowerCase('ro-RO')
  if (key === 'furnizare') return 'supply'
  if (key === 'servicii') return 'services'
  if (key === 'lucrari' || key === 'lucrări') return 'works'
  return null
}

function itemOf(raw: RawDaPurchaseItem): DpItem {
  const unitPrice = numberOf(raw.unitPrice)
  const catalogPrice = numberOf(raw.cataloguePrice)
  const name = raw.nameWithheld ? null : tidyTitle(raw.name)
  return {
    index: raw.itemIndex,
    code: null,
    name: name ?? (raw.nameWithheld ? '' : '—'),
    ...(raw.nameWithheld ? { nameWithheld: true } : {}),
    description: null,
    unit: raw.unit,
    cpvLabel: null,
    quantity: numberOf(raw.quantity),
    unitPrice,
    catalogPrice: catalogPrice !== null && unitPrice !== null && catalogPrice !== unitPrice ? catalogPrice : null,
    // As reported (quantity × unit price): shown per line, never summed.
    line: numberOf(raw.reportedLineValue),
    peers: null,
    repeats: null,
  }
}

function detailOf(raw: RawDaPurchaseDetail): DpDetail {
  const purchase = raw.purchase
  return {
    description: purchase.descriptionWithheld ? null : purchase.description?.trim() || null,
    delivery: null,
    payment: null,
    contractType: contractTypeOf(purchase.acquisitionTypeLabel),
    euFund: null,
    documents: 0,
    redacted: false,
    firm: { at: purchase.supplierDecisionAt, deadline: null },
    institution: { at: purchase.buyerDecisionAt, deadline: null },
    items: [...raw.items].sort((a, b) => a.itemIndex - b.itemIndex).map(itemOf),
    // The lines are never summed against the value.
    itemsTotal: null,
  }
}

/** The category's label as written, its revision tag dropped. */
export function cpvWritten(raw: Pick<RawDaPurchase, 'categoryLabel'>): string | null {
  return raw.categoryLabel?.replace(/\s*\(Rev\.\s*2\)\s*$/iu, '').trim() || null
}

/** The category: the API's label as written, else its division's. */
function cpvOf(raw: RawDaPurchase, names: DpNames): DirectPurchase['cpv'] {
  const code = cpvKey(raw.categoryCode)
  if (!code) return null
  const written = cpvWritten(raw)
  const division = code.slice(0, 2)
  const label: DpLabel = names.cpv.get(code) ?? (written ? { ro: written, en: null } : { ro: cpvDivisionLabelRo(division), en: cpvDivisionLabelEn(division) })
  return { code, label }
}

/** A purchase's title as the page names it: the institution's when served, else its category's label. */
export function releaseTitleOf(raw: Pick<RawDaPurchase, 'title' | 'titleWithheld' | 'categoryLabel'>): string | null {
  return raw.titleWithheld ? cpvWritten(raw) : (tidyTitle(raw.title) ?? cpvWritten(raw))
}

/** The release's purchase as the page's sheet. `names`: the buyer's and the category's labels only — never the supplier's (D6). */
export function mapReleasePurchase(raw: RawDaPurchaseDetail, names: DpNames): DirectPurchase {
  const purchase = raw.purchase
  const outcome = releaseOutcomeOf(purchase.outcome)
  const money = releaseValueOf(purchase)
  const sourceUrl = purchase.sourceUrl?.trim()
  const cpv = cpvOf(purchase, names)
  const titleWithheld = Boolean(purchase.titleWithheld)
  // A withheld title: the category's label, as written, is the purchase's name.
  const title = titleWithheld ? (cpvWritten(purchase) ?? null) : tidyTitle(purchase.title)
  return {
    id: purchase.purchaseId,
    code: purchase.code,
    title,
    family: 'catalog',
    outcome,
    // A purchase's counted value; an attempt's reported offer. The page reads `money` for the rest.
    value: isPurchase(outcome) ? countedValueOf(money) : money.reported,
    unverifiedValue: null,
    estimate: null,
    published: purchase.publicationDay,
    finalized: purchase.finalizationDay,
    cpv,
    authority: releaseBuyerOf(purchase.buyer, names),
    supplier: releaseSupplierOf(purchase.supplier),
    source: sourceUrl ? { kind: 'page', url: sourceUrl } : { kind: 'none' },
    alsoIn: [],
    detail: detailOf(raw),
    availability: 'AVAILABLE',
    partial: names.failed,
    money,
    listedNow: purchase.listedNow,
    dataAsOf: raw.dataAsOf,
    withheldText: { title: titleWithheld, description: Boolean(purchase.descriptionWithheld), lines: raw.items.some((item) => Boolean(item.nameWithheld)) },
  }
}

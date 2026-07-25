import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProcurementDaDetailSection } from './procurement-detail-sections'

import type { DaDetail, DaItem } from '@/schemas/procurement'

/**
 * These tests pin the honesty guarantees of the purchased-items section, not
 * its layout. Each one corresponds to a way the page could quietly mislead a
 * reader: by implying nothing was bought, by presenting a basket that
 * contradicts the headline value, or by showing an empty description where text
 * was actually withheld.
 */

const item = (over: Partial<DaItem> = {}): DaItem => ({
  id: 'i1',
  itemIndex: 0,
  catalogItemCode: 'C-1',
  catalogItemName: 'Hartie A4',
  catalogItemDescription: 'Hartie alba, 500 coli',
  itemMeasureUnit: 'buc',
  cpvCode: null,
  cpvText: null,
  itemQuantity: '3',
  unitPrice: '20.00',
  unitEstimatedPrice: '22.00',
  catalogUnitPrice: '25.00',
  lineValue: '60.00',
  sourceUrl: 'https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/1',
  ...over,
})

const detail = (over: Partial<DaDetail> = {}): DaDetail => ({
  description: 'Achizitie hartie A4 80g pentru birou',
  deliveryCondition: 'Livrare la sediul institutiei',
  paymentCondition: 'Plata la 30 de zile',
  contractTypeText: 'Furnizare',
  isEuFunded: false,
  euFundText: null,
  caDecisionDate: null,
  caDecisionDeadline: null,
  supplierDecisionDate: null,
  supplierDecisionDeadline: null,
  caRejectionReason: null,
  supplierRejectionReason: null,
  correctionReason: null,
  documentCount: 0,
  itemCount: 1,
  itemsTotal: '60.00',
  itemsValueDelta: '0.00',
  itemsReconciled: true,
  textRedacted: false,
  sourceUrl: 'https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/1',
  items: [item()],
  ...over,
})

describe('ProcurementDaDetailSection', () => {
  it('renders the description and the itemised basket', () => {
    render(
      <ProcurementDaDetailSection
        detail={detail()}
        availability="AVAILABLE"
      />
    )
    expect(
      screen.getByText('Achizitie hartie A4 80g pentru birou')
    ).toBeInTheDocument()
    expect(screen.getByText('Hartie A4')).toBeInTheDocument()
    expect(screen.getByText('Hartie alba, 500 coli')).toBeInTheDocument()
    // Quantity and unit are shown together so a unit price is readable as one.
    expect(screen.getByText('buc')).toBeInTheDocument()
  })

  describe('absence is explained, never blank', () => {
    it('says the source has no itemised detail for bulk-export records', () => {
      render(
        <ProcurementDaDetailSection
          detail={null}
          availability="NOT_AVAILABLE_FOR_SOURCE"
        />
      )
      // The decisive sentence: a reader must not conclude nothing was bought.
      expect(
        screen.getByText(/does not mean nothing was purchased/i)
      ).toBeInTheDocument()
    })

    it('says older records are still being backfilled', () => {
      render(
        <ProcurementDaDetailSection detail={null} availability="NOT_CAPTURED" />
      )
      expect(
        screen.getByText(/still being backfilled/i)
      ).toBeInTheDocument()
      // Must NOT claim the source has nothing — this gap is closable.
      expect(
        screen.queryByText(/does not mean nothing was purchased/i)
      ).not.toBeInTheDocument()
    })

    it('treats a null detail as unavailable even if availability says otherwise', () => {
      // Defensive: a server that reported AVAILABLE with no body must not
      // render an empty basket.
      render(
        <ProcurementDaDetailSection detail={null} availability="AVAILABLE" />
      )
      expect(screen.getByText(/still being backfilled/i)).toBeInTheDocument()
    })
  })

  describe('a basket that disagrees with the headline value says so', () => {
    it('warns when the source numbers do not reconcile', () => {
      render(
        <ProcurementDaDetailSection
          detail={detail({ itemsReconciled: false })}
          availability="AVAILABLE"
        />
      )
      expect(
        screen.getByText(/do not add up to the total reported/i)
      ).toBeInTheDocument()
    })

    it('stays silent when the basket reconciles', () => {
      render(
        <ProcurementDaDetailSection
          detail={detail({ itemsReconciled: true })}
          availability="AVAILABLE"
        />
      )
      expect(
        screen.queryByText(/do not add up to the total reported/i)
      ).not.toBeInTheDocument()
    })

    it('stays silent when there is nothing to reconcile against', () => {
      // null = the source recorded no closing value. That is unanswerable, not
      // an answer of "does not reconcile" — warning here would invent a defect.
      render(
        <ProcurementDaDetailSection
          detail={detail({ itemsReconciled: null })}
          availability="AVAILABLE"
        />
      )
      expect(
        screen.queryByText(/do not add up to the total reported/i)
      ).not.toBeInTheDocument()
    })
  })

  it('labels withheld text as withheld rather than showing a blank', () => {
    render(
      <ProcurementDaDetailSection
        detail={detail({ description: null, textRedacted: true })}
        availability="AVAILABLE"
      />
    )
    expect(
      screen.getByText(/withheld because it contains personal contact details/i)
    ).toBeInTheDocument()
  })

  it('shows nothing about redaction when text is simply absent', () => {
    render(
      <ProcurementDaDetailSection
        detail={detail({ description: null, textRedacted: false })}
        availability="AVAILABLE"
      />
    )
    expect(
      screen.queryByText(/withheld because it contains/i)
    ).not.toBeInTheDocument()
  })
})

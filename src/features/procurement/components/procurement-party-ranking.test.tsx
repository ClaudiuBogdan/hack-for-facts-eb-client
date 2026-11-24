import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { mapPartyBucket } from '../api/graphql/procurement-mappers'
import { ProcurementPartyRanking } from './procurement-party-ranking'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params }: { readonly children: ReactNode; readonly to: string; readonly params?: Record<string, string> }) => {
    let href = to
    for (const [key, value] of Object.entries(params ?? {})) href = href.replace(`$${key}`, value)
    return <a href={href}>{children}</a>
  },
  useSearch: () => ({}),
}))

const bucket = (key: string, displayKind: string, displayName: string | null) => ({ key, kind: 'top', displayKind, displayName, recordCount: '4', withValueCount: '4', valueSum: '1000', shareOfScope: '0.25' })

/**
 * An institution's slice ranking of its direct-purchase suppliers (root, 24
 * November 2026; PROC-KR9T): a supplier's page names a sole trader by the
 * registry's full name, so only a supplier served as a company links to it.
 */
describe('ProcurementPartyRanking — direct-purchase suppliers', () => {
  it('links a company to its page, and says a masked or code-only supplier as plain text', () => {
    const rows = [
      mapPartyBucket(bucket('14837428', 'company', 'FLORARIA IRIS SRL') as never, 'direct_acquisition', 'supplier'),
      mapPartyBucket(bucket('30111222', 'person_masked', 'Ion P*** PFA') as never, 'direct_acquisition', 'supplier'),
      mapPartyBucket(bucket('30111223', 'code_only', null) as never, 'direct_acquisition', 'supplier'),
      // A company the API served with no name: its code, never a link to a page that would name it.
      mapPartyBucket(bucket('4305857', 'company', null) as never, 'direct_acquisition', 'supplier'),
    ]
    const page = renderToStaticMarkup(<ProcurementPartyRanking title="Furnizori" rows={rows} kind="supplier" grain="direct_acquisition" />)
    expect(page).toContain('href="/procurement/suppliers/14837428"')
    expect(page).toContain('Ion P*** PFA (CUI 30111222)')
    expect(page).toContain('CUI 30111223 (nume nepublicat)')
    expect(page).not.toContain('href="/procurement/suppliers/30111222"')
    expect(page).not.toContain('href="/procurement/suppliers/30111223"')
    expect(page).toContain('CUI 4305857 (denumire indisponibilă în registrul firmelor)')
    expect(page).not.toContain('href="/procurement/suppliers/4305857"')
  })

  it('still links a contract supplier and an institution as before', () => {
    const contract = mapPartyBucket(bucket('14837428', 'company', null) as never, 'contract', 'supplier', new Map([['supplier:14837428', 'FLORARIA IRIS SRL']]))
    expect(renderToStaticMarkup(<ProcurementPartyRanking title="Furnizori" rows={[contract]} kind="supplier" grain="contract" />)).toContain('href="/procurement/suppliers/14837428"')
    const authority = mapPartyBucket(bucket('4204003', 'authority', 'Institutul Clinic Fundeni') as never, 'direct_acquisition', 'authority', new Map([['authority:4204003', 'Institutul Clinic Fundeni']]))
    expect(renderToStaticMarkup(<ProcurementPartyRanking title="Instituții" rows={[authority]} kind="authority" grain="direct_acquisition" />)).toContain('href="/procurement/institutions/4204003"')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { ParliamentBillDetail, ParliamentBillTimelineStep } from '@/schemas/parliament'

// The tracker renders TanStack <Link>s; stub the router to a plain anchor so the
// component renders without a RouterProvider (mirrors bill-details-tab.test).
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    ...rest
  }: {
    children: React.ReactNode
    to: string
    params?: Record<string, string>
  }) => {
    const href = Object.entries(params ?? {}).reduce(
      (acc, [k, v]) => acc.replace(`$${k}`, v),
      to,
    )
    return (
      <a href={href} {...(rest as Record<string, unknown>)}>
        {children}
      </a>
    )
  },
}))

import { BillPassageTracker } from './bill-passage-tracker'

/**
 * These pin the two behaviours the page got WRONG before the procedure model:
 * it showed the source's document rows as procedural events, and it silently
 * dropped any step whose chamber the source left blank.
 */
const step = (
  over: Partial<ParliamentBillTimelineStep> & { position: number },
): ParliamentBillTimelineStep => ({
  stepId: `s-${String(over.position)}`,
  description: 'Etapă',
  isMilestone: false,
  docUrls: [],
  links: [],
  ...over,
})

const bill = (
  timeline: readonly ParliamentBillTimelineStep[],
  dossierBillIds: readonly string[] = ['23135'],
): ParliamentBillDetail =>
  ({
    timeline,
    relatedVotes: [],
    lawMilestone: undefined,
    dossierBillIds,
  }) as unknown as ParliamentBillDetail

describe('BillPassageTracker — what the source actually printed', () => {
  it('renders a step but NOT the attachment row folded under it', () => {
    // cdep.ro prints one procedural row here; the capture holds two, because the
    // attached document gets its own <tr>. Showing both reads as an event that
    // never happened.
    render(
      <BillPassageTracker
        bill={bill([
          step({
            position: 22,
            chamberCode: 'CD',
            description: 'înregistrat la Camera Deputaţilor pentru dezbatere',
            rowKind: 'step',
          }),
          step({
            position: 23,
            chamberCode: 'CD',
            description: 'Forma iniţiatorului',
            rowKind: 'attachment',
            parentPosition: 22,
          }),
        ])}
      />,
    )
    expect(screen.getByText(/înregistrat la Camera Deputaţilor/)).toBeInTheDocument()
    expect(screen.queryByText('Forma iniţiatorului')).not.toBeInTheDocument()
  })

  it('keeps an UNCLASSIFIED row visible — never hides what it cannot type', () => {
    render(
      <BillPassageTracker
        bill={bill([
          step({ position: 1, chamberCode: 'CD', description: 'Etapă neclasificată' }),
        ])}
      />,
    )
    expect(screen.getByText('Etapă neclasificată')).toBeInTheDocument()
  })

  it('shows a step whose chamber the source never stated, in its own column', () => {
    // 234,321 events carry no chamber. The old bucketing discarded every one.
    render(
      <BillPassageTracker
        bill={bill([
          step({ position: 1, chamberCode: 'CD', description: 'Cu cameră' }),
          step({ position: 2, description: 'Fără cameră indicată', rowKind: 'step' }),
        ])}
      />,
    )
    expect(screen.getByText('Fără cameră indicată')).toBeInTheDocument()
    expect(screen.getByText('Etape fără cameră indicată')).toBeInTheDocument()
  })

  it('links a resolved committee into the platform and leaves an unresolved one as source text', () => {
    render(
      <BillPassageTracker
        bill={bill([
          step({
            position: 1,
            chamberCode: 'CD',
            description: 'trimis pentru raport la:',
            rowKind: 'step',
            links: [
              {
                linkKind: 'committee',
                targetKey: 'cdep:2:2024:11',
                sourceHref: 'https://cdep.ro/x',
                sourceText: 'Comisia juridică',
                resolutionStatus: 'linked',
              },
              {
                linkKind: 'committee',
                targetKey: null,
                sourceHref: 'https://senat.ro/y',
                sourceText: 'Comisia economică',
                resolutionStatus: 'unresolved_registry',
              },
            ],
          }),
        ])}
      />,
    )
    // Resolved → an in-platform route carrying the committee key. (The stub
    // above substitutes params verbatim; the real Link URL-encodes them.)
    expect(screen.getByText('Comisia juridică').closest('a')).toHaveAttribute(
      'href',
      '/parlament/comisii/cdep:2:2024:11',
    )
    // Unresolved registry → still named, still openable at the source. The body
    // is real; only our registry is missing it.
    expect(screen.getByText('Comisia economică').closest('a')).toHaveAttribute(
      'href',
      'https://senat.ro/y',
    )
  })

  it('renders an act citation and an MO issue — the kinds no fixture used to carry', () => {
    // This is the coverage gap that let a real bug through: the schema's
    // linkKind enum omitted 'mo_issue' after the server started emitting it, so
    // 7,003 edges across 6,989 bills would have failed dossier parsing — and
    // every test passed, because not one fixture contained an MO edge.
    render(
      <BillPassageTracker
        bill={bill([
          step({
            position: 1,
            chamberCode: 'PA',
            description: 'devine Legea nr. 214/2026',
            rowKind: 'step',
            links: [
              {
                linkKind: 'act',
                targetKey: 'lege:214:2026:',
                sourceHref: 'https://cdep.ro/legis_pck.htp_act?ida=220507',
                sourceText: '214/2026',
                resolutionStatus: 'linked',
              },
              {
                linkKind: 'mo_issue',
                targetKey: '4711',
                sourceHref: 'https://cdep.ro/legis_pck.lista_mof?idp=9',
                sourceText: '1100/2026',
                resolutionStatus: 'linked',
              },
            ],
          }),
        ])}
      />,
    )
    expect(screen.getByText('214/2026')).toBeInTheDocument()
    expect(screen.getByText(/Monitorul Oficial 1100\/2026/)).toBeInTheDocument()
  })

  it('ignores a link kind it does not know, instead of blanking the page', () => {
    // linkKind is deliberately an open string: the contract is additive, and a
    // closed enum turns a new server kind into a crash rather than a missing chip.
    render(
      <BillPassageTracker
        bill={bill([
          step({
            position: 1,
            chamberCode: 'CD',
            description: 'Etapă cu legătură necunoscută',
            rowKind: 'step',
            links: [
              {
                linkKind: 'something_new_from_the_server',
                targetKey: 'x',
                sourceHref: 'https://example.org/x',
                sourceText: 'X',
                resolutionStatus: 'linked',
              },
            ],
          }),
        ])}
      />,
    )
    expect(screen.getByText('Etapă cu legătură necunoscută')).toBeInTheDocument()
  })

  it('splits a MERGED dossier into one lane per official record', () => {
    // A single-view bill has one record; labelling every row would be noise.
    const single = render(
      <BillPassageTracker
        bill={bill([
          step({
            position: 1,
            chamberCode: 'CD',
            description: 'Etapă unică',
            sourceBillKey: '23135',
          }),
        ])}
      />,
    )
    expect(single.queryByText(/Fișa Camerei/)).not.toBeInTheDocument()
    single.unmount()

    // A bicameral bill is TWO records; 19,031 of 19,068 merged dossiers carry
    // steps dated the same day in both, so the reader must be able to tell them
    // apart rather than read one invented sequence.
    render(
      <BillPassageTracker
        bill={bill(
          [
            step({
              position: 1,
              chamberCode: 'CD',
              description: 'Etapă CDep',
              sourceBillKey: '23135',
            }),
            step({
              position: 2,
              chamberCode: 'SE',
              description: 'Etapă Senat',
              sourceBillKey: 'senat:297-2026',
            }),
          ],
          ['23135', 'senat:297-2026'],
        )}
      />,
    )
    expect(screen.getByText('Fișa Camerei Deputaților')).toBeInTheDocument()
    expect(screen.getByText('Fișa Senatului')).toBeInTheDocument()
    expect(screen.getByText(/nu am eliminat suprapunerile/)).toBeInTheDocument()
  })
})

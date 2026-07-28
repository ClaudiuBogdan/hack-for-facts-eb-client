import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type {
  ParliamentBillDetail,
  ParliamentBillTimelineStep,
} from '@/schemas/parliament'

// The tab renders TanStack <Link>s; stub the router to a plain anchor so the
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

import { BillStagesTab } from './bill-stages-tab'

/**
 * These pin the behaviours the page got WRONG before the procedure model — it
 * showed the source's document rows as procedural events, and silently dropped
 * any step whose chamber the source left blank — plus the contract the three
 * views share: switching a view re-arranges events, it never removes one.
 */
const step = (
  over: Partial<ParliamentBillTimelineStep> & { position: number },
): ParliamentBillTimelineStep => ({
  stepId: `s-${over.sourceBillKey ?? 'x'}-${String(over.position)}`,
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
    billId: '23135',
    timeline,
    relatedVotes: [],
    lawMilestone: undefined,
    dossierBillIds,
  }) as unknown as ParliamentBillDetail

/** Bill 23135's shape: both chambers record the same rejection on 24 June. */
function mergedBill(): ParliamentBillDetail {
  return bill(
    [
      step({
        position: 5,
        chamberCode: 'CD',
        date: '2026-03-23',
        description: 'prezentare în Biroul Permanent',
        sourceBillKey: '23135',
      }),
      step({
        position: 13,
        chamberCode: 'SE',
        date: '2026-06-24',
        description: 'respinsa de catre Senat',
        sourceBillKey: '23135',
      }),
      step({
        position: 22,
        chamberCode: 'CD',
        description: 'înregistrat la Camera Deputatilor pentru dezbatere',
        sourceBillKey: '23135',
      }),
      step({
        position: 0,
        chamberCode: 'SE',
        date: '2026-03-24',
        description: 'Înregistrat la Senat pentru dezbatere',
        sourceBillKey: 'senat:297-2026',
      }),
      step({
        position: 18,
        chamberCode: 'SE',
        date: '2026-06-24',
        description: 'respins de Senat',
        sourceBillKey: 'senat:297-2026',
      }),
    ],
    ['23135', 'senat:297-2026'],
  )
}

describe('BillStagesTab — what the source actually printed', () => {
  it('renders a step but NOT the attachment row folded under it', () => {
    // cdep.ro prints one procedural row here; the capture holds two, because the
    // attached document gets its own <tr>. Showing both reads as an event that
    // never happened.
    render(
      <BillStagesTab
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
    expect(
      screen.getByText(/înregistrat la Camera Deputaţilor/),
    ).toBeInTheDocument()
    expect(screen.queryByText('Forma iniţiatorului')).not.toBeInTheDocument()
  })

  it('keeps an UNCLASSIFIED row visible — never hides what it cannot type', () => {
    render(
      <BillStagesTab
        bill={bill([
          step({
            position: 1,
            chamberCode: 'CD',
            description: 'Etapă neclasificată',
          }),
        ])}
      />,
    )
    expect(screen.getByText('Etapă neclasificată')).toBeInTheDocument()
  })

  it('shows a step whose chamber the source never stated, in its own column', () => {
    // 131,383 procedural steps carry no chamber. The old bucketing discarded
    // every one of them.
    render(
      <BillStagesTab
        view="camere"
        bill={bill([
          step({ position: 1, chamberCode: 'CD', description: 'Cu cameră' }),
          step({
            position: 2,
            description: 'Fără cameră indicată',
            rowKind: 'step',
          }),
        ])}
      />,
    )
    expect(screen.getByText('Fără cameră indicată')).toBeInTheDocument()
    expect(screen.getByText('Etape fără cameră indicată')).toBeInTheDocument()
  })

  it('links a resolved committee into the platform and leaves an unresolved one as source text', () => {
    render(
      <BillStagesTab
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
      <BillStagesTab
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

  it('prints one chip when the API repeats an anchor the database stores once', () => {
    // Step 24 of bill 23135 holds ONE bill_step_links row and arrives over
    // GraphQL twice, identical down to sourceHref — the resolver fans a join
    // out. Rendered raw that is a doubled committee and two React children
    // sharing a key.
    const anchor = {
      linkKind: 'committee',
      targetKey: 'cdep:2:2024:11',
      sourceHref: 'https://www.cdep.ro/structura2015.co?idc=11',
      sourceText: 'Comisia juridică, de disciplină şi imunităţi',
      resolutionStatus: 'linked',
    }
    render(
      <BillStagesTab
        bill={bill([
          step({
            position: 24,
            chamberCode: 'CD',
            description: 'trimis pentru raport la:',
            rowKind: 'step',
            links: [anchor, { ...anchor }],
          }),
        ])}
      />,
    )
    expect(
      screen.getAllByText('Comisia juridică, de disciplină şi imunităţi'),
    ).toHaveLength(1)
  })

  it('keeps two chips that share an href but not a caption, without a key clash', () => {
    // The first dedupe keyed the DOM node on sourceHref alone, so these two
    // survived the collapse and then collided as siblings — React logged
    // "two children with the same key" and reserves the right to drop one.
    const errors: unknown[] = []
    const spy = vi
      .spyOn(console, 'error')
      .mockImplementation((...args) => errors.push(args))
    render(
      <BillStagesTab
        bill={bill([
          step({
            position: 1,
            chamberCode: 'CD',
            description: 'trimis pentru raport la:',
            rowKind: 'step',
            links: [
              {
                linkKind: 'committee',
                targetKey: 'cdep:2:2016:11',
                sourceHref: 'https://www.cdep.ro/structura2015.co?idc=11',
                sourceText: 'Comisia juridică',
                resolutionStatus: 'linked',
              },
              {
                linkKind: 'committee',
                targetKey: 'cdep:2:2016:11',
                sourceHref: 'https://www.cdep.ro/structura2015.co?idc=11',
                sourceText: 'Comisia juridică (raport comun)',
                resolutionStatus: 'linked',
              },
            ],
          }),
        ])}
      />,
    )
    expect(screen.getByText('Comisia juridică')).toBeInTheDocument()
    expect(
      screen.getByText('Comisia juridică (raport comun)'),
    ).toBeInTheDocument()
    expect(
      errors.filter((entry) => String(entry).includes('same key')),
    ).toHaveLength(0)
    spy.mockRestore()
  })

  it('ignores a link kind it does not know, instead of blanking the page', () => {
    // linkKind is deliberately an open string: the contract is additive, and a
    // closed enum turns a new server kind into a crash rather than a missing chip.
    render(
      <BillStagesTab
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

  it('loses no step when the payload carries no sourceBillKey', () => {
    // A cached payload from before the field existed. The lanes collapse to one,
    // which is the old behaviour — but every step must still render.
    render(
      <BillStagesTab
        bill={bill(
          [
            step({ position: 1, chamberCode: 'CD', description: 'Prima etapă' }),
            step({ position: 2, chamberCode: 'SE', description: 'A doua etapă' }),
          ],
          ['23135', 'senat:297-2026'],
        )}
      />,
    )
    expect(screen.getByText('Prima etapă')).toBeInTheDocument()
    expect(screen.getByText('A doua etapă')).toBeInTheDocument()
  })

  it('renders a record that carries steps even if the dossier list omits it', () => {
    render(
      <BillStagesTab
        bill={bill(
          [
            step({
              position: 1,
              chamberCode: 'CD',
              description: 'Etapă dintr-o fișă nelistată',
              sourceBillKey: 'senat:999-2026',
            }),
          ],
          ['23135'],
        )}
      />,
    )
    expect(screen.getByText('Etapă dintr-o fișă nelistată')).toBeInTheDocument()
  })
})

describe('BillStagesTab — the separate-records view', () => {
  it('splits a MERGED dossier into one lane per official record', () => {
    // A single-view bill has one record; labelling every row would be noise.
    const single = render(
      <BillStagesTab
        view="fise"
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
    render(<BillStagesTab bill={mergedBill()} view="fise" />)
    expect(screen.getByText('Fișa Camerei Deputaților')).toBeInTheDocument()
    expect(screen.getByText('Fișa Senatului')).toBeInTheDocument()
    expect(screen.getByText(/nu am eliminat suprapunerile/i)).toBeInTheDocument()
  })
})

describe('BillStagesTab — the three views show the same events', () => {
  const descriptions = [
    'prezentare în Biroul Permanent',
    'respinsa de catre Senat',
    'înregistrat la Camera Deputatilor pentru dezbatere',
    'Înregistrat la Senat pentru dezbatere',
    'respins de Senat',
  ]

  it.each(['fise', 'camere', 'cronologic'] as const)(
    'renders every step in the %s view',
    async (view) => {
      // Switching a view must re-arrange the procedure, never edit it. The
      // undated CDep step is the one most at risk: it has no place on a time
      // axis, so a careless chronological view would drop it — and half of all
      // bills carry at least one.
      //
      // The two column views park routine rows (avize, termene, prezentări în
      // Biroul permanent) behind a disclosure. That is a fold, not a drop, so
      // the check opens every one before counting — which is exactly the
      // difference a reader can undo and a dropped row is not.
      const user = userEvent.setup()
      render(<BillStagesTab bill={mergedBill()} view={view} />)
      for (const toggle of screen.queryAllByRole('button', {
        name: /Avize & termene/,
      })) {
        await user.click(toggle)
      }
      for (const description of descriptions) {
        expect(screen.getByText(description)).toBeInTheDocument()
      }
    },
  )
})

/**
 * The block for one exact day. Matched on the heading's accessible NAME, not on
 * substring text: "24 iunie 2026" is also inside "După 24 iunie 2026", and the
 * undated block now sorts above the day it follows.
 */
function dayBlock(heading: string): HTMLElement {
  return screen
    .getByRole('heading', { level: 4, name: heading })
    .closest('li') as HTMLElement
}

describe('BillStagesTab — the chronological view', () => {
  it('shows the most recent day first, interleaving both records', () => {
    // What a bill did last is what a reader came to find out. The undated block
    // leads, because the record proves those steps came after 24 June.
    render(<BillStagesTab bill={mergedBill()} view="cronologic" />)
    const headings = screen
      .getAllByRole('heading', { level: 4 })
      .map((node) => node.textContent)
    expect(headings[0]).toContain('După 24 iunie 2026')
    expect(headings[1]).toContain('24 iunie 2026')
    expect(headings[2]).toContain('24 martie 2026')
    expect(headings[3]).toContain('23 martie 2026')
  })

  it('keeps the record’s own order INSIDE a day', () => {
    // A day carries no time, so the fișă's sequence is the only one there is.
    // Reversing it would put a rejection above the sitting that produced it.
    render(<BillStagesTab bill={mergedBill()} view="cronologic" />)
    const order = within(dayBlock('24 iunie 2026'))
      .getAllByText(/respins/)
      .map((node) => node.textContent)
    expect(order).toEqual(['respinsa de catre Senat', 'respins de Senat'])
  })

  it('puts both chambers’ record of the same day in ONE block', () => {
    render(<BillStagesTab bill={mergedBill()} view="cronologic" />)
    const block = dayBlock('24 iunie 2026')
    expect(within(block).getByText('respins de Senat')).toBeInTheDocument()
    expect(within(block).getByText('respinsa de catre Senat')).toBeInTheDocument()
  })

  it('states the INTERVAL for an undated step rather than inventing a date', () => {
    // The step's position in its record proves it happened after 24 June; the
    // record carries nothing dated afterwards, so that is all we may claim.
    render(<BillStagesTab bill={mergedBill()} view="cronologic" />)
    expect(screen.getByText('După 24 iunie 2026')).toBeInTheDocument()
    expect(screen.getByText(/Dată neconsemnată de sursă/)).toBeInTheDocument()
  })

  it('names the record ONLY where it is not already implied by the chamber mark', () => {
    // The Chamber's own fișă records "respinsa de catre Senat" under chamber SE,
    // and the Senate's fișă records the same rejection the same day. Naming the
    // record on the divergent card is what tells the two apart; saying it on
    // every card would be noise the reader learns to skip.
    render(<BillStagesTab bill={mergedBill()} view="cronologic" />)
    const block = dayBlock('24 iunie 2026')
    expect(
      within(block).getByText('consemnat în fișa Camerei Deputaților'),
    ).toBeInTheDocument()
    expect(
      within(block).queryByText('consemnat în fișa Senatului'),
    ).not.toBeInTheDocument()
  })

  it('drops the per-event record chip on a single-record bill', () => {
    render(
      <BillStagesTab
        bill={bill([
          step({
            position: 1,
            chamberCode: 'CD',
            date: '2026-03-23',
            description: 'Etapă unică',
            sourceBillKey: '23135',
          }),
        ])}
        view="cronologic"
      />,
    )
    expect(screen.queryByText(/consemnat în fișa/)).not.toBeInTheDocument()
  })

  it('agrees the numeral with its noun the way Romanian requires', () => {
    // 5 etape / 26 de etape, 98 de zile / 3 zile. Getting this wrong reads as
    // machine output on a page whose whole claim is that a person checked it.
    render(<BillStagesTab bill={mergedBill()} view="cronologic" />)
    expect(screen.getByText(/etape, pe parcursul a/)).toHaveTextContent(
      '5 etape, pe parcursul a 93 de zile',
    )
  })
})

describe('BillStagesTab — the switcher', () => {
  it('reports the chosen view to the caller, which writes it to the URL', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(
      <BillStagesTab
        bill={mergedBill()}
        view="fise"
        onViewChange={onViewChange}
      />,
    )
    await user.click(screen.getByRole('combobox', { name: 'Vizualizare' }))
    await user.click(screen.getByRole('option', { name: 'Cronologic' }))
    expect(onViewChange).toHaveBeenCalledWith('cronologic')
  })

  it('shows the reading currently on screen, not a placeholder', () => {
    render(
      <BillStagesTab bill={mergedBill()} view="fise" onViewChange={vi.fn()} />,
    )
    expect(
      screen.getByRole('combobox', { name: 'Vizualizare' }),
    ).toHaveTextContent('Camere separate')
  })

  it('hides the switcher when the page cannot act on it', () => {
    // Without a handler the control would be a dead end: it would change nothing
    // and the reader would read that as a broken page.
    render(<BillStagesTab bill={mergedBill()} view="fise" />)
    expect(
      screen.queryByRole('combobox', { name: 'Vizualizare' }),
    ).not.toBeInTheDocument()
  })
})

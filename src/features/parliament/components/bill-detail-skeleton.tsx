import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { BillDetailTab } from '../lib/bill-detail-nav'
import {
  BILL_DETAIL_BREADCRUMB_BG,
  BILL_DETAIL_SURFACE,
  BILL_DETAIL_UNSTATED_GREY,
  billDetailCardClassName,
  billDetailPageContainerClassName,
  billDetailSectionTitleClassName,
} from '../lib/bill-detail-theme'
import { BillDetailTabNav } from './bill-detail-tab-nav'
import { ParliamentChamberMark } from './parliament-hub-panel'

type Props = {
  readonly billId: string
  readonly activeTab: BillDetailTab
}

/**
 * Width reserved for the chamber badge's label.
 *
 * The two labels differ a lot — "Camera Deputaților" against "Senat" — so no
 * single reservation is right for both. This is the midpoint. The badge is
 * `shrink-0` at the end of a `justify-between` row, so what moves on arrival is
 * the badge's own edge and nothing below it.
 */
const CHAMBER_BADGE_LABEL_WIDTH = 'w-24'

/**
 * Loading placeholder for a bill dossier.
 *
 * Built to the real page's frame rather than to a single grey slab. Everything
 * the URL already settles is rendered FOR REAL and stays usable: the breadcrumb
 * and its links, the page title, the four tabs with the right one active, and
 * the fixed section headings — `billId` is in the path, so every one of those
 * destinations is known before the response is. Only what the server has yet to
 * say is greyed. Arrival is then a fill-in, not a re-layout, and a reader who
 * lands here on a slow connection can still leave by the tabs or the breadcrumb.
 *
 * The hero band is NEUTRAL GREY, not chamber-coloured: unlike a division, whose
 * chamber is a route param, a bill's originating chamber is one of the facts we
 * are still waiting for. Painting the band green would announce "Camera
 * Deputaților" for a bill that may well be the Senate's.
 *
 * Sections that render conditionally are deliberately NOT reserved — the AI
 * summary (standard-value bills only), the current-document card, the related
 * votes. A block that vanishes on arrival shifts the whole page up, which is
 * worse than one that appears below the fold.
 */
export function BillDetailSkeleton({ billId, activeTab }: Props) {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: BILL_DETAIL_SURFACE }}
      aria-busy="true"
      aria-label="Se încarcă proiectul de lege"
    >
      <header
        className="text-white"
        style={{ backgroundColor: BILL_DETAIL_BREADCRUMB_BG }}
      >
        <div className={billDetailPageContainerClassName}>
          <div className="flex items-start justify-between gap-4 py-5 sm:py-6">
            <div className="min-w-0">
              <p className="text-base font-bold leading-tight">
                Parlamentul României
              </p>
              <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.75rem]">
                Proiecte legislative
              </h1>
            </div>
            <div
              className="flex shrink-0 items-center gap-2 border border-white/25 px-3 py-2"
              style={{ backgroundColor: BILL_DETAIL_UNSTATED_GREY }}
            >
              <ParliamentChamberMark
                color="#ffffff"
                className="mt-0 bg-transparent ring-white/40"
              />
              <Skeleton
                className={cn(
                  'h-4 rounded-none bg-white/30',
                  CHAMBER_BADGE_LABEL_WIDTH,
                )}
              />
            </div>
          </div>

          <nav className="border-t border-white/20 py-3 text-sm" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link
                  to="/parlament"
                  search={{ tab: 'prezentare' }}
                  className="hover:underline"
                >
                  Parlament
                </Link>
              </li>
              <li aria-hidden className="opacity-70">
                ›
              </li>
              <li>
                <Link
                  to="/parlament"
                  search={{ tab: 'proiecte' }}
                  className="hover:underline"
                >
                  Proiecte legislative
                </Link>
              </li>
              <li aria-hidden className="opacity-70">
                ›
              </li>
              <li aria-current="page">
                <span className="sr-only">Se încarcă</span>
                <Skeleton
                  aria-hidden
                  className="inline-block h-4 w-24 rounded-none bg-white/30 align-middle"
                />
              </li>
            </ol>
          </nav>
        </div>
      </header>

      <section
        className="py-8 text-white"
        style={{ backgroundColor: BILL_DETAIL_UNSTATED_GREY }}
      >
        <div
          className={cn(
            billDetailPageContainerClassName,
            'grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start',
          )}
        >
          <div>
            {/* Three title lines: bill titles are full legal titles, and the
                median one wraps to three at this measure. One line would jump
                on nearly every bill. */}
            <Skeleton className="h-8 w-full rounded-none bg-white/25 sm:h-9 lg:h-10" />
            <Skeleton className="mt-2 h-8 w-11/12 rounded-none bg-white/25 sm:h-9 lg:h-10" />
            <Skeleton className="mt-2 h-8 w-2/3 rounded-none bg-white/25 sm:h-9 lg:h-10" />
            <Skeleton className="mt-3 h-6 w-52 rounded-none bg-white/25" />
            <Skeleton className="mt-3 h-6 w-72 rounded-none bg-white/20" />
            <Skeleton className="mt-1 h-5 w-44 rounded-none bg-white/20" />
          </div>

          <div className="min-w-[16rem]">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
              Stadiu curent
            </p>
            <Skeleton className="mt-1 h-7 w-48 rounded-none bg-white/25" />
          </div>
        </div>
      </section>

      <div className={cn(billDetailPageContainerClassName, 'pb-10 pt-6')}>
        <div className={billDetailCardClassName}>
          <BillDetailTabNav billId={billId} activeTab={activeTab} />
          <div className="px-4 py-8 sm:px-6 lg:px-8">
            <BillTabContentSkeleton activeTab={activeTab} billId={billId} />
          </div>
        </div>
      </div>
    </div>
  )
}

/** The tab is settled by the URL, so the placeholder matches the tab you asked for. */
function BillTabContentSkeleton({
  activeTab,
  billId,
}: {
  readonly activeTab: BillDetailTab
  readonly billId: string
}) {
  if (activeTab === 'etape') {
    return <BillStagesTabSkeleton />
  }

  if (activeTab === 'documente') {
    return <BillDocumentsTabSkeleton />
  }

  if (activeTab === 'voturi') {
    return <BillVotesTabSkeleton />
  }

  return <BillDetailsTabSkeleton billId={billId} />
}

function BillDetailsTabSkeleton({ billId }: { readonly billId: string }) {
  return (
    <div className="space-y-10">
      {/* The tab opens straight on the status card. Nothing is reserved above
          it: the AI summary renders for standard-value bills only, and the
          law line only once a bill has been promulgated. */}
      <section>
        <h2 className={billDetailSectionTitleClassName}>Stadiu curent</h2>
        <div
          className={cn(
            billDetailCardClassName,
            'mt-4 grid gap-0 sm:grid-cols-2 lg:max-w-4xl',
          )}
        >
          {/* The two cell labels are fixed text — greying them would make the
              card re-layout on arrival instead of filling in. */}
          <div className="border-b border-[#b1b4b6] px-5 py-4 sm:border-b-0 sm:border-r dark:border-[var(--pnrr-border)]">
            <p className="text-sm font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              Etapa curentă
            </p>
            <Skeleton className="mt-2 h-6 w-40 rounded-none" />
          </div>
          <div className="px-5 py-4">
            <p className="text-sm font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              Localizare
            </p>
            <Skeleton className="mt-2 h-6 w-44 rounded-none" />
            <Skeleton className="mt-3 h-5 w-56 rounded-none" />
          </div>
        </div>
        <Link
          to="/parlament/proiecte/$billId/etape"
          params={{ billId }}
          className="mt-4 inline-flex items-center gap-1 text-base font-semibold text-[#1d70b8] underline underline-offset-4 hover:text-[#003078]"
        >
          Vezi toate etapele parcursului
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      </section>

      <section>
        <h2 className={billDetailSectionTitleClassName}>Inițiator</h2>
        <div className={cn(billDetailCardClassName, 'mt-4 max-w-3xl')}>
          <div className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-52 rounded-none" />
              <Skeleton className="h-4 w-32 rounded-none" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function BillStagesTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* No outcome summary reserved: it renders only for bills that carry a
          law milestone or a related vote, and no hint either — the default
          reading (`cronologic`) has none. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={billDetailSectionTitleClassName}>Parcurs legislativ</h2>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-semibold text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            Vizualizare
          </span>
          <Skeleton className="h-11 w-44 rounded-none" />
        </div>
      </div>

      <div className="space-y-5">
        <Skeleton className="h-5 w-72 rounded-none" />
        {/* The rail's own frame, gutter included, so the steps land in place. */}
        <ol className="ml-[4.25rem] space-y-6 border-l-2 border-[#b1b4b6] pl-5 sm:ml-[7rem] dark:border-[var(--pnrr-border)]">
          {[0, 1, 2, 3].map((step) => (
            <li key={step} className="space-y-2">
              <Skeleton className="h-5 w-40 rounded-none" />
              <Skeleton className="h-6 w-full max-w-[28rem] rounded-none" />
              <Skeleton className="h-4 w-32 rounded-none" />
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function BillDocumentsTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* The heading is greyed, not written: a bill with no documents shows a
          plain sentence instead, and printing "Documente" over it would be a
          heading for a section that never came. */}
      <Skeleton className="h-7 w-40 rounded-none" />
      <div className="space-y-4">
        {[0, 1, 2].map((document) => (
          <div
            key={document}
            className={cn(
              billDetailCardClassName,
              'flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between',
            )}
          >
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-5 w-64 rounded-none" />
              <Skeleton className="h-4 w-40 rounded-none" />
            </div>
            <Skeleton className="h-10 w-36 shrink-0 rounded-none" />
          </div>
        ))}
      </div>
    </div>
  )
}

function BillVotesTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Greyed for the same reason as the documents heading: a bill with no
          related divisions renders a sentence here, not a section. */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded-none" />
        <Skeleton className="h-5 w-full max-w-[26rem] rounded-none" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((vote) => (
          <div key={vote} className={cn(billDetailCardClassName, 'p-5')}>
            <Skeleton className="h-4 w-28 rounded-none" />
            <Skeleton className="mt-3 h-6 w-full max-w-[18rem] rounded-none" />
            <Skeleton className="mt-3 h-5 w-40 rounded-none" />
          </div>
        ))}
      </div>
    </div>
  )
}

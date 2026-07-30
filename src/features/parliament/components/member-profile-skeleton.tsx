import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  MEMBER_DETAIL_TAB_LABELS,
  type MemberDetailTab,
} from '../lib/member-detail-nav'
import { getChamberFromMandateKey } from '../lib/member-mandate-key'
import {
  getMemberDetailHeroColor,
  MEMBER_DETAIL_BREADCRUMB_BG,
  MEMBER_DETAIL_MUTED_TEXT,
  MEMBER_DETAIL_SIDEBAR_WIDTH,
  MEMBER_DETAIL_SURFACE,
  memberDetailBodyGridClassName,
  memberDetailBodyShellClassName,
  memberDetailCardLabelClassName,
  memberDetailCareerCardBodyClassName,
  memberDetailCareerCardClassName,
  memberDetailCareerCardFooterClassName,
  memberDetailContactCardClassName,
  memberDetailContentPanelClassName,
  memberDetailNoticeClassName,
  memberDetailPageContainerClassName,
  memberDetailSectionIntroClassName,
  memberDetailSectionTitleClassName,
  memberDetailSidebarColumnClassName,
} from '../lib/member-detail-theme'
import { MemberDetailSidebar } from './member-detail-sidebar'

type Props = {
  readonly memberId: string
  readonly activeTab: MemberDetailTab
}

/**
 * Loading placeholder for a member profile.
 *
 * Built to the real page's frame rather than to the single grey slab that stood
 * here before. Everything the URL already settles is rendered FOR REAL and
 * stays usable: the breadcrumb and its links, the chamber's hero colour and its
 * name, the whole profile sidebar with the right section highlighted, and the
 * section heading of the tab that was asked for. `memberId` is in the path, so
 * every one of those destinations is known before the response is — a reader
 * who lands here on a slow connection can still read where they are and leave.
 *
 * The chamber comes from the mandate key (`2:2024:133` — see
 * `getChamberFromMandateKey`), the way a division's chamber comes from its
 * route param. A key we cannot read falls back to a NEUTRAL band rather than
 * announcing the wrong chamber over someone's name.
 *
 * Only what the server has yet to say is greyed, and blocks that render
 * conditionally are deliberately not reserved — the "mandate încheiat" badge,
 * the role line, the contact cards a member may not publish. A block that
 * vanishes on arrival shifts the whole page up.
 */
export function MemberProfileSkeleton({ memberId, activeTab }: Props) {
  const chamber = getChamberFromMandateKey(memberId)

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: MEMBER_DETAIL_SURFACE }}
      aria-busy="true"
      aria-label="Se încarcă profilul parlamentarului"
    >
      <nav
        className="py-3 text-sm text-white"
        style={{ backgroundColor: MEMBER_DETAIL_BREADCRUMB_BG }}
        aria-label="Breadcrumb"
      >
        <div className={memberDetailPageContainerClassName}>
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
                search={{ tab: 'grupuri' }}
                className="hover:underline"
              >
                Membri
              </Link>
            </li>
            <li aria-hidden className="opacity-70">
              ›
            </li>
            <li>
              <span className="sr-only">Se încarcă</span>
              <Skeleton
                aria-hidden
                className="inline-block h-4 w-28 rounded-none bg-white/30 align-middle"
              />
            </li>
            <li aria-hidden className="opacity-70">
              ›
            </li>
            {/* The tab IS settled by the URL, so the last crumb is written. */}
            <li className="font-semibold" aria-current="page">
              {MEMBER_DETAIL_TAB_LABELS[activeTab]}
            </li>
          </ol>
        </div>
      </nav>

      <section
        className="py-8 text-white"
        style={{
          // The neutral band is the grey the bill hero waits in — a colour that
          // claims no chamber, for the keys we cannot read.
          backgroundColor: chamber
            ? getMemberDetailHeroColor(chamber)
            : MEMBER_DETAIL_MUTED_TEXT,
        }}
      >
        <div
          className={cn(
            memberDetailPageContainerClassName,
            'grid gap-8 lg:grid-cols-[minmax(0,1fr)_13rem] lg:items-end',
          )}
        >
          <div className="max-w-3xl">
            {chamber ? (
              <p className="text-sm font-bold uppercase tracking-wide text-white/85">
                {chamber === 'camera' ? 'Camera Deputaților' : 'Senatul României'}
              </p>
            ) : (
              <Skeleton className="h-5 w-44 rounded-none bg-white/25" />
            )}
            {/* One title line: a member's name is a name — across ten profiles
                measured at this width, none of them wrapped. */}
            <Skeleton className="mt-2 h-9 w-full max-w-[26rem] rounded-none bg-white/25 sm:h-10 lg:h-12" />
            {/* Two blurb lines: the sentence carries a county AND a group name,
                and wrapped once on six of those ten. */}
            <Skeleton className="mt-4 h-6 w-full rounded-none bg-white/20 sm:h-7" />
            <Skeleton className="mt-2 h-6 w-3/5 rounded-none bg-white/20 sm:h-7" />
          </div>

          {/* The portrait well, including the overhang into the body below it —
              drop that and everything under the hero starts 3.5rem too high. */}
          <div className="lg:-mb-14 lg:justify-self-end">
            <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_4px_14px_rgba(11,12,12,0.2)] sm:h-44 sm:w-44 lg:h-52 lg:w-52">
              <Skeleton className="h-full w-full rounded-full" />
            </div>
          </div>
        </div>
      </section>

      <div className={cn(memberDetailPageContainerClassName, 'pb-10 pt-6 lg:pt-8')}>
        <div
          className={cn(memberDetailBodyShellClassName, memberDetailBodyGridClassName)}
          style={{ '--member-detail-sidebar': MEMBER_DETAIL_SIDEBAR_WIDTH } as CSSProperties}
        >
          <aside className={memberDetailSidebarColumnClassName}>
            <MemberDetailSidebar memberId={memberId} activeTab={activeTab} />
          </aside>
          <main className={memberDetailContentPanelClassName}>
            <MemberTabContentSkeleton activeTab={activeTab} />
          </main>
        </div>
      </div>
    </div>
  )
}

/** The tab is settled by the URL, so the placeholder matches the tab you asked for. */
function MemberTabContentSkeleton({
  activeTab,
}: {
  readonly activeTab: MemberDetailTab
}) {
  return (
    <div className="space-y-8">
      <div>
        {activeTab === 'contact' ? (
          // The only heading that carries the member's name — "Contact X" —
          // so the fixed half is written and the name is greyed in place.
          <h2 className={memberDetailSectionTitleClassName}>
            Contact{' '}
            <Skeleton
              aria-hidden
              className="inline-block h-6 w-44 rounded-none align-middle"
            />
          </h2>
        ) : (
          <h2 className={memberDetailSectionTitleClassName}>
            {MEMBER_DETAIL_TAB_LABELS[activeTab]}
          </h2>
        )}
        {/* One intro line. Every tab's intro names the member, so none of it can
            be written; at this measure the sentence holds one line. */}
        <div className={memberDetailSectionIntroClassName}>
          <Skeleton className="h-5 w-full max-w-2xl rounded-none" />
        </div>
      </div>

      <MemberTabBodySkeleton activeTab={activeTab} />
    </div>
  )
}

function MemberTabBodySkeleton({
  activeTab,
}: {
  readonly activeTab: MemberDetailTab
}) {
  if (activeTab === 'overview') {
    return (
      <>
        <NoticeSkeleton lines={2} />
        <section className="space-y-6">
          <div className="space-y-2">
            {/* "Curent" or "Mandat încheiat" — which one is exactly what the
                response decides, so this heading cannot be written. */}
            <Skeleton className="h-6 w-40 rounded-none" />
            <Skeleton className="h-4 w-full max-w-lg rounded-none" />
          </div>
          <div className="space-y-8">
            {/* Both card labels are fixed text on every profile. */}
            <CareerCardSkeleton label="Reprezentare" />
            <CareerCardSkeleton label="Afiliere la grup parlamentar" />
          </div>
        </section>
      </>
    )
  }

  if (activeTab === 'contact') {
    return (
      <>
        <NoticeSkeleton lines={3} />
        {/* One card, not the three the tab can show: address, phone and email
            are each published for only some members. */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded-none" />
          <section className={cn(memberDetailContactCardClassName, 'p-5 sm:p-6')}>
            <div className="flex gap-4">
              <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-full max-w-md rounded-none" />
                <Skeleton className="h-5 w-40 rounded-none" />
              </div>
            </div>
          </section>
        </div>
      </>
    )
  }

  if (activeTab === 'voturi') {
    return (
      <>
        <section className="space-y-4">
          <div>
            {/* Fixed text on every profile — heading and explanation both. */}
            <h3 className={memberDetailSectionTitleClassName}>
              Activitatea de vot
            </h3>
            <p className={memberDetailSectionIntroClassName}>
              Fiecare pătrat reprezintă o zi; intensitatea arată câte voturi a
              exprimat parlamentarul. Faceți clic pe o zi pentru a filtra lista.
            </p>
          </div>
          <ActivityGridSkeleton />
        </section>
        <ToolbarSkeleton />
        <NoticeSkeleton lines={2} />
        <ActivityRowsSkeleton />
      </>
    )
  }

  if (activeTab === 'interventii') {
    return (
      <>
        <ToolbarSkeleton withSearch />
        {/* The day grid ships COLLAPSED behind a summary row, so only the row
            is reserved — opening it is the reader's choice, not the loader's. */}
        <div className="border-2 border-[#b1b4b6] bg-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]">
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <Skeleton className="h-5 w-56 rounded-none" />
            <Skeleton className="h-5 w-16 rounded-none" />
          </div>
        </div>
        <ActivityRowsSkeleton />
      </>
    )
  }

  // `alegeri` and `portret` have no live backing: both render a short notice
  // saying the dataset is not integrated yet, and nothing else.
  if (activeTab === 'alegeri' || activeTab === 'portret') {
    return <NoticeSkeleton lines={2} />
  }

  // initiative · intrebari · interese — a notice over a list of rows.
  return (
    <>
      <NoticeSkeleton lines={2} />
      <ActivityRowsSkeleton />
    </>
  )
}

function NoticeSkeleton({ lines }: { readonly lines: number }) {
  return (
    <aside className={memberDetailNoticeClassName}>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, line) => (
          <Skeleton
            // Keyed by POSITION: the placeholder lines are interchangeable.
            key={line}
            className={cn(
              'h-4 rounded-none',
              line === lines - 1 ? 'w-2/3' : 'w-full',
            )}
          />
        ))}
      </div>
    </aside>
  )
}

/** One career card — the label is written, the card's own facts are not. */
function CareerCardSkeleton({ label }: { readonly label: string }) {
  return (
    <div className="space-y-2">
      <h3 className={memberDetailCardLabelClassName}>{label}</h3>
      <div className={memberDetailCareerCardClassName}>
        <div className={memberDetailCareerCardBodyClassName}>
          <div className="flex min-w-0 flex-1 items-start justify-between gap-4 px-5 py-5 sm:px-6">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-52 rounded-none" />
              <Skeleton className="h-4 w-full max-w-md rounded-none" />
            </div>
          </div>
        </div>
        <div className={memberDetailCareerCardFooterClassName}>
          <Skeleton className="h-4 w-36 rounded-none" />
          <Skeleton className="h-6 w-32 rounded-none" />
        </div>
      </div>
    </div>
  )
}

/** The heatmap's own frame: the year rail beside a grid-sized block. */
function ActivityGridSkeleton() {
  return (
    <div className="flex gap-4">
      <Skeleton className="h-32 min-w-0 flex-1 rounded-none" />
      <div className="hidden shrink-0 space-y-2 lg:block">
        {[0, 1, 2].map((year) => (
          <Skeleton key={year} className="h-8 w-16 rounded-none" />
        ))}
      </div>
    </div>
  )
}

function ToolbarSkeleton({ withSearch = false }: { readonly withSearch?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {withSearch ? <Skeleton className="h-11 min-w-0 flex-1 rounded-none" /> : null}
      <Skeleton className="h-11 w-44 shrink-0 rounded-none" />
    </div>
  )
}

/** Three rows in `MemberProfileActivityRow`'s frame, accent rail included. */
function ActivityRowsSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((row) => (
        <div key={row} className={memberDetailCareerCardClassName}>
          <div className={memberDetailCareerCardBodyClassName}>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-4 px-5 py-4 sm:px-6">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-full max-w-lg rounded-none" />
                <Skeleton className="h-4 w-40 rounded-none" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

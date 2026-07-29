import { useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import parliamentHeader1280 from '../assets/header-parliament-allegory-1280.png'
import parliamentHeader768 from '../assets/header-parliament-allegory-768.png'
import {
  useParliamentFreshness,
  useParliamentHub,
} from '../hooks/use-parliament-data'
import { formatSyncDate } from '../lib/formatting'
import {
  parliamentHeaderDescriptionClassName,
  parliamentHeaderHeroClassName,
  parliamentHeaderMetaClassName,
  parliamentHeaderStatClassName,
  parliamentHeaderStatLabelClassName,
  parliamentHeaderStatValueClassName,
  parliamentHeaderTitleClassName,
  parliamentHeaderTitleLineClassName,
  parliamentHeaderTitleStyle,
} from '../lib/header-theme'
import { formatParliamentVoteDay } from '../lib/freshness-format'
import { ParliamentInfoSheet } from './parliament-info-sheet'
import { ParliamentTabNav, type ParliamentTab } from './parliament-tab-nav'

type Props = {
  readonly activeTab: ParliamentTab
  readonly children: ReactNode
  readonly actions?: ReactNode
}

/** Shared layout — UK Parliament typography on default surface */
export function ParliamentShell({ activeTab, children, actions }: Props) {
  const [infoOpen, setInfoOpen] = useState(false)
  const { data } = useParliamentHub()
  const { data: freshness } = useParliamentFreshness()

  const legislatureLabel = data?.legislature.label ?? 'Legislatura curentă'
  const lastSynced = data?.lastSyncedAt
  // The freshness line used to sit on the hub body, repeating "Actualizat …"
  // that this meta line already carries. Only the part it ADDS moves up here.
  const latestVote = formatParliamentVoteDay(freshness?.latestVoteDate)

  return (
    <div className="min-h-screen min-w-0 bg-background">
      <header className="border-b-2 border-[var(--pnrr-border)] bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              parliamentHeaderHeroClassName,
              'relative overflow-hidden xl:min-h-[32rem]',
            )}
          >
            <div
              className="pointer-events-none absolute inset-y-0 right-0 hidden w-[74%] items-end justify-end xl:flex"
              aria-hidden="true"
            >
              <img
                src={parliamentHeader768}
                srcSet={`${parliamentHeader768} 768w, ${parliamentHeader1280} 1280w`}
                sizes="(min-width: 1280px) 74vw, 0px"
                width={1280}
                height={687}
                alt=""
                loading="eager"
                decoding="async"
                fetchPriority="high"
                draggable={false}
                className="h-full w-full object-contain object-right-bottom"
              />
            </div>

            <div className="absolute right-0 top-0 z-20 flex items-center gap-2 sm:top-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-none border-2"
                onClick={() => setInfoOpen(true)}
                aria-label="Informații despre date"
              >
                <Info className="h-4 w-4" aria-hidden />
              </Button>
              {actions}
            </div>

            <div className="relative z-10 min-w-0 pr-12 xl:max-w-[48%] xl:pr-0">
              <h1
                className={parliamentHeaderTitleClassName}
                style={parliamentHeaderTitleStyle}
              >
                <span className={parliamentHeaderTitleLineClassName}>
                  Parlamentul
                </span>
                <span className={parliamentHeaderTitleLineClassName}>
                  României
                </span>
              </h1>
              <p
                className={cn(
                  parliamentHeaderDescriptionClassName,
                  'mt-6 sm:mt-8',
                )}
              >
                Parlamentul României este format din Camera Deputaților și
                Senat. Cele două camere adoptă legi, controlează activitatea
                Guvernului și dezbat deciziile importante pentru țară.
              </p>
              <p className={cn(parliamentHeaderMetaClassName, 'mt-4')}>
                {legislatureLabel}
                {lastSynced
                  ? ` · Actualizat ${formatSyncDate(lastSynced)}`
                  : null}
                {latestVote
                  ? ` · ultimul vot înregistrat: ${latestVote}`
                  : null}
              </p>

              {data ? (
                <div className="mt-8 flex flex-wrap gap-3">
                  <div className={parliamentHeaderStatClassName}>
                    <span className={parliamentHeaderStatValueClassName}>
                      {data.memberCountByChamber.camera}
                    </span>
                    <span className={parliamentHeaderStatLabelClassName}>
                      deputați
                    </span>
                  </div>
                  <div className={parliamentHeaderStatClassName}>
                    <span className={parliamentHeaderStatValueClassName}>
                      {data.memberCountByChamber.senat}
                    </span>
                    <span className={parliamentHeaderStatLabelClassName}>
                      senatori
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t-2 border-[var(--pnrr-border)]">
            <ParliamentTabNav activeTab={activeTab} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <ParliamentInfoSheet
        open={infoOpen}
        onOpenChange={setInfoOpen}
        lastSyncedAt={lastSynced}
        sources={data?.sources}
      />
    </div>
  )
}

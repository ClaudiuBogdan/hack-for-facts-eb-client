import { useState } from 'react'
import type { ReactNode } from 'react'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { HUB_BESIDE_TITLE_CLASS, HubLoadError, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { ProcurementHomeMoney, ProcurementHomeSellers } from '@/schemas/procurement-home'
import type { HomeCategoriesRead } from '../../api/procurement-home-api'
import { HOME_BIG_CONTRACTS } from '../../hooks/use-procurement-home'
import { categoryOfCode, frequentWinners } from '../../lib/home-categories'
import type { NationalRead, RecentRecord } from '../../lib/home-model'
import { consortiumLede, frequentLede, whatLede } from '../../lib/home-text'
import { HomeBand, ProvisionalMark, RULED_NOTE_CLASS, SHOW_MORE_CLASS, ShowMorePending, TextPending, type NationalState } from './home-chrome'
import { CategoryRows, PARTY_ROWS, PartyRows, PendingRows, RecordRows } from './home-rows'

/** A lede about contract money carries its provisional mark beside it. */
function withMark(text: string | null): ReactNode {
  return text ? (
    <>
      {text} <ProvisionalMark />
    </>
  ) : null
}

/** Enough categories to cover most of the money; the rest one click away. */
const CATEGORY_ROWS = 8

/** A money lede while its read is pending: the five lines these ledes take, six on a phone. */
const MONEY_LEDE_PENDING = <TextPending lines={5} narrow={6} />

interface ReadState<T> {
  readonly data: T | undefined
  readonly isError: boolean
  readonly retry: () => void
}

// ─────────────────────────────────────────────────── where the money goes ──

export function HomeWhatBand({
  year,
  index,
  categories,
  money,
  onMoney,
}: {
  readonly year: number
  readonly index: string
  readonly categories: ReadState<HomeCategoriesRead>
  readonly money: ProcurementHomeMoney
  readonly onMoney: (money: ProcurementHomeMoney) => void
}) {
  const { i18n } = useLingui()
  const [open, setOpen] = useState(false)
  const grain = money === 'contracte' ? 'contract' : 'direct'
  const rows = categories.data?.[grain] ?? []
  return (
    <HomeBand id="ce" labelledBy="procurement-home-what-title">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <HubSectionHead
            titleId="procurement-home-what-title"
            index={index}
            title={
              <Trans>
                Pe ce se duc
                <br />
                banii publici
              </Trans>
            }
            lede={categories.data ? withMark(whatLede(categories.data, year, i18n)) : categories.isError ? null : MONEY_LEDE_PENDING}
          />
        </div>
        <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <div className="sm:w-fit">
            <IndicatorToggle
              label={t`Banii din`}
              options={[
                { key: 'contracte', label: t`Contracte` },
                { key: 'directe', label: t`Achiziții directe` },
              ]}
              value={money}
              onChange={onMoney}
            />
          </div>
          {categories.isError && !categories.data ? (
            <div className="mt-5">
              <HubLoadError onRetry={categories.retry} />
            </div>
          ) : categories.data ? (
            <>
              <CategoryRows key={grain} className="mt-5" rows={open ? rows : rows.slice(0, CATEGORY_ROWS)} grain={grain} />
              {rows.length > CATEGORY_ROWS ? (
                <button
                  type="button"
                  onClick={() => setOpen((value) => !value)}
                  className={SHOW_MORE_CLASS}
                  aria-expanded={open}
                >
                  {open ? <Trans>Arată mai puține</Trans> : plural(rows.length, { few: 'Toate cele # categorii', other: 'Toate cele # de categorii' })}
                </button>
              ) : null}
            </>
          ) : (
            <>
              <PendingRows className="mt-5" shape="category" rows={CATEGORY_ROWS} />
              <ShowMorePending className="w-44" />
            </>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {money === 'contracte' ? (
              <>
                <Trans>Valoarea atribuită a contractelor din {year}.</Trans> <ProvisionalMark />
              </>
            ) : (
              <Trans>Valoarea achizițiilor directe din {year}, fără TVA.</Trans>
            )}{' '}
            <Trans>Categoriile grupează codurile CPV ale achizițiilor.</Trans>
          </p>
        </div>
      </div>
    </HomeBand>
  )
}

// ─────────────────────────────────────────────────────────── who sells ──

export function HomeSellersBand({
  year,
  read,
  national,
  index,
  bigContracts,
  roadsConsortium,
  sellers,
  onSellers,
}: {
  readonly year: number
  /** Absent while the national read is pending or failed: the band stands on the largest contracts. */
  readonly read: NationalRead | undefined
  /** The national read failed: the direct sellers come from it. */
  readonly national: NationalState
  readonly index: string
  readonly bigContracts: ReadState<readonly RecentRecord[]>
  readonly roadsConsortium: HomeCategoriesRead['roadsConsortium']
  readonly sellers: ProcurementHomeSellers
  readonly onSellers: (sellers: ProcurementHomeSellers) => void
}) {
  const { i18n } = useLingui()
  const frequent = bigContracts.data ? frequentWinners(bigContracts.data) : null
  // A contract whose title SEAP left empty is named by what it bought.
  const categoryOf = (record: RecentRecord) => (record.cpvCode ? i18n._(categoryOfCode(record.cpvCode).label) : null)
  return (
    <HomeBand id="cine-vinde" labelledBy="procurement-home-sellers-title">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <HubSectionHead
            titleId="procurement-home-sellers-title"
            index={index}
            title={
              <Trans>
                Firmele care
                <br />
                vând statului
              </Trans>
            }
            lede={read ? withMark(consortiumLede(read, roadsConsortium)) : national.isError ? null : MONEY_LEDE_PENDING}
          />
          {frequent && bigContracts.data ? (
            <p className={RULED_NOTE_CLASS} data-reveal>
              {frequentLede(frequent, bigContracts.data.length, year)}
            </p>
          ) : !bigContracts.data && !bigContracts.isError ? (
            <p className={RULED_NOTE_CLASS}>
              <TextPending lines={2} narrow={3} />
            </p>
          ) : null}
        </div>
        <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <div className="sm:w-fit">
            <IndicatorToggle
              label={t`Arată`}
              options={[
                { key: 'contracte', label: t`Cele mai mari contracte` },
                { key: 'directe', label: t`Achiziții directe` },
              ]}
              value={sellers}
              onChange={onSellers}
            />
          </div>
          {sellers === 'directe' ? (
            read ? (
              <PartyRows className="mt-5" ranking={read.directSellers} grain="direct" kind="supplier" year={year} />
            ) : national.isError ? (
              <div className="mt-5">
                <HubLoadError onRetry={national.retry} />
              </div>
            ) : (
              <PendingRows className="mt-5" shape="party" rows={PARTY_ROWS} />
            )
          ) : bigContracts.isError && !bigContracts.data ? (
            <div className="mt-5">
              <HubLoadError onRetry={bigContracts.retry} />
            </div>
          ) : bigContracts.data ? (
            <RecordRows className="mt-5" records={bigContracts.data} lead="winners" fallbackTitle={categoryOf} />
          ) : (
            <PendingRows className="mt-5" shape="record" rows={HOME_BIG_CONTRACTS} />
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {sellers === 'directe' ? (
              read?.directSellers.rankedBy === 'count' ? (
                <Trans>Firmele, după numărul vânzărilor directe din {year}: cumpărături mici, din catalogul SEAP.</Trans>
              ) : (
                <Trans>Firmele, după valoarea vânzărilor directe din {year}, fără TVA: cumpărături mici, din catalogul SEAP.</Trans>
              )
            ) : (
              <>
                <Trans>Contractele atribuite în {year}, după valoare, cu toate firmele câștigătoare; valoarea e a întregului contract.</Trans>{' '}
                <ProvisionalMark />
              </>
            )}
          </p>
        </div>
      </div>
    </HomeBand>
  )
}


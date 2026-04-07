import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowRight } from 'lucide-react'
import funkyLogo from '@/assets/logo/funky-logo.png'
import { Button } from '@/components/ui/button'
import { buildCampaignProvocariPath } from '@/features/challenges/constants'
import type { CampaignLocale } from '../types'
import { cn } from '@/lib/utils'

type CampaignAccessShareCardProps = {
  readonly entityCui: string
  readonly locale: CampaignLocale
  readonly className?: string
}

export function CampaignAccessShareCard({
  entityCui,
  locale,
  className,
}: CampaignAccessShareCardProps) {
  const campaignSearch = locale === 'en' ? { lang: 'en' as const } : undefined

  return (
    <article
      className={cn(
        'w-full max-w-[54rem] rounded-[30px] border border-[#ef2d00]/12 bg-linear-to-r from-white via-orange-50/55 to-[#3565c4]/[0.08] p-5 shadow-sm sm:p-6 md:p-7',
        className,
      )}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <img
            src={funkyLogo}
            alt="Funky Citizens"
            className="h-14 w-14 shrink-0 rounded-2xl shadow-sm ring-1 ring-black/5"
          />
          <div className="min-w-0">
            <p className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {t`Challenges`}
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:text-xs">
              {t`Eyes on Local Budgets`}
            </p>
          </div>
        </div>

        <Button
          asChild
          size="lg"
          className="h-12 rounded-full bg-[#3565c4] px-6 text-base font-semibold shadow-lg shadow-[#3565c4]/20 hover:bg-[#2d57a8]"
        >
          <Link
            to={buildCampaignProvocariPath(entityCui) as '/'}
            search={campaignSearch}
          >
            {t`Open campaign`}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </article>
  )
}

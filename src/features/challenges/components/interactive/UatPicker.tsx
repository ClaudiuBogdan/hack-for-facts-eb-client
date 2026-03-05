import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { i18n } from '@lingui/core'
import { ArrowRight, CheckCircle2, MapPin, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CampaignEntitySelectorGate,
  type EntitySelection,
} from '@/features/campaigns/local-budget-2026/components/hub/campaign-entity-selector-gate'
import { useCampaignProgress } from '@/features/campaigns/local-budget-2026/hooks/use-campaign-progress'
import { useLessonCompletion } from '@/features/learning/hooks/use-learning-interactions'
import { getEntityLabels } from '@/lib/api/labels'
import { CHALLENGES_BASE_PATH } from '../../constants'
import type { CampaignLocale } from '@/features/campaigns/local-budget-2026/types'

type UatPickerProps = {
  readonly contentId: string
}

type SelectedEntity = {
  readonly cui: string
  readonly name: string
  readonly countyName?: string | null
}

export function UatPicker({ contentId }: UatPickerProps) {
  const { progress, setSelectedEntity } = useCampaignProgress()
  const { markComplete } = useLessonCompletion({ contentId })
  const autoCompletedRef = useRef(false)

  const [selected, setSelected] = useState<SelectedEntity | null>(() => {
    const cui = progress.selectedEntityCui
    return cui ? { cui, name: '', countyName: null } : null
  })

  // Auto-complete the step if a UAT was already selected (page reload)
  useEffect(() => {
    if (selected && !autoCompletedRef.current) {
      autoCompletedRef.current = true
      void markComplete()
    }
  }, [selected, markComplete])

  // Resolve name + county when we only have a CUI (page reload)
  useEffect(() => {
    if (!selected || selected.name) return
    let cancelled = false
    getEntityLabels([selected.cui]).then((results) => {
      if (cancelled) return
      const match = results.find((r) => r.id === selected.cui)
      if (match) {
        setSelected((prev) =>
          prev?.cui === selected.cui
            ? { cui: prev.cui, name: match.label, countyName: match.countyName }
            : prev,
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [selected])

  const locale = (i18n.locale === 'en' ? 'en' : 'ro') as CampaignLocale

  const handleEntitySelected = useCallback(
    (entity: EntitySelection) => {
      setSelected({
        cui: entity.cui,
        name: entity.name,
        countyName: entity.countyName,
      })
      setSelectedEntity({ entityCui: entity.cui })
      void markComplete()
    },
    [setSelectedEntity, markComplete],
  )

  const handleChange = () => {
    setSelected(null)
  }

  if (selected) {
    return (
      <div className="my-6 space-y-4">
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {t`Selected`}
            </p>
            <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100 truncate">
              {selected.name || selected.cui}
            </p>
            {selected.countyName && (
              <p className="flex items-center gap-1 text-sm text-emerald-700/70 dark:text-emerald-300/70">
                <MapPin className="h-3 w-3" />
                {selected.countyName}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleChange}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t`Change`}
          </button>
        </div>

        <div className="flex justify-center">
          <Button
            asChild
            className="rounded-2xl h-12 px-8 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Link to={CHALLENGES_BASE_PATH as '/'}>
              {t`Continue to challenges`}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="my-6">
      <CampaignEntitySelectorGate
        locale={locale}
        onEntitySelected={handleEntitySelected}
      />
    </div>
  )
}

import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { PnrrGranularity, PnrrEntityType } from '@/schemas/pnrr'
import type { PnrrMapSeriesId } from '../hooks/usePnrrMapSeries'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Filter } from 'lucide-react'
import { useState } from 'react'

const GRANULARITY_OPTIONS: { readonly id: PnrrGranularity; readonly label: string }[] = [
  { id: 'national', label: t`Național` },
  { id: 'county', label: t`Județ` },
  { id: 'uat', label: t`UAT` },
]

const ENTITY_TYPE_OPTIONS: { readonly id: PnrrEntityType; readonly label: string }[] = [
  { id: 'public', label: t`Instituții publice` },
  { id: 'private', label: t`Companii private` },
  { id: 'national', label: t`Entități naționale` },
]

const SERIES_OPTIONS: { readonly id: PnrrMapSeriesId; readonly label: string }[] = [
  { id: 'total-value', label: t`Valoare totală` },
  { id: 'project-count', label: t`Număr proiecte` },
  { id: 'per-capita', label: t`Per capita` },
  { id: 'grant-share', label: t`Grant %` },
  { id: 'implementation-rate', label: t`Implementat %` },
]

interface PnrrMapFilterPanelProps {
  readonly granularity: PnrrGranularity
  readonly setGranularity: (value: PnrrGranularity) => void
  readonly entityTypes: readonly PnrrEntityType[] | undefined
  readonly setEntityTypes: (values: PnrrEntityType[]) => void
  readonly activeSeriesId: PnrrMapSeriesId
  readonly setActiveSeriesId: (value: PnrrMapSeriesId) => void
  readonly includeNational: boolean | undefined
  readonly setIncludeNational: (value: boolean) => void
}

export function PnrrMapFilterPanel({
  granularity,
  setGranularity,
  entityTypes,
  setEntityTypes,
  activeSeriesId,
  setActiveSeriesId,
  includeNational,
  setIncludeNational,
}: PnrrMapFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleEntityType = (id: PnrrEntityType) => {
    const current = entityTypes ?? []
    if (current.includes(id)) {
      setEntityTypes(current.filter((t) => t !== id))
    } else {
      setEntityTypes([...current, id])
    }
  }

  return (
    <div className="space-y-3">
      {/* Mobile toggle */}
      <div className="flex items-center gap-2 sm:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={cn('gap-1.5', isOpen && 'bg-accent')}
        >
          <Filter className="h-3.5 w-3.5" />
          {isOpen ? t`Ascunde filtre` : t`Filtre avansate`}
        </Button>
      </div>

      <div className={cn('space-y-4', !isOpen && 'hidden sm:block')}>
        {/* Granularity */}
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Trans>Granularitate</Trans>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {GRANULARITY_OPTIONS.map((opt) => {
              const isActive = granularity === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setGranularity(opt.id)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background text-foreground hover:bg-accent'
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </section>

        <Separator />

        {/* Aggregation metric */}
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Trans>Agregare</Trans>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {SERIES_OPTIONS.map((opt) => {
              const isActive = activeSeriesId === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setActiveSeriesId(opt.id)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background text-foreground hover:bg-accent'
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </section>

        <Separator />

        {/* Entity type */}
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Trans>Tip entitate</Trans>
          </h4>
          <div className="space-y-2">
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <div key={opt.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`entity-${opt.id}`}
                  checked={(entityTypes ?? []).includes(opt.id)}
                  onCheckedChange={() => toggleEntityType(opt.id)}
                />
                <Label htmlFor={`entity-${opt.id}`} className="text-xs font-normal cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Include national */}
        <section className="flex items-center justify-between">
          <Label htmlFor="include-national" className="text-xs font-normal cursor-pointer">
            <Trans>Include proiecte naționale</Trans>
          </Label>
          <Switch
            id="include-national"
            checked={includeNational ?? true}
            onCheckedChange={setIncludeNational}
          />
        </section>
      </div>
    </div>
  )
}

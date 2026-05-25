import { useMemo } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StyledMultiSelect } from '@/components/ui/styled-multi-select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import type { ParliamentMembersSearch } from '@/schemas/parliament'
import { useParliamentGroups, useParliamentJudete } from '../hooks/use-parliament-data'
import { getChamberLabel } from '../lib/formatting'
import {
  getGrupFilterValues,
  getJudetFilterValues,
  getPanelFilterCount,
} from '../lib/member-search'
import { parliamentFilterLabelClassName } from '../lib/table-theme'

const FILTER_TOGGLE_ITEM_CLASS =
  'h-10 min-w-0 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-2 text-sm font-black text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-bg)] data-[state=on]:bg-[var(--pnrr-fg)] data-[state=on]:text-[var(--pnrr-bg)] sm:px-4'

type SheetProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly search: ParliamentMembersSearch
  readonly onSearchChange: (search: ParliamentMembersSearch) => void
}

/** PNRR-style side panel for member directory filters */
export function MembersFilterSheet({
  open,
  onOpenChange,
  search,
  onSearchChange,
}: SheetProps) {
  const { data: groups = [] } = useParliamentGroups()
  const { data: judete = [] } = useParliamentJudete()
  const activeCount = getPanelFilterCount(search)

  const filteredGroups =
    search.chamber && search.chamber !== 'all'
      ? groups.filter((group) => group.chamber === search.chamber)
      : groups.filter(
          (group, index, groupList) =>
            groupList.findIndex(
              (entry) =>
                (entry.shortName ?? entry.name) === (group.shortName ?? group.name),
            ) === index,
        )

  const groupOptions = useMemo(
    () =>
      filteredGroups.map((group) => ({
        value: group.groupId,
        label: group.shortName ?? group.name,
        description:
          search.chamber && search.chamber !== 'all'
            ? undefined
            : getChamberLabel(group.chamber),
      })),
    [filteredGroups, search.chamber],
  )

  const selectedGroups = getGrupFilterValues(search)

  const judetOptions = useMemo(
    () =>
      judete.map((judet) => ({
        value: judet.slug,
        label: judet.name,
        searchText: judet.name,
      })),
    [judete],
  )

  const selectedJudete = getJudetFilterValues(search)

  const handleClearPanelFilters = () => {
    onSearchChange({
      ...search,
      chamber: undefined,
      grup: undefined,
      judet: undefined,
      page: 1,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="flex w-full max-w-full flex-col overflow-hidden border-l-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-0 sm:max-w-xl [&>button.absolute]:right-5 [&>button.absolute]:top-5 [&>button.absolute]:h-8 [&>button.absolute]:w-8 [&>button.absolute]:rounded-none [&>button.absolute]:bg-transparent [&>button.absolute]:opacity-100 [&>button.absolute]:ring-offset-0 [&>button.absolute]:hover:bg-[var(--pnrr-card)] [&>button.absolute]:focus:ring-[var(--pnrr-blue)]"
      >
        <SheetHeader className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-6 pr-14 text-left">
          <SheetTitle className="text-left text-4xl font-black leading-none tracking-tight text-[var(--pnrr-fg)]">
            Filtre avansate
          </SheetTitle>
          <SheetDescription className="pt-1 text-left text-base font-bold text-[var(--pnrr-muted)]">
            {activeCount} filtre active
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:!max-w-full [&_[data-radix-scroll-area-viewport]>div]:!w-full">
          <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden p-4 sm:p-6">
            <section className="space-y-2">
              <Label className={parliamentFilterLabelClassName}>Cameră</Label>
              <ToggleGroup
                type="single"
                value={search.chamber ?? 'all'}
                onValueChange={(value) => {
                  if (!value) return
                  onSearchChange({
                    ...search,
                    chamber: value === 'all' ? undefined : (value as 'camera' | 'senat'),
                    grup: undefined,
                    page: 1,
                  })
                }}
                className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3"
              >
                <ToggleGroupItem value="all" className={FILTER_TOGGLE_ITEM_CLASS}>
                  Toate
                </ToggleGroupItem>
                <ToggleGroupItem value="camera" className={FILTER_TOGGLE_ITEM_CLASS}>
                  Camera
                </ToggleGroupItem>
                <ToggleGroupItem value="senat" className={FILTER_TOGGLE_ITEM_CLASS}>
                  Senat
                </ToggleGroupItem>
              </ToggleGroup>
            </section>

            <section className="space-y-2">
              <Label htmlFor="panel-group-filter" className={parliamentFilterLabelClassName}>
                Grup parlamentar
              </Label>
              <StyledMultiSelect
                options={groupOptions}
                selected={selectedGroups}
                placeholder="Toate grupurile"
                className="min-h-11"
                onChange={(values) =>
                  onSearchChange({
                    ...search,
                    grup: values.length > 0 ? values : undefined,
                    page: 1,
                  })
                }
              />
            </section>

            <section className="space-y-2">
              <Label htmlFor="panel-judet-filter" className={parliamentFilterLabelClassName}>
                Județ
              </Label>
              <StyledMultiSelect
                options={judetOptions}
                selected={selectedJudete}
                placeholder="Toate județele"
                className="min-h-11"
                onChange={(values) =>
                  onSearchChange({
                    ...search,
                    judet: values.length > 0 ? values : undefined,
                    page: 1,
                  })
                }
              />
            </section>
          </div>
        </ScrollArea>

        <div className="border-t-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-w-0 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-2 text-xs font-black uppercase tracking-wide text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-bg)] sm:text-sm"
              onClick={handleClearPanelFilters}
            >
              Șterge filtrele
            </Button>
            <Button
              type="button"
              className="h-11 min-w-0 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] px-2 text-xs font-black uppercase tracking-wide text-[var(--pnrr-bg)] hover:bg-[var(--pnrr-card)] hover:text-[var(--pnrr-fg)] sm:text-sm"
              onClick={() => onOpenChange(false)}
            >
              Închide
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

type TriggerProps = {
  readonly activeCount: number
  readonly onClick: () => void
  readonly className?: string
}

/** Filter trigger button with active-count badge */
export function MembersFilterTriggerButton({
  activeCount,
  onClick,
  className,
}: TriggerProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'relative h-12 gap-2 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 text-sm font-bold text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]',
        className,
      )}
      onClick={onClick}
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden />
      <span>Filtrează</span>
      {activeCount > 0 ? (
        <Badge
          variant="default"
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--pnrr-fg)] p-0 text-[11px] text-[var(--pnrr-bg)]"
        >
          {activeCount}
        </Badge>
      ) : null}
    </Button>
  )
}

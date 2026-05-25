import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { StyledSingleSelect } from '@/components/ui/styled-single-select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import type { ParliamentMembersSearch } from '@/schemas/parliament'
import { useParliamentJudete } from '../hooks/use-parliament-data'
import { parliamentFilterLabelClassName } from '../lib/table-theme'

const FILTER_TOGGLE_ITEM_CLASS =
  'h-10 min-w-0 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-2 text-sm font-black text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-bg)] data-[state=on]:bg-[var(--pnrr-fg)] data-[state=on]:text-[var(--pnrr-bg)] sm:px-4'

type FindRepApply = Pick<ParliamentMembersSearch, 'chamber' | 'judet'>

type DialogProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onApply: (updates: FindRepApply) => void
}

type FormProps = {
  readonly onApply: (updates: FindRepApply) => void
  readonly onClose: () => void
}

function FindRepForm({ onApply, onClose }: FormProps) {
  const { data: judete = [] } = useParliamentJudete()
  const [chamber, setChamber] = useState<'all' | 'camera' | 'senat'>('all')
  const [selectedJudet, setSelectedJudet] = useState('')

  const judetOptions = useMemo(
    () =>
      judete.map((judet) => ({
        value: judet.slug,
        label: judet.name,
        searchText: judet.name,
      })),
    [judete],
  )

  const handleSubmit = () => {
    if (!selectedJudet) return

    onApply({
      chamber: chamber === 'all' ? undefined : chamber,
      judet: selectedJudet,
    })
    onClose()
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Label className={parliamentFilterLabelClassName}>Cameră</Label>
        <ToggleGroup
          type="single"
          value={chamber}
          onValueChange={(value) => {
            if (!value) return
            setChamber(value as 'all' | 'camera' | 'senat')
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
        <Label htmlFor="find-rep-judet" className={parliamentFilterLabelClassName}>
          Județ
        </Label>
        <StyledSingleSelect
          id="find-rep-judet"
          options={judetOptions}
          value={selectedJudet}
          placeholder="Alege județul"
          className="min-h-11"
          onChange={setSelectedJudet}
        />
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 min-w-0 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-2 text-xs font-black uppercase tracking-wide text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-bg)] sm:text-sm"
          onClick={onClose}
        >
          Închide
        </Button>
        <Button
          type="button"
          disabled={!selectedJudet}
          className="h-11 min-w-0 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] px-2 text-xs font-black uppercase tracking-wide text-[var(--pnrr-bg)] hover:bg-[var(--pnrr-card)] hover:text-[var(--pnrr-fg)] disabled:opacity-40 sm:text-sm"
          onClick={handleSubmit}
        >
          Arată reprezentanții
        </Button>
      </div>
    </div>
  )
}

/** Dialog on desktop, bottom sheet on mobile — find representatives by county. */
export function FindRepDialog({ open, onOpenChange, onApply }: DialogProps) {
  const isMobile = useIsMobile()
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    if (!open) {
      setFormKey((current) => current + 1)
    }
  }, [open])

  const handleClose = () => onOpenChange(false)

  const header = (
    <>
      <DialogTitle className="text-left text-2xl font-black leading-none tracking-tight text-[var(--pnrr-fg)] sm:text-3xl">
        Găsește reprezentantul
      </DialogTitle>
      <DialogDescription className="pt-1 text-left text-sm font-bold text-[var(--pnrr-muted)] sm:text-base">
        Selectează județul pentru a vedea deputații și senatorii aleși în
        circumscripția respectivă.
      </DialogDescription>
    </>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="max-h-[90vh] overflow-y-auto rounded-t-3xl border-t-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-4 pb-6 sm:p-6"
        >
          <SheetHeader className="space-y-2 pb-4 text-left">
            <SheetTitle className="text-left text-2xl font-black leading-none tracking-tight text-[var(--pnrr-fg)]">
              Găsește reprezentantul
            </SheetTitle>
            <SheetDescription className="text-left text-sm font-bold text-[var(--pnrr-muted)]">
              Selectează județul pentru a vedea deputații și senatorii aleși în
              circumscripția respectivă.
            </SheetDescription>
          </SheetHeader>
          <FindRepForm key={formKey} onApply={onApply} onClose={handleClose} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-0 sm:max-w-md">
        <DialogHeader className="space-y-2 border-b-2 border-[var(--pnrr-border)] p-6 text-left">
          {header}
        </DialogHeader>
        <div className="p-6">
          <FindRepForm key={formKey} onApply={onApply} onClose={handleClose} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

type TriggerProps = {
  readonly onClick: () => void
  readonly className?: string
}

/** Trigger button for the find-representative dialog. */
export function FindRepTriggerButton({ onClick, className }: TriggerProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'h-12 gap-2 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 text-sm font-bold text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]',
        className,
      )}
      onClick={onClick}
    >
      <Users className="h-4 w-4" aria-hidden />
      <span>Găsește reprezentantul</span>
    </Button>
  )
}

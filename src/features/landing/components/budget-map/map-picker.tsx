import { forwardRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import type { ComponentPropsWithoutRef } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { Check, ChevronDown } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { SelectContent, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'
import { MEASURES, type Measure, type MeasureId } from '../../lib/budget-map-measures'

/**
 * The budget map's picker. Each map is shown with its name, what it is in one line,
 * and a strip of its own colours — so the choice says what the map will look
 * like, and the strip matches the legend under it. Maps sit under headings
 * once there are several groups of them.
 *
 * Under a mouse: shadcn's Select, with the rich rows built on Radix's item
 * (only the name is the item's text, which Radix types ahead on and announces).
 * Under a finger: a bottom sheet with the same rows as a radio group. The
 * phone's native picker (`ChoiceSelect`) cannot show a description or a
 * swatch, and the reason the app uses it elsewhere — Radix's list closing as a
 * keyboard goes away — cannot happen here: nothing in it types.
 */

type Groups = readonly (readonly [string, readonly Measure[]])[]

/** The maps under their headings (by the heading's message id), in the order the measures are listed. */
function groupsOf(measures: readonly Measure[]): Groups {
  return [...new Set(measures.map((measure) => measure.group.id))].map((group) => [group, measures.filter((measure) => measure.group.id === group)] as const)
}

/** A measure's colours as a strip: its preview in the picker. */
function RampStrip({ ramp, className }: { readonly ramp: readonly string[]; readonly className?: string }) {
  return (
    <span className={cn('flex h-1.5 w-20 shrink-0 overflow-hidden rounded-full', className)} aria-hidden="true">
      {ramp.map((color, i) => (
        <span key={i} className="flex-1" style={{ background: color }} />
      ))}
    </span>
  )
}

/**
 * The trigger's face, the same under a mouse and a finger: an ordinary one-line
 * control (its colours, the map's name, the chevron), fixed in width from `sm`
 * so it does not change size with the map. Its label says „Harta afișată".
 */
const TriggerFace = forwardRef<HTMLButtonElement, { readonly measure: Measure } & ComponentPropsWithoutRef<'button'>>(function TriggerFace({ measure, className, ...props }, ref) {
  const { i18n } = useLingui()
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'flex h-10 w-full items-center gap-3 rounded-md border border-input bg-background px-3 text-left text-sm font-medium text-foreground shadow-2xs transition-colors hover:bg-muted/50 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring sm:w-56',
        className,
      )}
      {...props}
    >
      <RampStrip ramp={measure.ramp} className="w-10" />
      <span className="min-w-0 flex-1 truncate">{i18n._(measure.title)}</span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  )
})

/** A map's row: name, what it is, its colours. */
function RowBody({ measure, name }: { readonly measure: Measure; readonly name?: React.ReactNode }) {
  const { i18n } = useLingui()
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-base font-medium leading-tight text-foreground">{name ?? i18n._(measure.title)}</span>
      <span className="text-sm leading-snug text-muted-foreground">{i18n._(measure.description)}</span>
      <RampStrip ramp={measure.ramp} className="mt-1 w-28" />
    </span>
  )
}

/** `measures`: the maps offered, the landing's by default; a page whose maps say other words (another year) passes its own. */
export function MapPicker({
  value,
  onChange,
  measures = MEASURES,
}: {
  readonly value: MeasureId
  readonly onChange: (id: MeasureId) => void
  readonly measures?: readonly Measure[]
}) {
  const coarse = useMediaQuery('(pointer: coarse)')
  const measure = measures.find((item) => item.id === value) ?? measures[0]!
  const groups = groupsOf(measures)
  return coarse ? <SheetPicker measure={measure} groups={groups} onChange={onChange} /> : <ListPicker measure={measure} groups={groups} onChange={onChange} />
}

interface PickerProps {
  readonly measure: Measure
  readonly groups: Groups
  readonly onChange: (id: MeasureId) => void
}

function ListPicker({ measure, groups: GROUPS, onChange }: PickerProps) {
  const { i18n } = useLingui()
  const title = i18n._(measure.title)
  return (
    <SelectPrimitive.Root value={measure.id} onValueChange={(id) => onChange(id as MeasureId)}>
      <SelectPrimitive.Trigger asChild aria-label={t`Harta afișată: ${title}`}>
        <TriggerFace measure={measure} />
      </SelectPrimitive.Trigger>
      <SelectContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-1">
        {GROUPS.map(([group, measures], index) => (
          <SelectGroup key={group}>
            {index > 0 ? <SelectSeparator /> : null}
            {GROUPS.length > 1 ? (
              <SelectLabel className="px-3 pb-1 pt-2">
                <MonoLabel className="text-muted-foreground">{i18n._(measures[0]!.group)}</MonoLabel>
              </SelectLabel>
            ) : null}
            {measures.map((item) => (
              <SelectPrimitive.Item
                key={item.id}
                value={item.id}
                className="relative flex cursor-default select-none items-start gap-3 rounded-md px-3 py-2.5 outline-hidden focus:bg-secondary data-[state=checked]:bg-muted/60"
              >
                <RowBody measure={item} name={<SelectPrimitive.ItemText>{i18n._(item.title)}</SelectPrimitive.ItemText>} />
                <SelectPrimitive.ItemIndicator className="mt-0.5">
                  <Check className="size-4 text-foreground" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </SelectPrimitive.Root>
  )
}

function SheetPicker({ measure, groups: GROUPS, onChange }: PickerProps) {
  const { i18n } = useLingui()
  const [open, setOpen] = useState(false)
  const title = i18n._(measure.title)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <TriggerFace measure={measure} aria-label={t`Harta afișată: ${title}. Schimbă harta`} />
      </SheetTrigger>
      <SheetContent side="bottom" onOverlayClick={() => setOpen(false)} className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-4 pb-6 pt-5">
        <SheetTitle className="text-lg">{t`Alege harta`}</SheetTitle>
        <SheetDescription className="sr-only">{t`Harta primăriilor se colorează după indicatorul ales.`}</SheetDescription>
        <RadioGroupPrimitive.Root
          value={measure.id}
          onValueChange={(id) => {
            onChange(id as MeasureId)
            setOpen(false)
          }}
          aria-label={t`Harta`}
          className="mt-4 space-y-5"
        >
          {GROUPS.map(([group, measures]) => (
            <div key={group} className="space-y-2">
              {GROUPS.length > 1 ? <MonoLabel className="block text-muted-foreground">{i18n._(measures[0]!.group)}</MonoLabel> : null}
              {measures.map((item) => (
                <RadioGroupPrimitive.Item
                  key={item.id}
                  value={item.id}
                  className="flex w-full items-start gap-3 rounded-lg border px-4 py-3.5 text-left transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring data-[state=checked]:border-foreground data-[state=checked]:bg-muted/60"
                >
                  <RowBody measure={item} />
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-input" aria-hidden="true">
                    <RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-foreground" />
                  </span>
                </RadioGroupPrimitive.Item>
              ))}
            </div>
          ))}
        </RadioGroupPrimitive.Root>
      </SheetContent>
    </Sheet>
  )
}

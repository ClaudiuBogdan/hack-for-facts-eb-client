import { ReactNode, useMemo } from 'react'
import { t } from '@lingui/core/macro'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useWindowSize } from '@/hooks/useWindowSize'
import { cn } from '@/lib/utils'

type ResponsivePopoverProps = {
    trigger: ReactNode
    content: ReactNode
    /** Applied to the popover and to the sheet alike. */
    className?: string
    /** Applied to the popover alone: a width the sheet must not carry. */
    popoverClassName?: string
    /**
     * What the sheet is, for assistive tech: a phone announces the sheet by
     * this name when it opens. Consumers name their own; the default is a
     * generic word, never an English placeholder.
     */
    title?: string
    description?: string
    align?: 'start' | 'center' | 'end'
    mobileSide?: 'bottom' | 'top' | 'left' | 'right'
    breakpoint?: number
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

/**
 * A popover on a wide screen, a sheet on a phone. The sheet opens with the
 * focus on the first field its content holds, where it has one — a search
 * box a reader opened the sheet to type in — rather than on the close button.
 */
export function ResponsivePopover({
    trigger,
    content,
    className,
    popoverClassName,
    title,
    description,
    align = 'end',
    mobileSide = 'bottom',
    breakpoint = 640,
    open,
    onOpenChange,
}: ResponsivePopoverProps) {
    const { width } = useWindowSize()
    const isMobile = useMemo(() => width <= breakpoint, [width, breakpoint])

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetTrigger asChild>
                    {trigger}
                </SheetTrigger>
                <SheetContent
                    side={mobileSide}
                    onOverlayClick={() => onOpenChange?.(false)}
                    onOpenAutoFocus={(event) => {
                        const field = (event.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>(
                            'input:not([type="hidden"]), textarea, [data-autofocus]',
                        )
                        if (field) {
                            event.preventDefault()
                            field.focus()
                        }
                    }}
                    className={cn(
                        'p-4 min-h-[65vh] max-h-[90vh] overflow-y-auto',
                        mobileSide === 'bottom'
                            ? 'rounded-t-3xl'
                            : mobileSide === 'top'
                                ? 'rounded-b-3xl'
                                : mobileSide === 'left'
                                    ? 'rounded-r-3xl'
                                    : 'rounded-l-3xl',
                        className,
                    )}
                >
                    <SheetTitle className="sr-only">{title ?? t`Opțiuni`}</SheetTitle>
                    <SheetDescription className="sr-only">
                        {description ?? t`Opțiuni și conținut suplimentar.`}
                    </SheetDescription>
                    {content}
                </SheetContent>
            </Sheet>
        )
    }

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                {trigger}
            </PopoverTrigger>
            <PopoverContent className={cn(className, popoverClassName)} align={align}>
                {content}
            </PopoverContent>
        </Popover>
    )
}

import { ReactNode, useMemo } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useWindowSize } from '@/hooks/useWindowSize'
import { cn } from '@/lib/utils'

type ResponsivePopoverProps = {
    trigger: ReactNode
    content: ReactNode
    className?: string
    align?: 'start' | 'center' | 'end'
    mobileSide?: 'bottom' | 'top' | 'left' | 'right'
    breakpoint?: number
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function ResponsivePopover({ trigger, content, className, align = 'end', mobileSide = 'bottom', breakpoint = 640, open, onOpenChange }: ResponsivePopoverProps) {
    const { width } = useWindowSize()
    const isMobile = useMemo(() => width <= breakpoint, [width, breakpoint])

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetTrigger asChild>
                    {trigger}
                </SheetTrigger>
                <SheetTitle className="sr-only">Responsive Popover</SheetTitle>
                <SheetDescription className="sr-only">
                    Additional options and content.
                </SheetDescription>
                <SheetContent
                    side={mobileSide}
                    onOverlayClick={() => onOpenChange?.(false)}
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
            <PopoverContent className={className} align={align}>
                {content}
            </PopoverContent>
        </Popover>
    )
}


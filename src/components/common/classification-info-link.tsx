import {
  useState,
  memo,
  useCallback,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Info, ExternalLink } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ClassificationDescription } from '@/components/classification-explorer/ClassificationDescription'
import type { ClassificationType } from '@/types/classification-explorer'
import { Link } from '@tanstack/react-router'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

// Static classes extracted outside component to avoid recreation
const BASE_CLASSES =
  'inline-grid place-items-center rounded-full border-0 bg-transparent p-1 text-inherit transition-transform duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 touch-manipulation'
const HOVER_CLASSES_VISIBLE = ''
const HOVER_CLASSES_HIDDEN = 'hidden group-hover:inline-flex md:inline-flex md:opacity-0 md:group-hover:opacity-100'

type ClassificationInfoLinkProps = Readonly<{
  type: ClassificationType
  code?: string
  title?: string
  className?: string
  iconClassName?: string
  showOnHoverOnly?: boolean
  disabled?: boolean
  onClick?: (e: React.MouseEvent) => void
  menuActions?: readonly ClassificationInfoMenuAction[]
  onOverlayOpenChange?: (open: boolean) => void
}>

export type ClassificationInfoMenuAction = Readonly<{
  key: string
  label: ReactNode
  onSelect: () => void
}>

// Helper to render navigation button - avoids nested ternaries
function NavigationButton({
  type,
  normalizedCode,
  onClose,
}: Readonly<{
  type: ClassificationType
  normalizedCode: string | undefined
  onClose: () => void
}>) {
  if (normalizedCode) {
    const route = type === 'functional'
      ? '/classifications/functional/$code' as const
      : '/classifications/economic/$code' as const
    return (
      <Button asChild variant="default" size="sm" onClick={onClose}>
        <Link to={route} params={{ code: normalizedCode }}>
          <Trans>View full details</Trans>
          <ExternalLink className="ml-2 h-3.5 w-3.5" />
        </Link>
      </Button>
    )
  }

  const route = type === 'functional'
    ? '/classifications/functional' as const
    : '/classifications/economic' as const
  return (
    <Button asChild variant="default" size="sm" onClick={onClose}>
      <Link to={route}>
        <Trans>View all classifications</Trans>
        <ExternalLink className="ml-2 h-3.5 w-3.5" />
      </Link>
    </Button>
  )
}

// Dialog content component - only rendered when dialog is open
function DialogContentInner({
  type,
  normalizedCode,
  onClose,
}: Readonly<{
  type: ClassificationType
  normalizedCode: string | undefined
  onClose: () => void
}>) {
  const typeLabel = type === 'functional' ? t`Functional` : t`Economic`

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <span className="flex items-center gap-2">
            <Trans>Classification Details</Trans>
            {normalizedCode && (
              <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                {type === 'functional' ? 'fn' : 'ec'}:{normalizedCode}
              </span>
            )}
          </span>
        </DialogTitle>
        <DialogDescription className="sr-only">
          {typeLabel} <Trans>classification</Trans>
        </DialogDescription>
      </DialogHeader>
      <div className="py-2">
        {normalizedCode ? (
          <ClassificationDescription type={type} code={normalizedCode} />
        ) : (
          <p className="text-sm text-muted-foreground">
            <Trans>Click the link below to explore all {type} classifications.</Trans>
          </p>
        )}
      </div>
      <DialogFooter className="border-t pt-4">
        <NavigationButton type={type} normalizedCode={normalizedCode} onClose={onClose} />
      </DialogFooter>
    </>
  )
}

// Sheet content component - only rendered when sheet is open
function SheetContentInner({
  type,
  normalizedCode,
  onClose,
}: Readonly<{
  type: ClassificationType
  normalizedCode: string | undefined
  onClose: () => void
}>) {
  const typeLabel = type === 'functional' ? t`Functional` : t`Economic`

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          <span className="flex items-center gap-2">
            <Trans>Classification Details</Trans>
            {normalizedCode && (
              <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                {type === 'functional' ? 'fn' : 'ec'}:{normalizedCode}
              </span>
            )}
          </span>
        </SheetTitle>
        <SheetDescription className="sr-only">
          {typeLabel} <Trans>classification</Trans>
        </SheetDescription>
      </SheetHeader>
      <div className="py-2">
        {normalizedCode ? (
          <ClassificationDescription type={type} code={normalizedCode} />
        ) : (
          <p className="text-sm text-muted-foreground">
            <Trans>Click the link below to explore all {type} classifications.</Trans>
          </p>
        )}
      </div>
      <SheetFooter className="mt-4 border-t pt-4">
        <NavigationButton type={type} normalizedCode={normalizedCode} onClose={onClose} />
      </SheetFooter>
    </>
  )
}

export const ClassificationInfoLink = memo(function ClassificationInfoLink({
  type,
  code,
  title,
  className = '',
  iconClassName = 'h-4 w-4 text-slate-600 dark:text-slate-300',
  showOnHoverOnly = true,
  disabled = false,
  onClick,
  menuActions,
  onOverlayOpenChange,
}: ClassificationInfoLinkProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const isMobile = useIsMobile()
  const normalizedCode = code ? code.replace(/(\.00)+$/, '') : undefined
  const hasMenuActions = (menuActions?.length ?? 0) > 0
  const mergedClassName = cn(
    'ml-2',
    BASE_CLASSES,
    showOnHoverOnly ? HOVER_CLASSES_HIDDEN : HOVER_CLASSES_VISIBLE,
    menuOpen && 'inline-grid opacity-100 md:inline-grid md:opacity-100',
    className,
  )
  const titleAttr =
    title
    ?? (normalizedCode
      ? `Open ${type} classification ${normalizedCode}`
      : `Open ${type} classifications`)

  const reportOverlayOpenChange = useCallback((nextMenuOpen: boolean, nextDetailsOpen: boolean) => {
    onOverlayOpenChange?.(nextMenuOpen || nextDetailsOpen)
  }, [onOverlayOpenChange])

  const handleMenuOpenChange = useCallback((nextMenuOpen: boolean) => {
    setMenuOpen(nextMenuOpen)
    reportOverlayOpenChange(nextMenuOpen, detailsOpen)
  }, [detailsOpen, reportOverlayOpenChange])

  const handleDetailsOpenChange = useCallback((nextDetailsOpen: boolean) => {
    setDetailsOpen(nextDetailsOpen)
    reportOverlayOpenChange(menuOpen, nextDetailsOpen)
  }, [menuOpen, reportOverlayOpenChange])

  const stopEventPropagation = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation()
    const nativeEvent = event.nativeEvent as Event & {
      stopImmediatePropagation?: () => void
    }
    nativeEvent.stopImmediatePropagation?.()
  }, [])

  // Memoize event handlers
  const handleTriggerClick = useCallback((e: React.MouseEvent) => {
    stopEventPropagation(e)

    if (disabled) {
      e.preventDefault()
      return
    }

    onClick?.(e)

    if (!hasMenuActions) {
      handleDetailsOpenChange(true)
    }
  }, [disabled, handleDetailsOpenChange, hasMenuActions, onClick, stopEventPropagation])

  const handleTriggerPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    stopEventPropagation(event)
  }, [stopEventPropagation])

  const handleTriggerMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    stopEventPropagation(event)
  }, [stopEventPropagation])

  const handleClose = useCallback(() => {
    handleDetailsOpenChange(false)
  }, [handleDetailsOpenChange])

  const handleTriggerKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()

    if (disabled) {
      event.stopPropagation()
      return
    }

    stopEventPropagation(event)

    if (hasMenuActions) {
      handleMenuOpenChange(!menuOpen)
      return
    }

    handleDetailsOpenChange(true)
  }, [
    disabled,
    handleDetailsOpenChange,
    handleMenuOpenChange,
    hasMenuActions,
    menuOpen,
    stopEventPropagation,
  ])

  const handleOpenDetails = useCallback(() => {
    setMenuOpen(false)
    setDetailsOpen(true)
    reportOverlayOpenChange(false, true)
  }, [reportOverlayOpenChange])

  // Render trigger element (always rendered)
  const trigger = (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleTriggerClick}
      onPointerDown={handleTriggerPointerDown}
      onMouseDown={handleTriggerMouseDown}
      onKeyDown={handleTriggerKeyDown}
      className={mergedClassName}
      title={titleAttr}
      aria-label={titleAttr}
      aria-haspopup={hasMenuActions ? 'menu' : 'dialog'}
      aria-expanded={hasMenuActions ? menuOpen : detailsOpen}
      aria-disabled={disabled}
    >
      <Info className={iconClassName} aria-hidden="true" />
    </div>
  )

  const detailsContent = isMobile ? (
    <Sheet open={detailsOpen} onOpenChange={handleDetailsOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl max-h-[85vh] overflow-y-auto">
        <SheetContentInner
          type={type}
          normalizedCode={normalizedCode}
          onClose={handleClose}
        />
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open={detailsOpen} onOpenChange={handleDetailsOpenChange}>
      <DialogContent
        className="max-w-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogContentInner
          type={type}
          normalizedCode={normalizedCode}
          onClose={handleClose}
        />
      </DialogContent>
    </Dialog>
  )

  if (hasMenuActions) {
    return (
      <>
        <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
          <DropdownMenuTrigger asChild>
            {trigger}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {menuActions?.map((menuAction) => (
              <DropdownMenuItem
                key={menuAction.key}
                onSelect={(event) => {
                  event.preventDefault()
                  menuAction.onSelect()
                  handleMenuOpenChange(false)
                }}
              >
                {menuAction.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault()
                handleOpenDetails()
              }}
            >
              <Trans>Info</Trans>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {detailsOpen ? detailsContent : null}
      </>
    )
  }

  return (
    <>
      {trigger}
      {detailsOpen ? detailsContent : null}
    </>
  )
})

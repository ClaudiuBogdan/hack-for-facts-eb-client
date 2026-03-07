import { useState, memo, useCallback, useMemo } from 'react'
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
import { ClassificationDescription } from '@/components/classification-explorer/ClassificationDescription'
import type { ClassificationType } from '@/types/classification-explorer'
import { Link } from '@tanstack/react-router'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

// Static classes extracted outside component to avoid recreation
const BASE_CLASSES = 'inline-flex items-center justify-center rounded-full p-1 hover:scale-110 transition-scale duration-200 cursor-pointer'
const HOVER_CLASSES_VISIBLE = ''
const HOVER_CLASSES_HIDDEN = 'hidden group-hover:inline-flex md:inline-flex md:opacity-0 md:group-hover:opacity-100'

type ClassificationInfoLinkProps = Readonly<{
  type: ClassificationType
  code?: string
  title?: string
  className?: string
  iconClassName?: string
  showOnHoverOnly?: boolean
  onClick?: (e: React.MouseEvent) => void
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
  onClick,
}: ClassificationInfoLinkProps) {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()

  // Memoize computed values
  const normalizedCode = useMemo(
    () => (code ? code.replace(/(\.00)+$/, '') : undefined),
    [code]
  )

  const mergedClassName = useMemo(() => {
    const hoverClasses = showOnHoverOnly ? HOVER_CLASSES_HIDDEN : HOVER_CLASSES_VISIBLE
    return cn('ml-2', BASE_CLASSES, hoverClasses, className)
  }, [showOnHoverOnly, className])

  const titleAttr = useMemo(
    () => title ?? (normalizedCode ? `Open ${type} classification ${normalizedCode}` : `Open ${type} classifications`),
    [title, normalizedCode, type]
  )

  // Memoize event handlers
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onClick?.(e)
    setOpen(true)
  }, [onClick])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation()
      e.preventDefault()
      setOpen(true)
    }
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  // Render trigger element (always rendered)
  const trigger = (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={mergedClassName}
      title={titleAttr}
    >
      <Info className={iconClassName} />
    </span>
  )

  // Only render Dialog/Sheet when open - this is the key optimization
  if (isMobile) {
    return (
      <>
        {trigger}
        {open && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="bottom" className="rounded-t-xl max-h-[85vh] overflow-y-auto">
              <SheetContentInner
                type={type}
                normalizedCode={normalizedCode}
                onClose={handleClose}
              />
            </SheetContent>
          </Sheet>
        )}
      </>
    )
  }

  return (
    <>
      {trigger}
      {open && (
        <Dialog open={open} onOpenChange={setOpen}>
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
      )}
    </>
  )
})

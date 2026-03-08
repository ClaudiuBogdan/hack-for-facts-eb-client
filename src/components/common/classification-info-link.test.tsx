import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ClassificationInfoLink } from './classification-info-link'

vi.mock('@/components/classification-explorer/ClassificationDescription', () => ({
  ClassificationDescription: () => <div>Classification description</div>,
}))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: ReactNode
    to: string
    params?: Record<string, string>
  }) => {
    const href = Object.entries(params ?? {}).reduce(
      (resolvedPath, [key, value]) =>
        resolvedPath.replace(`$${key}`, encodeURIComponent(value)),
      to,
    )

    return <a href={href}>{children}</a>
  },
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    asChild,
    children,
    onClick,
    ...props
  }: {
    asChild?: boolean
    children: ReactNode
    onClick?: () => void
  }) => {
    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<{
        onClick?: () => void
      }>

      return cloneElement(child, {
        ...(props as Record<string, unknown>),
        onClick,
      })
    }

    return (
      <button type="button" onClick={onClick} {...props}>
        {children}
      </button>
    )
  },
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: ReactNode
  }) => (open ? (
    <div data-testid="dialog-root">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={() => onOpenChange?.(false)}
      >
        Close dialog
      </button>
      {children}
    </div>
  ) : null),
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div role="dialog">{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({
    open,
    onOpenChange,
    children,
  }: {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: ReactNode
  }) => (open ? (
    <div data-testid="sheet-root">
      <button
        type="button"
        aria-label="Close sheet"
        onClick={() => onOpenChange?.(false)}
      >
        Close sheet
      </button>
      {children}
    </div>
  ) : null),
  SheetContent: ({ children }: { children: ReactNode }) => (
    <div role="dialog">{children}</div>
  ),
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SheetFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

type DropdownMenuContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null)

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({
    open = false,
    onOpenChange,
    children,
  }: {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: ReactNode
  }) => {
    const [currentOpen, setCurrentOpen] = useState(open)

    useEffect(() => {
      setCurrentOpen(open)
    }, [open])

    const contextValue = useMemo(
      () => ({
        open: currentOpen,
        setOpen: (nextOpen: boolean) => {
          setCurrentOpen(nextOpen)
          onOpenChange?.(nextOpen)
        },
      }),
      [currentOpen, onOpenChange],
    )

    return (
      <DropdownMenuContext.Provider value={contextValue}>
        {children}
      </DropdownMenuContext.Provider>
    )
  },
  DropdownMenuTrigger: ({
    asChild,
    children,
  }: {
    asChild?: boolean
    children: ReactNode
  }) => {
    const context = useContext(DropdownMenuContext)

    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<{
        onClick?: (event: unknown) => void
      }>

      return cloneElement(child, {
        onClick: (event: unknown) => {
          child.props.onClick?.(event)
          context?.setOpen(!context.open)
        },
      })
    }

    return children
  },
  DropdownMenuContent: ({ children }: { children: ReactNode }) => {
    const context = useContext(DropdownMenuContext)

    if (!context?.open) {
      return null
    }

    return <div role="menu">{children}</div>
  },
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: ReactNode
    onSelect?: (event: { preventDefault: () => void }) => void
  }) => (
    <button
      type="button"
      role="menuitem"
      onClick={() =>
        onSelect?.({
          preventDefault: () => {},
        })
      }
    >
      {children}
    </button>
  ),
}))

describe('ClassificationInfoLink', () => {
  it('lets responsive hidden classes override the base display class', () => {
    render(
      <ClassificationInfoLink
        type="functional"
        code="84.03.03"
        showOnHoverOnly={false}
        className="hidden md:inline-flex md:opacity-0 md:group-hover:opacity-100"
      />,
    )

    const trigger = screen.getByRole('button')

    expect(trigger).toHaveClass(
      'hidden',
      'md:inline-flex',
      'md:opacity-0',
      'md:group-hover:opacity-100',
    )
    expect(trigger).not.toHaveClass('inline-flex')
  })

  it('opens the details dialog directly when no menu actions are provided', () => {
    render(
      <ClassificationInfoLink
        type="functional"
        code="84.03.03"
        showOnHoverOnly={false}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open functional classification 84.03.03',
      }),
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Classification Details')).toBeInTheDocument()
    expect(screen.getByText('Classification description')).toBeInTheDocument()
  })

  it('does nothing when disabled', () => {
    render(
      <ClassificationInfoLink
        type="functional"
        code="84.03.03"
        disabled
        showOnHoverOnly={false}
      />,
    )

    const trigger = screen.getByRole('button', {
      name: 'Open functional classification 84.03.03',
    })

    expect(trigger).toHaveAttribute('aria-disabled', 'true')
    expect(trigger).toHaveAttribute('tabindex', '-1')

    fireEvent.click(trigger)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('shows analytics and code info actions in menu mode', () => {
    const analyticsAction = vi.fn()

    render(
      <ClassificationInfoLink
        type="functional"
        code="65"
        showOnHoverOnly={false}
        menuActions={[
          {
            key: 'analytics',
            label: 'Analytics',
            onSelect: analyticsAction,
          },
        ]}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open functional classification 65',
      }),
    )

    expect(screen.getByRole('menuitem', { name: 'Analytics' })).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Info' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('menuitem', { name: 'Analytics' }))

    expect(analyticsAction).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reports overlay state for dialog open and close', () => {
    const onOverlayOpenChange = vi.fn()

    render(
      <ClassificationInfoLink
        type="functional"
        code="84.03.03"
        showOnHoverOnly={false}
        onOverlayOpenChange={onOverlayOpenChange}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open functional classification 84.03.03',
      }),
    )

    expect(onOverlayOpenChange).toHaveBeenNthCalledWith(1, true)

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))

    expect(onOverlayOpenChange).toHaveBeenNthCalledWith(2, false)
  })

  it('reports overlay state for menu open and close', () => {
    const onOverlayOpenChange = vi.fn()

    render(
      <ClassificationInfoLink
        type="functional"
        code="65"
        showOnHoverOnly={false}
        onOverlayOpenChange={onOverlayOpenChange}
        menuActions={[
          {
            key: 'analytics',
            label: 'Analytics',
            onSelect: vi.fn(),
          },
        ]}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open functional classification 65',
      }),
    )

    expect(onOverlayOpenChange).toHaveBeenNthCalledWith(1, true)

    fireEvent.click(screen.getByRole('menuitem', { name: 'Analytics' }))

    expect(onOverlayOpenChange).toHaveBeenNthCalledWith(2, false)
  })

  it('opens the details dialog from the menu info action', () => {
    render(
      <ClassificationInfoLink
        type="economic"
        code="10.01"
        showOnHoverOnly={false}
        menuActions={[
          {
            key: 'analytics',
            label: 'Analytics',
            onSelect: vi.fn(),
          },
        ]}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open economic classification 10.01',
      }),
    )
    fireEvent.click(screen.getByRole('menuitem', { name: 'Info' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Classification description')).toBeInTheDocument()
  })
})

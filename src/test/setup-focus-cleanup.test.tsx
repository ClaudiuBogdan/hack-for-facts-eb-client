import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

/**
 * Radix FocusScope (every menu, popover and dialog) hands focus back from a
 * `setTimeout(0)` after it unmounts. A synchronous test never yields to that
 * timer, so it used to outlive its test: after a file's last test it could fire
 * once jsdom was torn down, where the global `CustomEvent` is Node's again and
 * jsdom's `dispatchEvent` rejects it — an unhandled error that fails the whole
 * run (TEST-002). `setup.ts` now waits one macrotask after `cleanup()`, so the
 * timer runs inside the test that started it.
 *
 * The two tests run in order: the first leaves a menu open for `cleanup()` to
 * unmount, the second checks that its focus cleanup has already run.
 */
describe('Radix focus cleanup after a test', () => {
  const onCloseAutoFocus = vi.fn()

  it('leaves a menu open for cleanup to unmount', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent onCloseAutoFocus={onCloseAutoFocus}>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(onCloseAutoFocus).not.toHaveBeenCalled()
  })

  it('has run that focus cleanup before the next test starts', () => {
    expect(onCloseAutoFocus).toHaveBeenCalledTimes(1)
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

/**
 * Radix FocusScope (every menu, popover and dialog) hands focus back from a
 * `setTimeout(0)` after it unmounts. A synchronous test never yields to that
 * timer, so it used to outlive its test: after a file's last test it could fire
 * once jsdom was torn down, where the global `CustomEvent` is Node's again and
 * jsdom's `dispatchEvent` rejects it — an unhandled error that fails the whole
 * run (TEST-002). `setup.ts` now waits one macrotask after `cleanup()`, so the
 * timer runs inside the test that started it.
 */
describe('Radix focus cleanup after a test', () => {
  it('has run by the end of the test that left a menu open for cleanup to unmount', () => {
    const onCloseAutoFocus = vi.fn()
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
    // Runs after the afterEach hooks, so after setup.ts's cleanup() and its wait.
    onTestFinished(() => {
      expect(onCloseAutoFocus).toHaveBeenCalledTimes(1)
    })
  })
})

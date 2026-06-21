import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import type { RefObject } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

type Props = {
  readonly inputRef: RefObject<HTMLInputElement | null>
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable ||
    target.closest('[contenteditable="true"]') !== null
  )
}

export function EntitySearchHeader({ inputRef }: Props) {
  const navigate = useNavigate({ from: '/experimental/search' })

  useHotkeys('/', (event) => {
    if (isEditableTarget(event.target)) {
      return
    }

    event.preventDefault()
    inputRef.current?.focus()
  })

  useHotkeys('mod+k', (event) => {
    event.preventDefault()
    void navigate({ to: '/experimental/search' })
    window.requestAnimationFrame(() => inputRef.current?.focus())
  })

  return (
    <header className="flex items-baseline justify-between gap-4">
      <h1 className="text-xs font-bold uppercase tracking-widest text-[var(--pnrr-muted)]">
        <Trans>Căutare entități</Trans>
      </h1>
      <div
        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--pnrr-muted)]"
        aria-label={t`Scurtături căutare`}
      >
        <kbd
          className="border-2 border-[var(--pnrr-border)] px-1.5 py-0.5 text-[10px] font-bold"
          title={t`Apasă slash ca să cauți`}
        >
          /
        </kbd>
        <span aria-hidden="true">·</span>
        <kbd
          className="border-2 border-[var(--pnrr-border)] px-1.5 py-0.5 text-[10px] font-bold"
          title={t`Apasă Command K ca să cauți`}
        >
          ⌘K
        </kbd>
      </div>
    </header>
  )
}

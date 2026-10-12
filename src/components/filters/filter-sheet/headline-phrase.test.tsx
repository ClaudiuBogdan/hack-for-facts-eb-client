import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HeadlinePhrase } from './headline-phrase'

/** A headline's filter phrase: inline text that opens the panel like a button, its ✕ dropping the filter. */
describe('HeadlinePhrase', () => {
  const renderPhrase = () => {
    const onOpen = vi.fn()
    const onRemove = vi.fn()
    render(
      <h1>
        Firmele <HeadlinePhrase text="din Cluj" removeLabel="Scoate „din Cluj”" onOpen={onOpen} onRemove={onRemove} />, în 2024
      </h1>,
    )
    return { onOpen, onRemove, phrase: screen.getByRole('button', { name: 'din Cluj' }) }
  }

  it('is inline text, not a button box, so a phrase on two lines lets the sentence go on after it', () => {
    const { phrase } = renderPhrase()
    expect(phrase.tagName).toBe('SPAN')
    expect(phrase).toHaveAttribute('tabindex', '0')
  })

  it('opens the panel on a click, on Enter once for a held key, and on Space when it is released', () => {
    const { onOpen, phrase } = renderPhrase()
    fireEvent.click(phrase)
    fireEvent.keyDown(phrase, { key: 'Enter' })
    fireEvent.keyDown(phrase, { key: 'Enter', repeat: true })
    expect(onOpen).toHaveBeenCalledTimes(2)
    // Pressed, Space only keeps the page from scrolling: opened then, the panel's close button would take its release.
    expect(fireEvent.keyDown(phrase, { key: ' ' })).toBe(false)
    expect(onOpen).toHaveBeenCalledTimes(2)
    fireEvent.keyUp(phrase, { key: ' ' })
    fireEvent.keyDown(phrase, { key: 'a' })
    expect(onOpen).toHaveBeenCalledTimes(3)
  })

  it('drops the filter from its ✕', () => {
    const { onOpen, onRemove } = renderPhrase()
    fireEvent.click(screen.getByRole('button', { name: 'Scoate „din Cluj”' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('draws its ✕ inline, so a line never parts it from the phrase’s last word, and takes Enter and Space', () => {
    const { onRemove } = renderPhrase()
    const remove = screen.getByRole('button', { name: 'Scoate „din Cluj”' })
    expect(remove.tagName).toBe('SPAN')
    expect(remove).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(remove, { key: 'Enter' })
    fireEvent.keyDown(remove, { key: ' ' })
    fireEvent.keyUp(remove, { key: ' ' })
    expect(onRemove).toHaveBeenCalledTimes(2)
  })

  it('acts on a Space release only after a press on the same control', () => {
    const { onOpen, onRemove, phrase } = renderPhrase()
    const remove = screen.getByRole('button', { name: 'Scoate „din Cluj”' })
    // Space held on the phrase, Tab to its ✕, then let go: neither acts.
    fireEvent.keyDown(phrase, { key: ' ' })
    fireEvent.blur(phrase)
    fireEvent.keyUp(remove, { key: ' ' })
    expect(onRemove).not.toHaveBeenCalled()
    expect(onOpen).not.toHaveBeenCalled()
  })
})

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ParliamentSpeechSearchDepthNotice } from './parliament-speech-search-depth-notice'

describe('ParliamentSpeechSearchDepthNotice', () => {
  it('FULL_TEXT says transcripts are included', () => {
    render(<ParliamentSpeechSearchDepthNotice depth="FULL_TEXT" />)
    expect(screen.getByRole('note')).toHaveTextContent(
      /include.*transcrierea completă/i,
    )
  })

  it('TITLE_SUMMARY explains how to unlock transcript search', () => {
    render(<ParliamentSpeechSearchDepthNotice depth="TITLE_SUMMARY" />)
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent(/titlurilor și rezumatelor/i)
    expect(note).toHaveTextContent(/alegeți un vorbitor|cel mult 3 luni/i)
  })
})

import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { addDays, format, parseISO } from 'date-fns'
import { useCampaignTimeline } from './use-campaign-timeline'

describe('use-campaign-timeline', () => {
  it('computes stable ISO calendar dates without timezone shifts', () => {
    const { result } = renderHook(() => useCampaignTimeline())
    const entryById = new Map(result.current.entries.map((entry) => [entry.id, entry]))
    const anchorDate = parseISO(result.current.anchorDate)

    const expectedT0 = format(anchorDate, 'yyyy-MM-dd')
    const expectedDay15 = format(addDays(anchorDate, 15), 'yyyy-MM-dd')
    const expectedDay30 = format(addDays(anchorDate, 30), 'yyyy-MM-dd')
    const expectedDay35 = format(addDays(anchorDate, 35), 'yyyy-MM-dd')
    const expectedDay45 = format(addDays(anchorDate, 45), 'yyyy-MM-dd')

    expect(entryById.get('publicare-buget-de-stat')?.computedDate).toBe(expectedT0)
    expect(entryById.get('publicare-proiect-buget-local')?.computedDate).toBe(expectedDay15)
    expect(entryById.get('inchidere-contestatii')?.computedDate).toBe(expectedDay30)
    expect(entryById.get('depunere-spre-aprobare')?.computedDate).toBe(expectedDay35)
    expect(entryById.get('vot-aprobare-buget-local')?.computedDate).toBe(expectedDay45)
  })

  it('cascades dependent dates from UAT override values', () => {
    const { result } = renderHook(() =>
      useCampaignTimeline({
        'publicare-proiect-buget-local': '2026-02-14',
      }),
    )
    const entryById = new Map(result.current.entries.map((entry) => [entry.id, entry]))

    expect(entryById.get('publicare-proiect-buget-local')?.computedDate).toBe('2026-02-14')
    expect(entryById.get('inchidere-contestatii')?.computedDate).toBe('2026-03-01')
    expect(entryById.get('depunere-spre-aprobare')?.computedDate).toBe('2026-03-06')
    expect(entryById.get('vot-aprobare-buget-local')?.computedDate).toBe('2026-03-16')
    expect(entryById.get('publicare-proiect-buget-local')?.isEstimated).toBe(false)
    expect(entryById.get('inchidere-contestatii')?.isEstimated).toBe(true)
    expect(entryById.get('depunere-spre-aprobare')?.isEstimated).toBe(true)
    expect(entryById.get('vot-aprobare-buget-local')?.isEstimated).toBe(true)
  })

  it('keeps directly overridden milestone dates confirmed', () => {
    const { result } = renderHook(() =>
      useCampaignTimeline({
        'publicare-proiect-buget-local': '2026-02-14',
        'inchidere-contestatii': '2026-02-25',
      }),
    )
    const entryById = new Map(result.current.entries.map((entry) => [entry.id, entry]))

    expect(entryById.get('publicare-proiect-buget-local')?.isEstimated).toBe(false)
    expect(entryById.get('inchidere-contestatii')?.computedDate).toBe('2026-02-25')
    expect(entryById.get('inchidere-contestatii')?.isEstimated).toBe(false)
    expect(entryById.get('depunere-spre-aprobare')?.computedDate).toBe('2026-03-02')
    expect(entryById.get('depunere-spre-aprobare')?.isEstimated).toBe(true)
  })
})

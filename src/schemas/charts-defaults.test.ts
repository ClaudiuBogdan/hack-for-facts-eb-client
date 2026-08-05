import { describe, expect, it } from 'vitest'

import { ChartSchema, ChartConfigSchema } from './charts'
import { createDefaultChart } from './constants'

/**
 * Zod evaluates `.default(value)` ONCE, when the schema is constructed — only
 * `.default(() => value)` re-runs per parse. These defaults mint identity and
 * timestamps, so the value form froze them at module-import time: every chart
 * in the process came out with the same UUID, and on the SSR server with the
 * timestamp of process start.
 *
 * These tests pin the thunk form. They fail if anyone reverts a default to its
 * value form.
 */
describe('chart schema defaults are minted per parse, not per module load', () => {
  it('gives two default charts different ids', () => {
    const a = ChartSchema.parse(undefined)
    const b = ChartSchema.parse(undefined)

    expect(a.id).not.toBe(b.id)
    // Charts are keyed by id in the store — a shared id means one chart
    // silently overwrites the other on save.
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('gives two charts built from the factory different ids', () => {
    expect(createDefaultChart().id).not.toBe(createDefaultChart().id)
  })

  it('stamps createdAt when the chart is parsed, not when the module loaded', async () => {
    const before = new Date().toISOString()
    await new Promise((resolve) => setTimeout(resolve, 2))
    const chart = ChartSchema.parse(undefined)

    expect(chart.createdAt >= before).toBe(true)
  })

  it('varies the generated chart colour between configs', () => {
    // `generateRandomColor` is `Math.random`-based; frozen at module load it
    // handed every chart the identical "random" colour.
    const colors = new Set(
      Array.from(
        { length: 40 },
        () => ChartConfigSchema.parse({ chartType: 'line' }).color,
      ),
    )

    expect(colors.size).toBeGreaterThan(1)
  })

  it('still honours an explicitly supplied colour', () => {
    const config = ChartConfigSchema.parse({
      chartType: 'line',
      color: '#123456',
    })

    expect(config.color).toBe('#123456')
  })

  it('does not hand two parsed charts the same object', () => {
    const a = ChartSchema.parse(undefined)
    const b = ChartSchema.parse(undefined)

    expect(a).not.toBe(b)
    a.series.push({} as never)
    expect(b.series).toHaveLength(0)
  })
})

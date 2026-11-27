import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AggregatedNode } from './budget-transform'
import { useTreemapDrilldown } from './useTreemapDrilldown'

const node = (fn: string, ec: string, amount: number): AggregatedNode => ({
  fn_c: fn,
  fn_n: `FN ${fn}`,
  ec_c: ec,
  ec_n: `EC ${ec}`,
  amount,
  count: 1,
})

// Pivoted from functional 65.02.01 into the economic classification.
const PIVOT = ['65', '65.02', '65.02.01']
const NODES = [
  node('65.02.01', '20.01.01', 100),
  // Posted at the economic subchapter itself: a signed correction.
  node('65.02.01', '20.01', -10),
  // Only ever posted at 20.02: drilling there shows the posting as a terminal block.
  node('65.02.01', '20.02', -5),
]

const drilldown = (initialPath: string[], onPathChange = vi.fn()) => ({
  onPathChange,
  hook: renderHook(
    (props: { initialPath: string[] }) => useTreemapDrilldown({
      nodes: NODES,
      initialPrimary: 'fn',
      initialPath: props.initialPath,
      preserveUnclassified: true,
      onPathChange,
    }),
    { initialProps: { initialPath } },
  ),
})

describe('useTreemapDrilldown: signed corrections after the fn→ec pivot', () => {
  it('does not advance past a 3-part economic code, where the depth is capped', () => {
    const { hook, onPathChange } = drilldown([...PIVOT, '20', '20.01'])
    expect(hook.result.current.activePrimary).toBe('ec')
    expect(hook.result.current.treemapData).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: '20.01.01', value: 100 }),
      expect.objectContaining({ code: '20.01', value: -10, terminal: true }),
    ]))

    act(() => hook.result.current.onNodeClick('20.01.01'))
    expect(onPathChange).not.toHaveBeenCalled()
  })

  it('still advances into a real level that holds only a posting at the drilled code', () => {
    const initialPath = [...PIVOT, '20']
    const { hook, onPathChange } = drilldown(initialPath)

    act(() => hook.result.current.onNodeClick('20.02'))
    const nextPath = [...initialPath, '20.02']
    expect(onPathChange).toHaveBeenCalledWith(nextPath)

    hook.rerender({ initialPath: nextPath })
    expect(hook.result.current.treemapData).toEqual([
      expect.objectContaining({ code: '20.02', value: -5, terminal: true }),
    ])
  })
})

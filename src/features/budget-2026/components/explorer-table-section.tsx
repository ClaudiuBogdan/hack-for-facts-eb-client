import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { sankey, sankeyLinkHorizontal, type SankeyNode, type SankeyLink } from 'd3-sankey'
import type { Currency } from '@/schemas/charts'
import { formatBudget2026CompactAmount, formatBudget2026Currency } from '../formatting'
import { SectionWrapper } from './section-wrapper'
import type { EntityEconomicItem } from '../types'

type Props = {
  readonly data: readonly EntityEconomicItem[]
  readonly currency?: Currency
}

type NodeDatum = { id: string; label: string }
type LinkDatum = { source: string; target: string; value: number }
type BreakdownItem = { label: string; value: number; pct: number; color: string }
type TooltipState = {
  x: number; y: number; label: string; value: number
  breakdown: readonly BreakdownItem[]
} | null

const MAX_ENTITIES = 12
const MAX_CATEGORIES = 10

const ENTITY_COLORS: string[] = [
  '#3b82f6', '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#ef4444', '#8b5cf6', '#22c55e', '#06b6d4', '#f97316',
  '#14b8a6', '#84cc16', '#a855f7',
]

const CATEGORY_COLORS: Record<string, string> = {
  'Cheltuieli de personal': '#64748b',
  'Bunuri si servicii': '#0ea5e9',
  'Active nefinanciare': '#059669',
  'Asistenta sociala': '#e11d48',
  'Alte transferuri': '#7c3aed',
  'Transferuri intre unitati': '#9333ea',
  'Subventii': '#d97706',
  'Dobanzi': '#dc2626',
  'Proiecte FEN postaderare': '#2563eb',
  'Proiecte FEN 2020': '#1d4ed8',
  'Proiecte FEN 2021-2027': '#1e40af',
  'Proiecte asistenta financiara': '#3b82f6',
  'Fonduri de rezerva': '#6366f1',
  'Alte cheltuieli': '#94a3b8',
  'Imprumuturi': '#b91c1c',
  'Rambursari de credite': '#991b1b',
  'Neclasificat': '#a1a1aa',
}

export function ExplorerTableSection({ data, currency = 'RON' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Build Sankey data: top entities (left) -> top categories (right), with "Altele" buckets
  const sankeyInput = useMemo(() => {
    // Aggregate by entity
    const entityTotals = new Map<string, { label: string; total: number }>()
    for (const item of data) {
      const existing = entityTotals.get(item.entity)
      if (existing) { existing.total += item.propuneri_2026 }
      else { entityTotals.set(item.entity, { label: item.entity_label, total: item.propuneri_2026 }) }
    }
    const sortedEntities = Array.from(entityTotals.entries()).sort((a, b) => b[1].total - a[1].total)
    const topEntities = new Set(sortedEntities.slice(0, MAX_ENTITIES).map(([k]) => k))

    // Aggregate by category
    const catTotals = new Map<string, number>()
    for (const item of data) {
      catTotals.set(item.economic_label, (catTotals.get(item.economic_label) ?? 0) + item.propuneri_2026)
    }
    const sortedCats = Array.from(catTotals.entries()).sort((a, b) => b[1] - a[1])
    const topCats = new Set(sortedCats.slice(0, MAX_CATEGORIES).map(([k]) => k))

    // Build links
    const linkMap = new Map<string, number>()
    for (const item of data) {
      const entityKey = topEntities.has(item.entity) ? `ent:${item.entity}` : 'ent:__altele__'
      const catKey = topCats.has(item.economic_label) ? `cat:${item.economic_label}` : 'cat:__altele__'
      const key = `${entityKey}|${catKey}`
      linkMap.set(key, (linkMap.get(key) ?? 0) + item.propuneri_2026)
    }

    // Build nodes
    const nodeSet = new Set<string>()
    const links: LinkDatum[] = []
    for (const [key, value] of linkMap) {
      if (value <= 0) continue
      const [source, target] = key.split('|')
      nodeSet.add(source)
      nodeSet.add(target)
      links.push({ source, target, value })
    }

    const nodes: NodeDatum[] = Array.from(nodeSet).map((id) => {
      if (id === 'ent:__altele__') return { id, label: 'Alte institutii' }
      if (id === 'cat:__altele__') return { id, label: 'Alte categorii' }
      if (id.startsWith('ent:')) {
        const entityEntry = entityTotals.get(id.replace('ent:', ''))
        return { id, label: entityEntry?.label ?? id }
      }
      return { id, label: id.replace('cat:', '') }
    })

    // Entity color map
    const entityColorMap = new Map<string, string>()
    const topEntityList = sortedEntities.slice(0, MAX_ENTITIES)
    for (let i = 0; i < topEntityList.length; i++) {
      entityColorMap.set(`ent:${topEntityList[i][0]}`, ENTITY_COLORS[i % ENTITY_COLORS.length])
    }
    entityColorMap.set('ent:__altele__', '#94a3b8')

    return { nodes, links, entityColorMap }
  }, [data])

  const isMobile = width > 0 && width < 640

  const sankeyLayout = useMemo(() => {
    if (width === 0 || sankeyInput.links.length === 0) return null

    const margins = { top: 16, right: 180, bottom: 16, left: 200 }
    const effectiveWidth = isMobile ? 820 : width
    const chartWidth = effectiveWidth - margins.left - margins.right
    const chartHeight = Math.max(460, sankeyInput.nodes.length * 28)

    const generator = sankey<NodeDatum, LinkDatum>()
      .nodeId((d) => d.id)
      .nodeWidth(10)
      .nodePadding(14)
      .extent([[0, 0], [chartWidth, chartHeight]])
      .iterations(32)

    const result = generator({
      nodes: sankeyInput.nodes.map((n) => ({ ...n })),
      links: sankeyInput.links.map((l) => ({ ...l })),
    })

    return { ...result, margins, chartHeight: chartHeight + margins.top + margins.bottom, effectiveWidth }
  }, [width, sankeyInput, isMobile])

  const handleNodeEnter = useCallback((nodeId: string, label: string, value: number, e: React.MouseEvent) => {
    setHoveredNode(nodeId)
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!containerRect || !sankeyLayout) return

    const isEntity = nodeId.startsWith('ent:')
    const connectedLinks = sankeyLayout.links.filter((link) => {
      const src = link.source as SankeyNode<NodeDatum, LinkDatum>
      const tgt = link.target as SankeyNode<NodeDatum, LinkDatum>
      return isEntity ? src.id === nodeId : tgt.id === nodeId
    })

    const breakdown: BreakdownItem[] = connectedLinks
      .map((link) => {
        const peer = isEntity
          ? (link.target as SankeyNode<NodeDatum, LinkDatum>)
          : (link.source as SankeyNode<NodeDatum, LinkDatum>)
        const linkValue = (link as SankeyLink<NodeDatum, LinkDatum>).value ?? 0
        const peerLabel = peer.label ?? ''
        const color = isEntity
          ? (CATEGORY_COLORS[peerLabel] ?? '#94a3b8')
          : (sankeyInput.entityColorMap.get(peer.id) ?? '#94a3b8')
        return { label: peerLabel, value: linkValue, pct: value > 0 ? (linkValue / value) * 100 : 0, color }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    setTooltip({
      x: rect.left + rect.width / 2 - containerRect.left + (scrollRef.current?.scrollLeft ?? 0),
      y: rect.top - containerRect.top,
      label, value, breakdown,
    })
  }, [sankeyLayout, sankeyInput.entityColorMap])

  const handleNodeLeave = useCallback(() => {
    setHoveredNode(null)
    setTooltip(null)
  }, [])

  return (
    <SectionWrapper id="explorer">
      <div className="rounded-[28px] border border-border/40 bg-gradient-to-br from-background via-background to-primary/[0.03] shadow-xl shadow-primary/5">
        <div className="space-y-1 p-6 pb-2 sm:p-8 sm:pb-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            {'Distributie'}
          </p>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            {'Institutii si tipuri de cheltuieli'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {'Cum se distribuie bugetul de la institutii catre categorii economice (personal, bunuri, transferuri, capital)'}
          </p>
        </div>

        <div ref={containerRef} className="relative px-4 pb-6 sm:px-8 sm:pb-8">
          {isMobile && (
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-background to-transparent" />
          )}

          <div
            ref={scrollRef}
            className={isMobile ? 'overflow-x-auto -mx-4 px-4 pb-2' : ''}
            style={isMobile ? { WebkitOverflowScrolling: 'touch' } : undefined}
          >
            {sankeyLayout && width > 0 && (
              <svg
                width={sankeyLayout.effectiveWidth}
                height={sankeyLayout.chartHeight}
                className={isMobile ? '' : 'w-full'}
                role="img"
                aria-label="Diagrama distributie institutii catre categorii economice"
              >
                <g transform={`translate(${sankeyLayout.margins.left},${sankeyLayout.margins.top})`}>
                  {sankeyLayout.links.map((link, i) => {
                    const path = sankeyLinkHorizontal()(link as never)
                    if (!path) return null
                    const sourceNode = link.source as SankeyNode<NodeDatum, LinkDatum>
                    const targetNode = link.target as SankeyNode<NodeDatum, LinkDatum>
                    const color = sankeyInput.entityColorMap.get(sourceNode.id) ?? '#94a3b8'
                    const isConnected = !hoveredNode ||
                      sourceNode.id === hoveredNode ||
                      targetNode.id === hoveredNode

                    return (
                      <path
                        key={`link-${i}`}
                        d={path}
                        fill="none"
                        stroke={color}
                        strokeOpacity={hoveredNode ? (isConnected ? 0.5 : 0.04) : 0.25}
                        strokeWidth={Math.max(1, (link as SankeyLink<NodeDatum, LinkDatum>).width ?? 0)}
                        className="transition-[stroke-opacity] duration-200"
                      />
                    )
                  })}

                  {sankeyLayout.nodes.map((node) => {
                    const n = node as SankeyNode<NodeDatum, LinkDatum>
                    if (n.x0 === undefined || n.y0 === undefined || n.x1 === undefined || n.y1 === undefined) return null

                    const x = n.x0
                    const y = n.y0
                    const w = n.x1 - n.x0
                    const h = n.y1 - n.y0
                    const isEntity = n.id.startsWith('ent:')
                    const label = n.label ?? ''
                    const color = isEntity
                      ? (sankeyInput.entityColorMap.get(n.id) ?? '#94a3b8')
                      : (CATEGORY_COLORS[label] ?? '#94a3b8')
                    const nodeValue = n.value ?? 0
                    const labelX = isEntity ? x - 8 : x + w + 8
                    const textAnchor = isEntity ? 'end' : 'start'
                    const isActive = hoveredNode === n.id
                    const isDimmed = hoveredNode !== null && hoveredNode !== n.id

                    return (
                      <g
                        key={n.id}
                        onMouseEnter={(e) => handleNodeEnter(n.id, label, nodeValue, e)}
                        onMouseLeave={handleNodeLeave}
                        className="cursor-pointer"
                        opacity={isDimmed ? 0.4 : 1}
                        style={{ transition: 'opacity 200ms' }}
                      >
                        {isActive && (
                          <rect x={x - 3} y={y - 2} width={w + 6} height={h + 4} fill={color} opacity={0.15} rx={6} />
                        )}
                        <rect x={x} y={y} width={w} height={h} fill={color} rx={3} />
                        <text
                          x={labelX}
                          y={y + h / 2 - 1}
                          textAnchor={textAnchor}
                          fontSize={12}
                          fontWeight={isActive ? 700 : 500}
                          fill="currentColor"
                          className="text-foreground"
                          dominantBaseline="middle"
                        >
                          {label.length > 30 ? `${label.slice(0, 28)}...` : label}
                        </text>
                        <text
                          x={labelX}
                          y={y + h / 2 + 14}
                          textAnchor={textAnchor}
                          fontSize={10}
                          fill="currentColor"
                          className="text-muted-foreground"
                          dominantBaseline="middle"
                        >
                          {formatBudget2026CompactAmount(nodeValue, currency)}
                        </text>
                      </g>
                    )
                  })}
                </g>
              </svg>
            )}

            {(!sankeyLayout || width === 0) && (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                <p>Se incarca diagrama...</p>
              </div>
            )}
          </div>

          {tooltip && (
            <div
              className="pointer-events-none absolute z-20 min-w-[200px] max-w-[280px] rounded-2xl border border-border/60 bg-popover/95 p-4 shadow-xl backdrop-blur-sm"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: 'translate(-50%, -100%) translateY(-12px)',
              }}
            >
              <p className="text-sm font-bold text-foreground">{tooltip.label}</p>
              <p className="text-xs text-muted-foreground">{formatBudget2026Currency(tooltip.value, currency, 'compact')}</p>
              {tooltip.breakdown.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3">
                  {tooltip.breakdown.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{item.label}</span>
                      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-foreground">{item.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Total footer */}
        <div className="border-t border-border/30 px-6 py-4 sm:px-8">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total buget 2026</span>
            <span className="font-bold tabular-nums text-foreground">
              {formatBudget2026Currency(data.reduce((sum, item) => sum + item.propuneri_2026, 0), currency, 'compact')}
            </span>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}

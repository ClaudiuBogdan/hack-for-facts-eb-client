import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { sankey, sankeyLinkHorizontal, type SankeyNode, type SankeyLink } from 'd3-sankey'
import { cn } from '@/lib/utils'
import type { Currency } from '@/schemas/charts'
import { formatBudget2026CompactAmount, formatBudget2026Currency } from '../formatting'
import { SectionWrapper } from './section-wrapper'
import type { SankeyLink as SankeyLinkData, EntityEconomicItem } from '../types'

type Props = {
  readonly functionalEconomicLinks: readonly SankeyLinkData[]
  readonly entityEconomicData: readonly EntityEconomicItem[]
  readonly currency: Currency
}

type TabId = 'functional' | 'institution'

// ── Shared types ──
type NodeDatum = { id: string; label: string }
type LinkDatum = { source: string; target: string; value: number }
type BreakdownItem = { label: string; value: number; pct: number; color: string }
type TooltipState = {
  x: number; y: number; label: string; value: number
  breakdown: readonly BreakdownItem[]
} | null

// ── Color maps ──
const FN_COLORS: Record<string, string> = {
  'Transporturi': '#3b82f6', 'Servicii publice generale': '#6366f1',
  'Asigurari si asistenta sociala': '#ec4899', 'Invatamant': '#f59e0b',
  'Aparare': '#10b981', 'Sanatate': '#ef4444',
  'Ordine publica si siguranta': '#8b5cf6', 'Agricultura': '#22c55e',
  'Actiuni economice generale': '#06b6d4', 'Combustibili si energie': '#f97316',
  'Locuinte si dezvoltare publica': '#14b8a6', 'Protectia mediului': '#84cc16',
  'Cultura, recreere si religie': '#a855f7', 'Neclasificat (functional)': '#a1a1aa',
}

const EC_COLORS: Record<string, string> = {
  'Cheltuieli de personal': '#64748b', 'Bunuri si servicii': '#0ea5e9',
  'Active nefinanciare': '#059669', 'Asistenta sociala': '#e11d48',
  'Alte transferuri': '#7c3aed', 'Transferuri intre unitati': '#9333ea',
  'Subventii': '#d97706', 'Dobanzi': '#dc2626',
  'Proiecte FEN postaderare': '#2563eb', 'Proiecte FEN 2020': '#1d4ed8',
  'Proiecte FEN 2021-2027': '#1e40af', 'Proiecte asistenta financiara': '#3b82f6',
  'Fonduri de rezerva': '#6366f1', 'Alte cheltuieli': '#94a3b8',
  'Imprumuturi': '#b91c1c', 'Rambursari de credite': '#991b1b',
  'Neclasificat': '#a1a1aa',
  'Neclasificat / nealiniat in flux': '#a1a1aa',
}

const ENTITY_COLORS: string[] = [
  '#3b82f6', '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#ef4444', '#8b5cf6', '#22c55e', '#06b6d4', '#f97316',
  '#14b8a6', '#84cc16', '#a855f7',
]

// ── Build institution -> economic sankey input from entity-economic matrix ──
const MAX_ENTITIES = 12
const MAX_EC_CATS = 10

function buildInstitutionSankeyInput(data: readonly EntityEconomicItem[]) {
  const entityTotals = new Map<string, { label: string; total: number }>()
  for (const item of data) {
    const ex = entityTotals.get(item.entity)
    if (ex) ex.total += item.propuneri_2026
    else entityTotals.set(item.entity, { label: item.entity_label, total: item.propuneri_2026 })
  }
  const sorted = Array.from(entityTotals.entries()).sort((a, b) => b[1].total - a[1].total)
  const topEnts = new Set(sorted.slice(0, MAX_ENTITIES).map(([k]) => k))

  const catTotals = new Map<string, number>()
  for (const item of data) catTotals.set(item.economic_label, (catTotals.get(item.economic_label) ?? 0) + item.propuneri_2026)
  const sortedCats = Array.from(catTotals.entries()).sort((a, b) => b[1] - a[1])
  const topCats = new Set(sortedCats.slice(0, MAX_EC_CATS).map(([k]) => k))

  const linkMap = new Map<string, number>()
  for (const item of data) {
    const eKey = topEnts.has(item.entity) ? `left:${item.entity}` : 'left:__other__'
    const cKey = topCats.has(item.economic_label) ? `right:${item.economic_label}` : 'right:__other__'
    linkMap.set(`${eKey}|${cKey}`, (linkMap.get(`${eKey}|${cKey}`) ?? 0) + item.propuneri_2026)
  }

  const nodeSet = new Set<string>()
  const links: LinkDatum[] = []
  for (const [key, value] of linkMap) {
    if (value <= 0) continue
    const [source, target] = key.split('|')
    nodeSet.add(source); nodeSet.add(target)
    links.push({ source, target, value })
  }

  const nodes: NodeDatum[] = Array.from(nodeSet).map((id) => {
    if (id === 'left:__other__') return { id, label: 'Alte institutii' }
    if (id === 'right:__other__') return { id, label: 'Alte categorii' }
    if (id.startsWith('left:')) {
      const entry = entityTotals.get(id.replace('left:', ''))
      return { id, label: entry?.label ?? id }
    }
    return { id, label: id.replace('right:', '') }
  })

  const entityColorMap = new Map<string, string>()
  sorted.slice(0, MAX_ENTITIES).forEach(([k], i) => entityColorMap.set(`left:${k}`, ENTITY_COLORS[i % ENTITY_COLORS.length]))
  entityColorMap.set('left:__other__', '#94a3b8')

  return { nodes, links, leftColors: entityColorMap, rightColors: EC_COLORS, leftPrefix: 'left:', rightPrefix: 'right:' }
}

// ── Build functional -> economic sankey input ──
function buildFunctionalSankeyInput(rawLinks: readonly SankeyLinkData[]) {
  const totalValue = rawLinks.reduce((sum, l) => sum + l.value, 0)
  const threshold = totalValue * 0.005
  const filtered = rawLinks.filter((l) => l.value > threshold).slice(0, 50)

  const nodeSet = new Set<string>()
  const links: LinkDatum[] = []
  for (const l of filtered) {
    const src = `left:${l.source}`; const tgt = `right:${l.target}`
    nodeSet.add(src); nodeSet.add(tgt)
    links.push({ source: src, target: tgt, value: l.value })
  }

  const nodes: NodeDatum[] = Array.from(nodeSet).map((id) => ({
    id, label: id.replace(/^(left|right):/, ''),
  }))

  return { nodes, links, leftColors: FN_COLORS, rightColors: EC_COLORS, leftPrefix: 'left:', rightPrefix: 'right:' }
}

// ── Generic Sankey renderer ──
type SankeyInput = {
  nodes: NodeDatum[]; links: LinkDatum[]
  leftColors: Record<string, string> | Map<string, string>
  rightColors: Record<string, string>
  leftPrefix: string; rightPrefix: string
}

function getColor(map: Record<string, string> | Map<string, string>, key: string): string | undefined {
  if (map instanceof Map) return map.get(key)
  return map[key]
}

function SankeyDiagram({
  input,
  totalLabel,
  totalLabelText,
  currency,
  width,
}: {
  readonly input: SankeyInput
  readonly totalLabel: number
  readonly totalLabelText: string
  readonly currency: Currency
  readonly width: number
}) {
  const diagramRef = useRef<HTMLDivElement>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState>(null)

  const chartHeight = useMemo(() => Math.max(420, input.nodes.length * 26), [input.nodes.length])
  const isMobile = width > 0 && width < 640

  const sankeyLayout = useMemo(() => {
    if (width === 0 || input.links.length === 0) return null
    const margins = isMobile
      ? { top: 16, right: 8, bottom: 16, left: 8 }
      : { top: 16, right: 190, bottom: 16, left: 200 }
    const cw = width - margins.left - margins.right

    const generator = sankey<NodeDatum, LinkDatum>()
      .nodeId((d) => d.id).nodeWidth(10).nodePadding(14)
      .extent([[0, 0], [cw, chartHeight]]).iterations(32)

    const result = generator({
      nodes: input.nodes.map((n) => ({ ...n })),
      links: input.links.map((l) => ({ ...l })),
    })
    return { ...result, margins, chartHeight: chartHeight + margins.top + margins.bottom }
  }, [width, input, isMobile, chartHeight])

  const handleNodeEnter = useCallback((nodeId: string, label: string, value: number, e: React.MouseEvent | React.TouchEvent) => {
    setHoveredNode(nodeId)
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
    const cr = diagramRef.current?.getBoundingClientRect()
    if (!cr || !sankeyLayout) return

    const isLeft = nodeId.startsWith(input.leftPrefix)
    const connected = sankeyLayout.links.filter((link) => {
      const s = link.source as SankeyNode<NodeDatum, LinkDatum>
      const t = link.target as SankeyNode<NodeDatum, LinkDatum>
      return isLeft ? s.id === nodeId : t.id === nodeId
    })
    const breakdown: BreakdownItem[] = connected
      .map((link) => {
        const peer = isLeft ? (link.target as SankeyNode<NodeDatum, LinkDatum>) : (link.source as SankeyNode<NodeDatum, LinkDatum>)
        const lv = (link as SankeyLink<NodeDatum, LinkDatum>).value ?? 0
        const pl = peer.label ?? ''
        const color = isLeft
          ? (getColor(input.rightColors, pl) ?? '#94a3b8')
          : (getColor(input.leftColors, peer.id) ?? getColor(input.leftColors, pl) ?? '#94a3b8')
        return { label: pl, value: lv, pct: value > 0 ? (lv / value) * 100 : 0, color }
      })
      .sort((a, b) => b.value - a.value).slice(0, 8)

    setTooltip({
      x: rect.left + rect.width / 2 - cr.left,
      y: rect.top - cr.top, label, value, breakdown,
    })
  }, [sankeyLayout, input])

  const handleNodeLeave = useCallback(() => { setHoveredNode(null); setTooltip(null) }, [])

  const handleSvgTouchStart = useCallback(() => { handleNodeLeave() }, [handleNodeLeave])

  return (
    <>
      <div ref={diagramRef} className="relative" style={{ minHeight: chartHeight + 32 }}>
        {sankeyLayout && width > 0 && (
          <svg
            width={width}
            height={sankeyLayout.chartHeight}
            className="w-full"
            role="img"
            style={{ display: 'block' }}
            onTouchStart={handleSvgTouchStart}
          >
            <g transform={`translate(${sankeyLayout.margins.left},${sankeyLayout.margins.top})`}>
              {sankeyLayout.links.map((link, i) => {
                const path = sankeyLinkHorizontal()(link as never)
                if (!path) return null
                const src = link.source as SankeyNode<NodeDatum, LinkDatum>
                const tgt = link.target as SankeyNode<NodeDatum, LinkDatum>
                const color = getColor(input.leftColors, src.id) ?? getColor(input.leftColors, src.label ?? '') ?? '#94a3b8'
                const isConn = !hoveredNode || src.id === hoveredNode || tgt.id === hoveredNode
                return <path key={`l-${i}`} d={path} fill="none" stroke={color} strokeOpacity={hoveredNode ? (isConn ? 0.5 : 0.04) : 0.25} strokeWidth={Math.max(1, (link as SankeyLink<NodeDatum, LinkDatum>).width ?? 0)} className="transition-[stroke-opacity] duration-200" />
              })}
              {sankeyLayout.nodes.map((node) => {
                const n = node as SankeyNode<NodeDatum, LinkDatum>
                if (n.x0 === undefined || n.y0 === undefined || n.x1 === undefined || n.y1 === undefined) return null
                const x = n.x0; const y = n.y0; const w = n.x1 - n.x0; const h = n.y1 - n.y0
                const isLeft = n.id.startsWith(input.leftPrefix)
                const label = n.label ?? ''
                const color = isLeft
                  ? (getColor(input.leftColors, n.id) ?? getColor(input.leftColors, label) ?? '#64748b')
                  : (getColor(input.rightColors, label) ?? '#94a3b8')
                const nv = n.value ?? 0
                const active = hoveredNode === n.id
                const dimmed = hoveredNode !== null && hoveredNode !== n.id
                return (
                  <g
                    key={n.id}
                    onMouseEnter={(e) => handleNodeEnter(n.id, label, nv, e)}
                    onMouseLeave={handleNodeLeave}
                    onTouchStart={(e) => { e.stopPropagation(); handleNodeEnter(n.id, label, nv, e) }}
                    className="cursor-pointer"
                    opacity={dimmed ? 0.4 : 1}
                    style={{ transition: 'opacity 200ms' }}
                  >
                    {active && <rect x={x - 3} y={y - 2} width={w + 6} height={h + 4} fill={color} opacity={0.15} rx={6} />}
                    <rect x={x} y={y} width={w} height={h} fill={color} rx={3} />
                    {!isMobile && (
                      <>
                        <text x={isLeft ? x - 8 : x + w + 8} y={y + h / 2 - 1} textAnchor={isLeft ? 'end' : 'start'} fontSize={12} fontWeight={active ? 700 : 500} fill="currentColor" className="text-foreground" dominantBaseline="middle">
                          {label.length > 28 ? `${label.slice(0, 26)}...` : label}
                        </text>
                        <text x={isLeft ? x - 8 : x + w + 8} y={y + h / 2 + 14} textAnchor={isLeft ? 'end' : 'start'} fontSize={10} fill="currentColor" className="text-muted-foreground" dominantBaseline="middle">
                          {formatBudget2026CompactAmount(nv, currency)}
                        </text>
                      </>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>
        )}
        {tooltip && (
          <div className="pointer-events-none absolute z-20 min-w-[200px] max-w-[280px] rounded-2xl border border-border/60 bg-popover/95 p-4 shadow-xl backdrop-blur-sm" style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%) translateY(-12px)' }}>
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
      <div className="border-t border-border/30 px-6 py-4 sm:px-8">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{totalLabelText}</span>
          <span className="font-bold tabular-nums text-foreground">{formatBudget2026Currency(totalLabel, currency, 'compact')}</span>
        </div>
      </div>
    </>
  )
}

// ── Combined section with tabs ──
export function EconomicSankeySection({ functionalEconomicLinks, entityEconomicData, currency }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('functional')
  const contentRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!contentRef.current) return
    setWidth(contentRef.current.clientWidth)

    let rafId = 0
    const observer = new ResizeObserver((entries) => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        for (const entry of entries) {
          const newWidth = Math.round(entry.contentRect.width)
          setWidth((prev) => (Math.abs(prev - newWidth) > 2 ? newWidth : prev))
        }
      })
    })
    observer.observe(contentRef.current)
    return () => { observer.disconnect(); cancelAnimationFrame(rafId) }
  }, [])

  const fnInput = useMemo(() => buildFunctionalSankeyInput(functionalEconomicLinks), [functionalEconomicLinks])
  const instInput = useMemo(() => buildInstitutionSankeyInput(entityEconomicData), [entityEconomicData])

  const visibleFunctionalTotal = useMemo(
    () => fnInput.links.reduce((sum, link) => sum + link.value, 0),
    [fnInput],
  )
  const instTotal = useMemo(() => entityEconomicData.reduce((s, d) => s + d.propuneri_2026, 0), [entityEconomicData])

  const tabs: Array<{ id: TabId; label: string; description: string }> = [
    { id: 'functional', label: 'Domenii -> Economie', description: 'Fluxurile cele mai mari dintre capitole functionale si titluri economice explicite in sursa. Legaturile mici sunt omise pentru lizibilitate.' },
    { id: 'institution', label: 'Institutii -> Economie', description: 'Distributia pe categorii economice pentru institutiile cele mai mari; restul sunt grupate in „Alte institutii” si „Alte categorii”.' },
  ]

  return (
    <SectionWrapper id="economic-sankey">
      <div className="rounded-[28px] border border-border/40 bg-gradient-to-br from-background via-background to-primary/[0.03] shadow-xl shadow-primary/5">
        <div className="space-y-4 p-6 pb-0 sm:p-8 sm:pb-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                {'Flux bugetar'}
              </p>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                {'Cum sunt repartizate creditele'}
              </h2>
            </div>

            {/* Tab switcher */}
            <div className="flex shrink-0 rounded-full border border-border bg-muted/30 p-0.5 w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {tabs.find((t) => t.id === activeTab)?.description}
          </p>
        </div>

        <div className="px-4 pb-0 pt-2 sm:px-8">
          <div ref={contentRef}>
            <div className={activeTab === 'functional' ? '' : 'hidden'}>
              <SankeyDiagram
                input={fnInput}
                totalLabel={visibleFunctionalTotal}
                totalLabelText={`Total vizibil in flux (${currency})`}
                currency={currency}
                width={width}
              />
            </div>
            <div className={activeTab === 'institution' ? '' : 'hidden'}>
              <SankeyDiagram
                input={instInput}
                totalLabel={instTotal}
                totalLabelText={`Total acoperit de flux (${currency})`}
                currency={currency}
                width={width}
              />
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}

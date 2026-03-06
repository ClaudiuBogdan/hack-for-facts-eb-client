import { type FC, useCallback, useEffect, useMemo, useRef, useState, useDeferredValue, startTransition } from 'react'
import { Treemap, Tooltip } from 'recharts'
import { Trans } from '@lingui/react/macro'
import { motion, useAnimationControls } from 'framer-motion'
import { ArrowLeft, LineChart } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

import { yValueFormatter } from '@/components/charts/components/chart-renderer/utils'
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container'
import { Button } from '@/components/ui/button'
import type { TreemapInput, ExcludedItemsSummary } from './budget-transform'
import { useIsMobile } from '@/hooks/use-mobile'
import { getNormalizationUnit } from '@/lib/utils'
import type { AnalyticsFilterType, Currency, Normalization } from '@/schemas/charts'
import { useTreemapChartLink } from './useTreemapChartLink'
import { buildTreemapChartLink } from '@/lib/chart-links'
import { ClassificationInfoLink } from '@/components/common/classification-info-link'
import type { TreemapAmountFilter } from './useTreemapAmountFilter'

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d',
  '#A4DE6C', '#D0ED57', '#FF7300', '#FFB300', '#E53935', '#D81B60',
  '#8E24AA', '#5E35B1', '#3949AB', '#1E88E5', '#039BE5', '#00ACC1',
  '#00897B', '#43A047', '#7CB342', '#C0CA33', '#FDD835', '#FFB300',
  '#FB8C00', '#F4511E',
]

const getColor = (key: string) => {
  let hash = 0
  if (key.length === 0) return COLORS[0]
  for (let index = 0; index < key.length; index += 1) {
    const char = key.charCodeAt(index)
    hash = ((hash << 5) - hash) + char
    hash &= hash
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

const adjustColorBrightness = (hexColor: string | undefined, percentage: number) => {
  if (!hexColor || typeof hexColor !== 'string') {
    return COLORS[0]
  }

  const hexPattern = /^#?[0-9a-fA-F]{3,6}$/
  if (!hexPattern.test(hexColor)) {
    return hexColor
  }

  const normalizedHex = hexColor.replace('#', '')
  const isShort = normalizedHex.length === 3
  const expandedHex = isShort
    ? normalizedHex.split('').map((char) => char + char).join('')
    : normalizedHex

  const numericValue = parseInt(expandedHex, 16)
  const red = (numericValue >> 16) & 0xff
  const green = (numericValue >> 8) & 0xff
  const blue = numericValue & 0xff

  const adjustChannel = (channel: number) => {
    const delta = (percentage / 100) * 255
    return Math.max(0, Math.min(255, channel + delta))
  }

  const adjustedRed = Math.round(adjustChannel(red))
  const adjustedGreen = Math.round(adjustChannel(green))
  const adjustedBlue = Math.round(adjustChannel(blue))

  const toHex = (value: number) => value.toString(16).padStart(2, '0')
  return `#${toHex(adjustedRed)}${toHex(adjustedGreen)}${toHex(adjustedBlue)}`
}

const isSafariBrowser = () => {
  if (typeof navigator === 'undefined') return false
  const userAgent = navigator.userAgent
  return /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Android/i.test(userAgent)
}

type BreadcrumbEntry = { code: string; label: string; type?: 'fn' | 'ec' }

type Props = {
  data: TreemapInput[]
  primary: 'fn' | 'ec'
  onNodeClick?: (code: string | null) => void
  onBreadcrumbClick?: (code: string | null, index?: number) => void
  path?: BreadcrumbEntry[]
  onViewDetails?: () => void
  showViewDetails?: boolean
  normalization?: Normalization
  currency?: Currency
  excludedItemsSummary?: ExcludedItemsSummary
  chartFilterInput?: AnalyticsFilterType // Optional filter input for the chart link
  amountFilter?: TreemapAmountFilter
}

type TreemapNodePayload = {
  name: string
  value: number
  signedValue: number
  layoutValue: number
  code: string
  fill: string
}

const CustomizedContent: FC<{
  name: string
  value: number
  depth: number
  x: number
  y: number
  width: number
  height: number
  fill: string
  root: { value: number }
  normalization?: Normalization
  currency?: Currency
  primary?: 'fn' | 'ec'
  code?: string
  allowScaleAnimation?: boolean
  signedValue?: number
  // Recharts passes the original datum under `payload`. We use its fill for stable coloring.
  payload?: TreemapNodePayload
}> = (props) => {
  const { name, value, depth, x = 0, y = 0, width = 0, height = 0, fill, root, normalization, currency, primary, allowScaleAnimation = true } = props
  const hasAnimatedInRef = useRef(false)
  const [isHovered, setIsHovered] = useState(false)
  const code = props.code ?? props.payload?.code
  const bounceControls = useAnimationControls()
  const randomDelayRef = useRef(Math.random() * 0.15)
  const textScale = isHovered ? 1.1 : 1

  useEffect(() => {
    hasAnimatedInRef.current = true
  }, [])

  if (!Number.isFinite(value) || depth === 0) {
    return null
  }

  const signedValue = Number.isFinite(props.signedValue)
    ? props.signedValue!
    : (Number.isFinite(props.payload?.signedValue) ? props.payload!.signedValue : value)
  const magnitudeValue = Math.abs(signedValue)
  const total = root?.value ?? 0
  const percentage = total > 0 ? (magnitudeValue / total) * 100 : 0
  const unit = getNormalizationUnit({ normalization: (normalization ?? 'total') as any, currency: currency as any })
  const displayValue = yValueFormatter(signedValue, unit, 'compact')

  const baseColor = '#FFFFFF'
  const nameFontSize = 16
  const valueFontSize = 14
  const percentageFontSize = 12
  const nameLineHeight = nameFontSize * 1.2

  const canShowName = width > 60 && height > 30
  const canShowTwoLines = canShowName && height > 60
  const canShowValue = canShowName && height > (canShowTwoLines ? 80 : 50)
  const canShowPercentage = canShowName && height > (canShowTwoLines ? 100 : 70)
  const labelWidth = Math.max(width - 8, 0)
  const labelHeight = canShowTwoLines ? nameLineHeight * 2 : nameFontSize * 1.3
  const labelYPosition = (() => {
    const textHeight = canShowTwoLines ? nameLineHeight * 2 : nameFontSize * 1.3
    if (canShowValue) {
      const valueHeight = valueFontSize + 8
      const percentHeight = canShowPercentage ? percentageFontSize + 8 : 0
      const totalHeight = textHeight + valueHeight + percentHeight
      return y + (height - totalHeight) / 2
    }
    return y + (height - textHeight) / 2
  })()

  const rectTransition = {
    type: 'spring',
    damping: 28,
    stiffness: 260,
    mass: 0.8,
  } as const

  const textTransition = {
    type: 'spring',
    damping: 10,
    stiffness: 150,
    mass: 0.8,
    restDelta: 0.001,
  } as const

  const hoverTransition = {
    type: 'spring',
    damping: 18,
    stiffness: 280,
    mass: 0.7,
  } as const

  const initialRectState = hasAnimatedInRef.current
    ? undefined
    : {
      opacity: 0,
      x: x + (width / 2),
      y: y + (height / 2),
      width: 0,
      height: 0,
    }

  // Keep original color logic; rely on Recharts-provided `fill`, but if payload carries a fill use it.
  const payloadFill = (props as { payload?: { fill?: string } }).payload?.fill
  const defaultFill = typeof fill === 'string' && fill.length > 0
    ? fill
    : (typeof payloadFill === 'string' && payloadFill.length > 0 ? payloadFill : COLORS[0])

  useEffect(() => {
    void bounceControls.start({
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', damping: 30, stiffness: 220, mass: 0.9 },
    })
  }, [bounceControls])

  const triggerBounce = () => {
    void bounceControls.start({
      scale: [1, 0.94, 1.04, 1],
      transition: {
        duration: 0.42,
        times: [0, 0.45, 0.75, 1],
        ease: 'easeInOut',
      },
    })
  }

  // Determine classification type for navigation

  return (
    <motion.g
      initial={hasAnimatedInRef.current ? undefined : { opacity: 0, scale: 0.94 }}
      animate={bounceControls}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onClick={triggerBounce}
    >
      <motion.rect
        animate={{
          x,
          y,
          width,
          height,
          opacity: 1,
          fill: isHovered ? adjustColorBrightness(defaultFill, 12) : defaultFill,
        }}
        initial={initialRectState}
        transition={rectTransition}
        fill={defaultFill}
        stroke="#fff"
        strokeWidth={2 / (depth + 1e-5)}
        strokeOpacity={0.5}
        cursor="pointer"
      />
      {canShowName && (
        <motion.foreignObject
          width={labelWidth}
          height={labelHeight}
          animate={{
            x: x + 4,
            y: labelYPosition,
            opacity: 1,
            scale: allowScaleAnimation ? textScale : 1,
          }}
          initial={hasAnimatedInRef.current ? { opacity: 0.2 } : {
            opacity: 0,
            x: allowScaleAnimation ? x + 4 + 20 : x + 4,
            y: allowScaleAnimation ? labelYPosition - 6 : labelYPosition,
            scale: allowScaleAnimation ? 0.3 : 1,
          }}
          transition={hasAnimatedInRef.current ? hoverTransition : {
            ...textTransition,
            delay: randomDelayRef.current,
          }}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div
            style={{
              color: baseColor,
              fontSize: `${nameFontSize}px`,
              fontWeight: 500,
              lineHeight: `${nameLineHeight}px`,
              textAlign: 'center',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: canShowTwoLines ? 2 : 1,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            {name}
          </div>
        </motion.foreignObject>
      )}
      {canShowValue && (
        <motion.text
          animate={{
            x: x + width / 2,
            y: (() => {
              const textHeight = canShowTwoLines ? nameLineHeight * 2 : nameFontSize * 1.3
              const valueHeight = valueFontSize + 8
              const percentHeight = canShowPercentage ? percentageFontSize + 8 : 0
              const totalHeight = textHeight + valueHeight + percentHeight
              const nameY = y + (height - totalHeight) / 2
              return nameY + textHeight + 8
            })(),
            opacity: 1,
            scale: textScale,
          }}
          initial={hasAnimatedInRef.current ? { opacity: 0.2 } : {
            opacity: 0,
            x: x + width / 2 + 15,
            y: (() => {
              const textHeight = canShowTwoLines ? nameLineHeight * 2 : nameFontSize * 1.3
              const valueHeight = valueFontSize + 8
              const percentHeight = canShowPercentage ? percentageFontSize + 8 : 0
              const totalHeight = textHeight + valueHeight + percentHeight
              const nameY = y + (height - totalHeight) / 2
              return nameY + textHeight + 8 - 5
            })(),
            scale: 0.25,
          }}
          transition={hasAnimatedInRef.current ? hoverTransition : {
            ...textTransition,
            delay: randomDelayRef.current + 0.03,
          }}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={baseColor}
          fontSize={valueFontSize}
          fillOpacity={0.9}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {displayValue}
        </motion.text>
      )}
      {canShowPercentage && (
        <motion.text
          animate={{
            x: x + width / 2,
            y: (() => {
              const textHeight = canShowTwoLines ? nameLineHeight * 2 : nameFontSize * 1.3
              const valueHeight = valueFontSize + 8
              const percentHeight = percentageFontSize + 8
              const totalHeight = textHeight + valueHeight + percentHeight
              const nameY = y + (height - totalHeight) / 2
              return nameY + textHeight + valueHeight + 8
            })(),
            opacity: 1,
            scale: textScale,
          }}
          initial={hasAnimatedInRef.current ? { opacity: 0.2 } : {
            opacity: 0,
            x: x + width / 2 + 12,
            y: (() => {
              const textHeight = canShowTwoLines ? nameLineHeight * 2 : nameFontSize * 1.3
              const valueHeight = valueFontSize + 8
              const percentHeight = percentageFontSize + 8
              const totalHeight = textHeight + valueHeight + percentHeight
              const nameY = y + (height - totalHeight) / 2
              return nameY + textHeight + valueHeight + 8 - 4
            })(),
            scale: 0.2,
          }}
          transition={hasAnimatedInRef.current ? hoverTransition : {
            ...textTransition,
            delay: randomDelayRef.current + 0.06,
          }}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={baseColor}
          fontSize={percentageFontSize}
          fillOpacity={0.85}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {`${percentage.toFixed(1)}%`}
        </motion.text>
      )}
      {/* Classification info icon - shown on hover in top-left corner */}
      {isHovered && code && width > 40 && height > 40 && (
        <motion.foreignObject
          x={x + 4}
          y={y + 4}
          width={32}
          height={32}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          style={{ overflow: 'visible' }}
        >
          <ClassificationInfoLink
            type={primary === 'fn' ? 'functional' : 'economic'}
            code={code}
            className="ml-0 w-6 h-6 bg-black/60 hover:bg-black/80"
            iconClassName="h-4 w-4 text-white"
            showOnHoverOnly={false}
          />
        </motion.foreignObject>
      )}
    </motion.g>
  )
}

export function BudgetTreemap({
  data,
  primary,
  onNodeClick,
  onBreadcrumbClick,
  path = [],
  onViewDetails,
  showViewDetails = false,
  normalization,
  currency,
  chartFilterInput: filterInput,
  amountFilter,
}: Props) {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [allowScaleAnimation] = useState(() => !isSafariBrowser())

  // Defer heavy-changing inputs to keep UI responsive while treemap layout catches up
  const deferredData = useDeferredValue(data)
  const deferredPath = useDeferredValue(path)

  const payloadData = useMemo<TreemapNodePayload[]>(() => {
    return deferredData.map((node) => ({
      name: node.name,
      value: node.value,
      signedValue: node.value,
      layoutValue: Math.abs(Number.isFinite(node.value) ? node.value : 0),
      code: node.code,
      fill: getColor(`${primary}-${node.code}`),
    }))
  }, [deferredData, primary])

  // Generate chart link configuration
  const { hasChartLink, seriesConfigs, chartTitle } = useTreemapChartLink({
    data,
    path,
    primary,
    filterInput,
  })

  const handleBackClick = () => {
    if (!onBreadcrumbClick) return

    if (path.length > 1) {
      const parentIndex = path.length - 2
      const parent = path[parentIndex]
      onBreadcrumbClick(parent.code, parentIndex)
    } else if (path.length === 1) {
      onBreadcrumbClick(null)
    }
  }

  const handleViewAsChart = () => {
    if (!hasChartLink || seriesConfigs.length === 0) return

    const chartLink = buildTreemapChartLink({
      title: chartTitle,
      seriesConfigs,
      normalization,
    })

    startTransition(() => {
      navigate({
        to: chartLink.to,
        params: chartLink.params,
        search: chartLink.search,
      })
    })
  }

  // Calculate min/max among current nodes for the amount slider
  const { minValue, maxValue } = useMemo(() => {
    if (!payloadData.length) return { minValue: 0, maxValue: 0 }
    let min = Number.POSITIVE_INFINITY
    let max = 0
    for (const item of payloadData) {
      const v = Number.isFinite(item.value) ? item.value : 0
      if (v < min) min = v
      if (v > max) max = v
    }
    if (!Number.isFinite(min)) min = 0
    return { minValue: min, maxValue: max }
  }, [payloadData])

  const currentAmountRange = amountFilter?.range ?? ([minValue, maxValue] as [number, number])
  const deferredAmountRange = useDeferredValue(currentAmountRange)

  // Apply range-based filtering to nodes
  const filteredData = useMemo(() => {
    if (!amountFilter) return payloadData

    // Check if range has been reset to full span (not user-modified)
    const isResetToFullSpan = currentAmountRange[0] === minValue && currentAmountRange[1] === maxValue
    if (isResetToFullSpan) return payloadData

    const [low, high] = deferredAmountRange
    return payloadData.filter((n) => {
      const v = Number.isFinite(n.value) ? n.value : 0
      return v >= low && v <= high
    })
  }, [amountFilter, currentAmountRange, deferredAmountRange, payloadData, minValue, maxValue])

  const totalValue = useMemo(
    () => filteredData.reduce((acc, curr) => acc + (Number.isFinite(curr.value) ? curr.value : 0), 0),
    [filteredData],
  )
  const totalMagnitudeValue = useMemo(
    () => filteredData.reduce((acc, curr) => acc + Math.abs(Number.isFinite(curr.value) ? curr.value : 0), 0),
    [filteredData],
  )
  const unit = getNormalizationUnit({ normalization: normalization ?? 'total', currency })

  // Memoize root object to prevent unnecessary re-renders
  const rootValue = useMemo(() => ({ value: totalMagnitudeValue }), [totalMagnitudeValue])
  const signedValueByCode = useMemo(
    () => new Map(filteredData.map((node) => [node.code, node.signedValue])),
    [filteredData],
  )

  const handleNodeClick = (event: unknown) => {
    const target = event as { code?: string; payload?: { code?: string } }
    const code = target?.code ?? target?.payload?.code ?? null
    startTransition(() => {
      onNodeClick?.(code ?? null)
    })
  }

  // Memoize content renderer to prevent unnecessary re-renders in Recharts
  const renderContent = useCallback((props: any) => {
    const codeFromPayload = props?.code ?? props?.payload?.code
    const signedValueFromPayload = Number.isFinite(props?.payload?.signedValue) ? props.payload.signedValue : undefined
    const signedValueFromMap = codeFromPayload ? signedValueByCode.get(codeFromPayload) : undefined
    return (
      <CustomizedContent
        {...props}
        key={(codeFromPayload) + '-' + (props?.payload?.name ?? props?.name ?? 'node')}
        fill={props?.payload?.fill ?? props.fill}
        root={rootValue}
        code={codeFromPayload}
        normalization={normalization}
        currency={currency}
        primary={primary}
        signedValue={signedValueFromPayload ?? signedValueFromMap}
        allowScaleAnimation={allowScaleAnimation}
      />
    )
  }, [rootValue, normalization, currency, primary, signedValueByCode, allowScaleAnimation])

  const memoizedTooltip = useMemo(() => (
    <CustomTooltip
      total={totalMagnitudeValue}
      primary={primary}
      normalization={normalization}
      currency={currency}
      signedValueByCode={signedValueByCode}
    />
  ), [totalMagnitudeValue, primary, normalization, currency, signedValueByCode])

  // On mobile, show only last 2 breadcrumb items
  const displayPath = isMobile && deferredPath.length > 2 ? deferredPath.slice(-2) : deferredPath
  const hasModifiedAmountRange = !!amountFilter
    && (currentAmountRange[0] > minValue || currentAmountRange[1] < maxValue)

  return (
    <div className="w-full space-y-0.75">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="overflow-x-auto max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-8rem)] md:max-w-[calc(100vw-12rem)]">
          <div className="flex items-center w-fit">
            <div
              onClick={() => onBreadcrumbClick?.(null)}
              className="group relative h-6 pl-4 pr-6 mr-1 flex items-center cursor-pointer transition-all duration-200"
            >
              <div
                className="absolute inset-0 bg-foreground transition-colors duration-200"
                style={{
                  clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 0 0)'
                }}
              />
              <span className="relative whitespace-nowrap text-sm font-medium text-background">
                <Trans>Main Categories</Trans>
              </span>
            </div>
            {isMobile && path.length > 2 && (
              <motion.div
                initial={allowScaleAnimation ? { opacity: 0, scale: 0.1 } : { opacity: 0, scale: 1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative h-6 pl-5 pr-6 mr-1 flex items-center -ml-[12px]"
              >
                <div
                  className="absolute inset-0 bg-foreground/70 border-y-2 rounded-md"
                  style={{
                    clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)'
                  }}
                />
                <span className="relative z-10 text-sm font-medium text-background/80">...</span>
              </motion.div>
            )}
            {displayPath.map((item, index) => {
              const key = `${item.code}-${item.label}`
              const actualIndex = isMobile && path.length > 2 ? path.length - 2 + index : index
              const isLastCrumb = actualIndex === (path.length - 1)
              const isClickable = !!item.code && /^[0-9.]+$/.test(item.code) && !isLastCrumb
              const isLast = index === displayPath.length - 1

              // Use the breadcrumb's originating type (pre/post pivot) to derive color.
              const crumbType = item.type ?? primary
              const itemColor = getColor(`${crumbType}-${item.code}`)

              return (
                <motion.div
                  key={key}
                  initial={allowScaleAnimation ? { opacity: 0, scale: 0.1 } : { opacity: 0, scale: 1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 }}
                  onClick={() => {
                    if (!isClickable) return
                    startTransition(() => {
                      onBreadcrumbClick?.(item.code, actualIndex)
                    })
                  }}
                  className={`group relative h-6 pl-5 pr-6 mr-1 flex items-center -ml-[12px] ${isClickable ? 'cursor-pointer' : 'cursor-default'
                    }`}
                >
                  <div
                    className={`absolute inset-0 transition-all duration-200 rounded-r-md`}
                    style={{
                      backgroundColor: itemColor,
                      clipPath: isLast
                        ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 12px 50%)'
                        : 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)'
                    }}
                  />
                  <span className="relative z-10 whitespace-nowrap text-sm font-medium text-background">
                    {isMobile && item.label && item.label.length > 20
                      ? `${item.label.slice(0, 20)}...`
                      : item.label ?? item.code}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {showViewDetails && (
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              <Trans>View Details</Trans>
            </Button>
          )}
        </div>
      </div>

      {(filteredData.length === 0) ? (
        <div className="relative h-[600px] w-full flex flex-col items-center justify-center gap-4 rounded-md border border-dashed border-muted-foreground/40 p-6">
          <p className="text-lg text-muted-foreground text-center">
            <Trans>No data within the selected range.</Trans>
          </p>
          {path.length > 0 && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => onBreadcrumbClick?.(null)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <Trans>Go to Main Categories</Trans>
            </Button>
          )}
          {hasModifiedAmountRange && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => amountFilter?.onChange([minValue, maxValue])}
            >
              <Trans>Reset amount filter</Trans>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="relative h-[600px] w-full">
            {path.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-6 sm:right-2 top-2 z-10 h-8 w-8 rounded-md bg-black text-white transition-colors"
                onClick={handleBackClick}
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <SafeResponsiveContainer width="100%" height="100%">
              <Treemap
                data={filteredData}
                dataKey="layoutValue"
                nameKey="name"
                isAnimationActive={false}
                onClick={handleNodeClick}
                content={renderContent}
              >
                {!isMobile && (
                  <Tooltip
                    animationEasing='ease-in-out'
                    animationDuration={500}
                    offset={50}
                    allowEscapeViewBox={{ x: false, y: false }}
                    wrapperStyle={{
                      // Keep wrapper visible to allow CSS fade on content
                      visibility: 'visible',
                      pointerEvents: 'none',
                      transition: 'transform 180ms ease-in-out',
                      willChange: 'transform',
                    }}
                    content={memoizedTooltip}
                  />
                )}
              </Treemap>
            </SafeResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="text-sm sm:text-xl font-semibold">
                <Trans>Total</Trans>: <span className="font-bold">{yValueFormatter(totalValue, unit, 'compact')}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-mono">{yValueFormatter(totalValue, unit, 'standard')}</span>
              </div>
            </div>
            {hasChartLink && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleViewAsChart} className="gap-2">
                  <LineChart className="w-4 h-4" />
                  <Trans>View as Chart</Trans>
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, total, primary, normalization, currency, signedValueByCode }: {
  active?: boolean,
  payload?: any[],
  total: number,
  primary: 'fn' | 'ec',
  normalization?: Normalization,
  currency?: Currency,
  signedValueByCode?: Map<string, number>,
}) => {
  const lastTooltipDataRef = useRef<Readonly<{
    name: string
    code: string
    fill: string
    value: number
  }> | null>(null)

  const isVisible = !!active && !!payload && payload.length > 0

  // Update ref when new valid data is available
  if (isVisible && payload?.[0]?.payload) {
    const payloadNode = payload[0].payload as TreemapNodePayload
    const payloadCode = payloadNode.code ?? ''
    const resolvedSignedValue = Number.isFinite(payloadNode.signedValue)
      ? payloadNode.signedValue
      : (payloadCode ? signedValueByCode?.get(payloadCode) : undefined) ?? payloadNode.value
    lastTooltipDataRef.current = {
      name: payloadNode.name,
      code: payloadCode,
      fill: payloadNode.fill,
      value: resolvedSignedValue,
    }
  }

  // Use current data if visible, otherwise fall back to cached data
  const data = isVisible ? (payload?.[0]?.payload as TreemapNodePayload) : lastTooltipDataRef.current
  const visiblePayloadNode = isVisible ? (payload?.[0]?.payload as TreemapNodePayload) : undefined
  const visiblePayloadCode = visiblePayloadNode?.code ?? ''
  const value = isVisible
    ? (
      Number.isFinite(visiblePayloadNode?.signedValue)
        ? visiblePayloadNode!.signedValue
        : (visiblePayloadCode ? signedValueByCode?.get(visiblePayloadCode) : undefined) ?? visiblePayloadNode?.value ?? 0
    )
    : (lastTooltipDataRef.current?.value ?? 0)
  const percentage = total > 0 ? (Math.abs(value) / total) * 100 : 0
  const unit = getNormalizationUnit({ normalization: normalization ?? 'total', currency })


  return (
    <div className="relative">
      <div
        className={
          `origin-center` +
          `transition-transform duration-300 ease-in-out ` +
          `${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1'}`
        }
      >
        <div className="bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg p-3 text-sm min-w-[250px] select-none">
          <div className="flex items-center gap-3 mb-2 w-full">
            <span
              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: data?.fill }}
            />
            <div className="max-w-[400px]">
              <p className="font-semibold text-foreground break-words whitespace-pre-wrap">{data?.name}</p>
              <p className="text-muted-foreground text-xs truncate">{primary}:{data?.code}</p>
            </div>
          </div>
          <hr className="my-2 border-border/30" />
          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-4">
              <span className="text-muted-foreground text-xs">Amount:</span>
              <div className="flex flex-col items-end">
                <span className="font-mono font-semibold text-sm">{yValueFormatter(value, unit, 'compact')}</span>
                <span className="font-mono text-xs text-muted-foreground">{yValueFormatter(value, unit, 'standard')}</span>
              </div>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-muted-foreground text-xs">Share:</span>
              <span className="font-mono font-semibold text-sm">{percentage.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

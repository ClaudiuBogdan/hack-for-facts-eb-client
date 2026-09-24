import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { ReactNode } from 'react'
import { statisticsTheme } from '../../lib/statistics-theme'

type Props = {
  /** What the number is („Ultima valoare", „minim"). */
  readonly label: string
  /** The number, already formatted. */
  readonly value: string
  /** The unit as a word, said once: on the latest value's tile only. */
  readonly unit?: string
  /** What the number belongs to — its period, its INS flag. */
  readonly caption?: ReactNode
  /**
   * A dot in the chart's line colour before the label: the latest value's
   * tile, tied to the haloed point the chart ends on.
   */
  readonly marked?: boolean
  readonly testId?: string
  readonly valueTestId?: string
}

/**
 * Whether a unit fits beside its number in the NARROWEST tile the band draws:
 * two abreast on a 375px phone, 118px of text — 375 less the page's and the
 * band's 16px gutters, the 8px gap, halved, less the tile's own 16px sides.
 * Per-character widths are the bundled face's at the tile's sizes (a digit at
 * 20px semibold, a letter at 14px), rounded up, with a few pixels spare.
 * „10 număr" and „1,9 %" fit; „123.456 număr" and „21.646.220 persoane" do
 * not, and a unit wrapped under its number made that one tile a line taller
 * than the rest. The estimate is per string, not per layout, so the loading
 * tile and the loaded one always agree.
 */
const NARROWEST_TILE_PX = 116
const VALUE_CHAR_PX = 12
const UNIT_CHAR_PX = 7.5
const UNIT_GAP_PX = 4

function unitFitsBeside(value: string, unit: string): boolean {
  return (
    value.length * VALUE_CHAR_PX + UNIT_GAP_PX + unit.length * UNIT_CHAR_PX <=
    NARROWEST_TILE_PX
  )
}

/**
 * One figure in the detail band's tiles: its name, its number, and what the
 * number belongs to. A `<dt>` with one or two `<dd>`s, so it must sit in a
 * `<dl>` (`statisticsTheme.factGrid`).
 *
 * One component for the three places a tile renders — the summary, the first
 * read's figure while the series fails, and the loading skeleton — so the
 * figure a reader sees while the series loads is laid out exactly as the one
 * that lands, and the band does not move under it.
 *
 * A unit that fits shares the number's line, with a literal space — adjacent
 * text nodes with none are spoken as „10număr". One that does not fit opens
 * the caption instead, so the tile still reads as one phrase: „21.646.220 /
 * persoane în 2026".
 */
export function FactTile({
  label,
  value,
  unit,
  caption,
  marked = false,
  testId,
  valueTestId,
}: Props) {
  const trimmedUnit = unit?.trim() ?? ''
  const unitInline = trimmedUnit !== '' && unitFitsBeside(value, trimmedUnit)
  const unitInCaption = trimmedUnit !== '' && !unitInline
  return (
    <div className={statisticsTheme.factTile} data-testid={testId}>
      <FactLabel label={label} marked={marked} />
      <dd className={statisticsTheme.factValue} data-testid={valueTestId}>
        <span>{value}</span>
        {unitInline ? (
          <>
            {' '}
            <span className={statisticsTheme.factUnit}>{trimmedUnit}</span>
          </>
        ) : null}
      </dd>
      {caption || unitInCaption ? (
        <dd className={statisticsTheme.factCaption}>
          {unitInCaption ? <span>{trimmedUnit}</span> : null}
          {caption}
        </dd>
      ) : null}
    </div>
  )
}

/**
 * A tile's name, capitalised on screen only: the words stay the lower-case
 * ones the chart's marks use („minim 5"). A flex item is a block, so
 * `first-letter` applies to it.
 */
export function FactLabel({
  label,
  marked = false,
}: {
  readonly label: string
  readonly marked?: boolean
}) {
  return (
    <dt className={statisticsTheme.factLabel}>
      {marked ? (
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-[hsl(var(--chart-sky))]"
        />
      ) : null}
      <span className="first-letter:uppercase">{label}</span>
    </dt>
  )
}

/** „în 2024", „în mai 2026" — the period a figure belongs to, as words. */
export function PeriodPhrase({ period }: { readonly period: string }) {
  return <Trans>în {period}</Trans>
}

/**
 * The latest value's tile: first of the four, marked with the chart's line
 * colour, its unit said here and nowhere else, and under it the period and —
 * when the cell carries one — the INS flag: a reader quoting the figure must
 * see that INS has not settled it.
 */
export function LatestValueTile({
  value,
  unit,
  period,
  valueStatus = null,
  testId,
  valueTestId,
}: {
  readonly value: string
  readonly unit: string
  /** Already formatted („2024", „mai 2026"). */
  readonly period: string | null
  readonly valueStatus?: string | null
  readonly testId?: string
  readonly valueTestId?: string
}) {
  return (
    <FactTile
      label={t`Ultima valoare`}
      value={value}
      unit={unit}
      marked
      testId={testId}
      valueTestId={valueTestId}
      caption={
        period || valueStatus ? (
          <>
            {period ? (
              <span>
                <PeriodPhrase period={period} />
              </span>
            ) : null}
            {valueStatus ? (
              <span className={statisticsTheme.provenanceChip}>
                <Trans>stare:</Trans> {valueStatus}
              </span>
            ) : null}
          </>
        ) : null
      }
    />
  )
}

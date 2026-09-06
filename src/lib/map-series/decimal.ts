import { Decimal } from 'decimal.js';

// Match budget arithmetic: 40 significant digits and half-even rounding.
// Existing numeric inputs retain their current precision (user decision).
export const MapDecimal = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN });
const DECIMAL_TEXT = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

export function readMapDecimal(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const text = String(value).trim();
  if (!DECIMAL_TEXT.test(text)) return undefined;
  const decimal = new MapDecimal(text);
  return decimal.isFinite() ? text : undefined;
}

export function compareMapDecimals(left: string, right: string | number): number {
  return new MapDecimal(left).comparedTo(right);
}

/** A sum is defined only when every member contributes a value. */
export function sumMapDecimals(values: readonly (string | undefined)[]): string | undefined {
  if (values.length === 0 || values.some(value => readMapDecimal(value) === undefined)) return undefined;
  return readMapDecimal(values.reduce<Decimal>((sum, value) => sum.plus(value!), new MapDecimal(0)).toString());
}

/** Use only at drawing boundaries, after arithmetic/comparison has finished. */
export function mapDecimalToRenderNumber(value: string | number | undefined): number | undefined {
  const text = readMapDecimal(value);
  if (text === undefined) return undefined;
  const number = new MapDecimal(text).toNumber();
  return Number.isFinite(number) ? number : undefined;
}

/** Match the map's floor/ceil percentile selection without rounding source values. */
export function getMapDecimalRange(values: Iterable<string | number | undefined>, lower = 0, upper = 100): { min: string; max: string } {
  const sorted = [...values].map(readMapDecimal).filter((value): value is string => value !== undefined).sort(compareMapDecimals);
  if (sorted.length === 0) return { min: '0', max: '0' };
  const lowIndex = Math.floor(Math.max(0, Math.min(100, lower)) / 100 * (sorted.length - 1));
  const highIndex = Math.ceil(Math.max(0, Math.min(100, upper)) / 100 * (sorted.length - 1));
  const min = sorted[lowIndex]!;
  const max = sorted[highIndex]!;
  return compareMapDecimals(min, max) === 0
    ? { min: sorted[0]!, max: sorted[sorted.length - 1]! }
    : { min, max };
}

export function normalizeMapDecimal(value: string | number, min: string | number, max: string | number): number {
  if (readMapDecimal(value) === undefined || readMapDecimal(min) === undefined || readMapDecimal(max) === undefined) return 0.5;
  if (new MapDecimal(max).lte(min)) return new MapDecimal(value).isZero() ? 0 : 0.5;
  const clamped = MapDecimal.max(min, MapDecimal.min(value, max));
  return clamped.minus(min).div(new MapDecimal(max).minus(min)).toNumber();
}

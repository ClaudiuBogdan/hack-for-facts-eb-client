import { formatCurrency, formatNumber } from "@/lib/utils";
import { Chart, defaultYearRange } from "@/schemas/charts";

// Re-export color utilities for backwards compatibility
// These are in a separate file to avoid circular dependencies with schemas/charts.ts
export { applyAlpha, generateRandomColor, getSeriesColor, hslToHex } from './color-utils';

export const getYearRangeText = (chart: Chart) => {
    const { yearRange } = chart.config;
    const startYear = yearRange?.start ?? defaultYearRange.start;
    const endYear = yearRange?.end ?? defaultYearRange.end;

    if (yearRange?.start && yearRange?.end && yearRange.start === yearRange.end) {
        return `${yearRange.start}`;
    }

    return `${startYear} - ${endYear}`;
}

export const unitFormatters: Record<string, (value: number, notation: 'standard' | 'compact') => string> = {
    '%': (value, notation) => `${formatNumber(value, notation)}%`,
    'RON': (value, notation) => formatCurrency(value, notation),
    'RON/pers.': (value, notation) => formatCurrency(value, notation) + '/pers.',
    'EUR': (value, notation) => formatCurrency(value, notation, 'EUR'),
    'EUR/capita': (value, notation) => formatCurrency(value, notation, 'EUR') + '/capita',
    'RON/capita': (value, notation) => formatCurrency(value, notation, 'RON') + '/capita',
    'USD': (value, notation) => formatCurrency(value, notation, 'USD'),
    'USD/capita': (value, notation) => formatCurrency(value, notation, 'USD') + '/capita',
};

type SupportedCurrency = 'RON' | 'EUR' | 'USD';

function parseCurrencyUnit(unit: string): { currency: SupportedCurrency; suffix: string } | null {
    const trimmedUnit = unit.trim();
    if (!trimmedUnit) return null;

    const supportedCurrencies: SupportedCurrency[] = ['RON', 'EUR', 'USD'];
    for (const currency of supportedCurrencies) {
        if (trimmedUnit === currency) return { currency, suffix: '' };
        if (!trimmedUnit.startsWith(currency)) continue;
        // Match "RON/capita", "RON (real 2024)", "RON/pers." etc.
        const afterCurrency = trimmedUnit.slice(currency.length);
        if (afterCurrency.length > 0 && /^[/\s(]/.test(afterCurrency)) {
            return {
                currency,
                suffix: afterCurrency.startsWith('(') ? ` ${afterCurrency}` : afterCurrency,
            };
        }
    }

    return null;
}

/**
 * Formats only the numeric part of a Y-axis tick (no unit suffix).
 * The unit should be displayed once via the YAxis label prop.
 */
export const yTickFormatter = (value: number, unit: string = '', notation: 'standard' | 'compact' = 'compact') => {
    if (unit.includes('%')) {
        return `${formatNumber(value, notation)}%`;
    }
    return formatNumber(value, notation);
};

export const yValueFormatter = (value: number, unit: string = '', notation: 'standard' | 'compact' = 'compact') => {
    const formatter = unitFormatters[unit];
    if (formatter) {
        return formatter(value, notation);
    }

    // Handle localized per-capita suffixes (e.g., "RON/locuitor") and other currency-based units
    // by falling back to currency formatting whenever the unit starts with a supported currency.
    const currencyUnit = parseCurrencyUnit(unit);
    if (currencyUnit) {
        return `${formatCurrency(value, notation, currencyUnit.currency)}${currencyUnit.suffix}`;
    }

    if (unit.includes('%')) {
        return `${formatNumber(value, notation)}${unit}`.trim();
    }
    return `${formatNumber(value, notation)} ${unit}`.trim();
};

import { describe, expect, it } from 'vitest';
import type { HeatmapUATDataPoint } from '@/schemas/heatmap';
import type { AnalyticsFilterType } from '@/schemas/charts';
import { createTooltipContent } from './utils';

const HOSTILE = '<img src=x onerror="alert(1)">';

function parse(html: string): HTMLElement {
  const element = document.createElement('div');
  element.innerHTML = html;
  return element;
}

describe('the default map tooltip', () => {
  it('shows the names a data point carries as text', () => {
    const point: HeatmapUATDataPoint = {
      uat_id: '1',
      uat_code: '1',
      uat_name: HOSTILE,
      siruta_code: '1',
      county_code: 'CJ',
      county_name: `${HOSTILE} county`,
      population: 1000,
      amount: 10,
      total_amount: 10000,
      per_capita_amount: 10,
    };
    const html = createTooltipContent(
      { natcode: '1', name: 'Cluj-Napoca', county: 'Cluj' },
      [point],
      'UAT',
      { account_category: 'ch' } as AnalyticsFilterType,
    );
    const tooltip = parse(html);

    expect(tooltip.querySelector('img')).toBeNull();
    expect(tooltip.textContent).toContain(HOSTILE);
    expect(tooltip.textContent).toContain(`${HOSTILE} county`);
  });

  it('shows a name from the map data as text', () => {
    const html = createTooltipContent(
      { natcode: '1', name: HOSTILE, county: 'Cluj' },
      [],
      'UAT',
      { account_category: 'ch' } as AnalyticsFilterType,
    );
    const tooltip = parse(html);

    expect(tooltip.querySelector('img')).toBeNull();
    expect(tooltip.textContent).toContain(HOSTILE);
  });

  it('shows a period from the address as text', () => {
    const html = createTooltipContent(
      { natcode: '1', name: 'Cluj-Napoca', county: 'Cluj' },
      [],
      'UAT',
      {
        account_category: 'ch',
        report_period: { type: 'YEAR', selection: { interval: { start: HOSTILE, end: HOSTILE } } },
      } as AnalyticsFilterType,
    );
    const tooltip = parse(html);

    expect(tooltip.querySelector('img')).toBeNull();
    expect(tooltip.textContent).toContain(`${HOSTILE} - ${HOSTILE}`);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@/test/test-utils';
import { InsSeriesConfigurationSchema } from '@/schemas/charts';
import { InsMapPeriodEditor } from './ins-map-period-editor';

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings[0],
  msg: (strings: TemplateStringsArray) => strings[0],
}));

it('clears the latest frequency when switching to an interval and leaves operation unset', async () => {
  const onChange = vi.fn();
  const series = InsSeriesConfigurationSchema.parse({
    type: 'ins-series',
    periodicity: 'MONTHLY',
  });
  render(
    <InsMapPeriodEditor
      series={series}
      onChange={onChange}
      allowedPeriodTypes={['YEAR', 'MONTH']}
      yearRange={{ start: 2020, end: 2025 }}
    />,
  );
  fireEvent.keyDown(
    screen.getByRole('combobox', { name: 'Reference period' }),
    { key: 'ArrowDown' },
  );
  fireEvent.click(await screen.findByRole('option', { name: 'Date interval' }));
  expect(onChange).toHaveBeenCalledWith({
    period: {
      type: 'YEAR',
      selection: { interval: { start: '2025', end: '2025' } },
    },
    periodicity: undefined,
    intervalOperation: undefined,
  });
});

describe('explicit interval operation', () => {
  it('offers sum, average and latest without selecting one implicitly', async () => {
    const onChange = vi.fn();
    const series = InsSeriesConfigurationSchema.parse({
      type: 'ins-series',
      period: {
        type: 'YEAR',
        selection: { interval: { start: '2020', end: '2021' } },
      },
    });
    render(
      <InsMapPeriodEditor
        series={series}
        onChange={onChange}
        allowedPeriodTypes={['YEAR']}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(
      screen.getByRole('combobox', { name: 'Interval operation' }),
      { key: 'ArrowDown' },
    );
    expect(
      await screen.findByRole('option', { name: 'Sum' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Latest observation' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Average' }));
    expect(onChange).toHaveBeenCalledWith({ intervalOperation: 'average' });
  });
});

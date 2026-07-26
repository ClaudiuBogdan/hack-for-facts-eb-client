export function normalizePnrrCui(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  const match = /^(?:RO)?([0-9]{2,10})$/.exec(normalized);
  return match?.[1] ?? null;
}

export function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

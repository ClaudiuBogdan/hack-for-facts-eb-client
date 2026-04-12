export function toDateInputValue(value: string | undefined): string {
  return value?.slice(0, 10) ?? "";
}

export function toUtcRangeBoundary(
  dateValue: string,
  boundary: "start" | "end",
): string | undefined {
  const trimmedValue = dateValue.trim();
  if (trimmedValue.length === 0) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return undefined;
  }

  return boundary === "start"
    ? `${trimmedValue}T00:00:00.000Z`
    : `${trimmedValue}T23:59:59.999Z`;
}

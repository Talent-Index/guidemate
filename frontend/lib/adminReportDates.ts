const TZ = "+03:00";

export function isoRangeFromDateInputs(fromDate?: string, toDate?: string): { from?: string; to?: string } {
  if (!fromDate && !toDate) return {};
  const from = fromDate ? `${fromDate}T00:00:00.000${TZ}` : undefined;
  const endDay = toDate || fromDate;
  const to = endDay ? `${endDay}T23:59:59.999${TZ}` : undefined;
  return { from, to };
}

export function reportPeriodLabel(fromDate?: string, toDate?: string): string {
  if (!fromDate && !toDate) return "All time";
  if (fromDate && toDate && fromDate !== toDate) return `${fromDate} → ${toDate}`;
  return fromDate || toDate || "All time";
}

/** Default date input value: today in EAT. */
export function todayDateInputValue(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
}

/** East Africa Time: matches Guidemate's primary market for daily reports. */
const TZ = "+03:00";

function applyRange<Q extends { gte: (c: string, v: string) => Q; lte: (c: string, v: string) => Q }>(
  query: Q,
  column: string,
  from?: string,
  to?: string
): Q {
  let q = query;
  if (from) q = q.gte(column, from);
  if (to) q = q.lte(column, to);
  return q;
}

export { applyRange as applyCreatedAtRange };

export function formatReportPeriodLabel(from?: string, to?: string): string {
  if (!from && !to) return "All time";
  const dayFrom = from?.slice(0, 10);
  const dayTo = to?.slice(0, 10);
  if (dayFrom && dayTo && dayFrom === dayTo) return dayFrom;
  if (dayFrom && dayTo) return `${dayFrom} → ${dayTo}`;
  if (dayFrom) return dayFrom;
  return to?.slice(0, 10) ?? "All time";
}

/** Convert YYYY-MM-DD bounds to inclusive EAT timestamps for API queries. */
export function isoRangeFromDateInputs(fromDate?: string, toDate?: string): { from?: string; to?: string } {
  if (!fromDate && !toDate) return {};
  const from = fromDate ? `${fromDate}T00:00:00.000${TZ}` : undefined;
  const endDay = toDate || fromDate;
  const to = endDay ? `${endDay}T23:59:59.999${TZ}` : undefined;
  return { from, to };
}

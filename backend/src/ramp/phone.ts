/** Normalize Kenyan mobile numbers to 254XXXXXXXXX for M-Pesa APIs. */
export function normalizeKenyaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7")) return `254${digits}`;
  return digits;
}

/** Format for Minisend APIs that accept local 07... style numbers. */
export function toLocalKenyaPhone(phone: string): string {
  const normalized = normalizeKenyaPhone(phone);
  if (normalized.startsWith("254")) return `0${normalized.slice(3)}`;
  return phone;
}

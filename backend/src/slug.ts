const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RESERVED = new Set([
  "new",
  "edit",
  "me",
  "admin",
  "explore",
  "guide",
  "guides",
  "e",
  "g",
  "auth",
  "book",
  "chat",
  "live",
  "settings",
  "dashboard",
]);

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

export function slugify(input: string, fallback = "item") {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  if (!slug || RESERVED.has(slug) || isUuid(slug)) return fallback;
  return slug;
}

export async function nextAvailableSlug(
  baseInput: string,
  isTaken: (candidate: string) => Promise<boolean>,
  fallback = "item"
) {
  const base = slugify(baseInput, fallback);
  for (let n = 1; n < 80; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`.slice(0, 70);
    if (!(await isTaken(candidate))) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

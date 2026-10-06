/** Public site origin (no trailing slash). Used for sitemap, OG URLs, and canonical links. */
export function siteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv && !/localhost|127\.0\.0\.1/.test(fromEnv)) return fromEnv;
  return "https://yourguidemate.top";
}

export const DEFAULT_OG_IMAGE_PATH = "/hero-beach.jpg";

/** 30-minute product demo for travel agencies and partners. */
export const CALENDLY_DEMO_URL = "https://calendly.com/immaculate-munde/30min";

export function absoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl()}${p}`;
}

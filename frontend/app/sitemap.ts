import type { MetadataRoute } from "next";
import { KENYA_DESTINATIONS } from "@/lib/kenyaDestinations";
import { siteUrl } from "@/lib/site";

const PUBLIC_PATHS = [
  "",
  "/for-travelers",
  "/become-a-guide",
  "/for-agencies",
  "/how-escrow-works",
  "/faq",
  "/destinations",
  "/explore",
  "/live",
  "/terms",
  "/privacy",
  "/accessibility",
  "/guide/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  const staticEntries = PUBLIC_PATHS.map((path) => ({
    url: path ? `${base}${path}` : base,
    lastModified: now,
    changeFrequency: (path === "" ? "weekly" : "monthly") as "weekly" | "monthly",
    priority: path === "" ? 1 : path === "/become-a-guide" || path === "/for-agencies" ? 0.9 : 0.7,
  }));
  const destinationEntries = KENYA_DESTINATIONS.map((d) => ({
    url: `${base}/destinations/${d.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));
  return [...staticEntries, ...destinationEntries];
}

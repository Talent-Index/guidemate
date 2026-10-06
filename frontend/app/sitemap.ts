import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const PUBLIC_PATHS = [
  "",
  "/for-travelers",
  "/become-a-guide",
  "/for-agencies",
  "/how-escrow-works",
  "/faq",
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
  return PUBLIC_PATHS.map((path) => ({
    url: path ? `${base}${path}` : base,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/become-a-guide" || path === "/for-agencies" ? 0.9 : 0.7,
  }));
}

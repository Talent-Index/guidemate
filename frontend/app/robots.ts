import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/guide/dashboard", "/auth/", "/chat", "/wallet", "/payments/"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}

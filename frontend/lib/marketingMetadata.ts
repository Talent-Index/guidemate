import type { Metadata } from "next";
import { absoluteUrl, DEFAULT_OG_IMAGE_PATH, siteUrl } from "@/lib/site";

export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(opts.path);
  const image = absoluteUrl(DEFAULT_OG_IMAGE_PATH);
  const fullTitle = opts.title.includes("Guidemate") ? opts.title : `${opts.title} · Guidemate`;

  return {
    title: fullTitle,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description: opts.description,
      url,
      siteName: "Guidemate",
      locale: "en_KE",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: "Guidemate live travel with local guides" }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: opts.description,
      images: [image],
    },
  };
}

export function rootSiteMetadata(): Metadata {
  const description =
    "A new world of local experiences you can trust. Watch guides live, book vetted trips in Kenya, and pay through escrow with same-day M-Pesa payouts.";
  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: "Guidemate",
      template: "%s · Guidemate",
    },
    description,
    applicationName: "Guidemate",
    openGraph: {
      title: "Guidemate",
      description,
      url: siteUrl(),
      siteName: "Guidemate",
      locale: "en_KE",
      type: "website",
      images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE_PATH), width: 1200, height: 630, alt: "Guidemate" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Guidemate",
      description,
      images: [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
    },
  };
}

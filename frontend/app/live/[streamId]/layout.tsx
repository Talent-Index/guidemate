import type { Metadata } from "next";

const DEFAULT_OG_IMAGE = "/hero-beach.jpg";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "http://localhost:4000").replace(
    /\/$/,
    ""
  );
}

function appBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv && !/localhost|127\.0\.0\.1/.test(fromEnv)) return fromEnv;
  return "https://guidemate.onrender.com";
}

async function fetchStreamMeta(streamIdOrSlug: string) {
  try {
    const res = await fetch(`${apiBase()}/api/streams/${encodeURIComponent(streamIdOrSlug)}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { stream?: { title: string; guideName: string; slug: string | null; id: string; priceUsdc: number; status: string } };
    return body.stream ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { streamId: string } }): Promise<Metadata> {
  const stream = await fetchStreamMeta(params.streamId);
  const appUrl = appBase();

  if (!stream) {
    return {
      title: "Live on Guidemate",
      openGraph: { images: [{ url: `${appUrl}${DEFAULT_OG_IMAGE}` }] },
    };
  }

  const path = stream.slug ? `/live/${encodeURIComponent(stream.slug)}` : `/live/${stream.id}`;
  const url = `${appUrl}${path}`;
  const priceLine = stream.priceUsdc > 0 ? ` · ${stream.priceUsdc} USDC ticket` : " · Free to watch";
  const description = `Watch “${stream.title}” with ${stream.guideName}${priceLine}. Join on Guidemate.`;

  return {
    title: `${stream.title} · Live`,
    description,
    openGraph: {
      title: stream.title,
      description,
      url,
      siteName: "Guidemate",
      type: "website",
      locale: "en_KE",
      images: [
        {
          url: `${appUrl}${DEFAULT_OG_IMAGE}`,
          width: 1200,
          height: 630,
          alt: stream.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: stream.title,
      description,
      images: [`${appUrl}${DEFAULT_OG_IMAGE}`],
    },
  };
}

export default function LiveStreamLayout({ children }: { children: React.ReactNode }) {
  return children;
}

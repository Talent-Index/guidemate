import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";
import { fetchPublicGuideProfile } from "@/lib/publicCatalog";
import { getGuideSharePath } from "@/lib/share";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ guideId: string }>;
}): Promise<Metadata> {
  const { guideId } = await params;
  const guide = await fetchPublicGuideProfile(guideId);
  if (!guide) {
    return { title: "Guide not found" };
  }

  const description =
    guide.bio?.trim() ||
    `Book live streams and in-person experiences with ${guide.fullName} on Guidemate.`;
  const path = getGuideSharePath(guide.id, guide.slug);
  const image = guide.avatarUrl ?? absoluteUrl("/hero-beach.jpg");

  return {
    title: `${guide.fullName} · Local guide`,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title: guide.fullName,
      description,
      url: absoluteUrl(path),
      type: "profile",
      images: [{ url: image, alt: guide.fullName }],
    },
    twitter: {
      card: "summary_large_image",
      title: guide.fullName,
      description,
      images: [image],
    },
  };
}

export default function GuideProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}

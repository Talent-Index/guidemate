import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";
import { experienceSummary, fetchPublicExperience } from "@/lib/publicCatalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}): Promise<Metadata> {
  const { experienceId } = await params;
  const bundle = await fetchPublicExperience(experienceId);
  if (!bundle) {
    return { title: "Experience not found" };
  }

  const { experience } = bundle;
  const description = experienceSummary(experience.description);
  const guideName = experience.guide?.full_name;
  const title = guideName ? `${experience.title} with ${guideName}` : experience.title;
  const path = experience.slug ? `/e/${experience.slug}` : `/experiences/${experience.id}`;
  const image = experience.image_url ?? absoluteUrl("/hero-beach.jpg");

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      type: "website",
      images: [{ url: image, alt: experience.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function ExperienceDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}

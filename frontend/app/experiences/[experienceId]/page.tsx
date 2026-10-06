import { notFound } from "next/navigation";
import { ExperienceDetailClient } from "@/components/experience/ExperienceDetailClient";
import { fetchPublicExperience } from "@/lib/publicCatalog";

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = await params;
  const bundle = await fetchPublicExperience(experienceId);
  if (!bundle) notFound();

  return <ExperienceDetailClient idOrSlug={experienceId} initial={bundle} />;
}

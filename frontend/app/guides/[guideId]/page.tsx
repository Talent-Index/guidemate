import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GuideProfileClient } from "@/components/guide/GuideProfileClient";
import { ProfilePageSkeleton } from "@/components/ui/Skeleton";
import { fetchPublicGuideProfile } from "@/lib/publicCatalog";

export default async function GuideProfilePage({ params }: { params: Promise<{ guideId: string }> }) {
  const { guideId } = await params;
  const guide = await fetchPublicGuideProfile(guideId);
  if (!guide) notFound();

  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <GuideProfileClient guideIdOrSlug={guideId} initialGuide={guide} />
    </Suspense>
  );
}

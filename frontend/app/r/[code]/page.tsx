import { redirect } from "next/navigation";

export default async function ReferralShortLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/become-a-guide?ref=${encodeURIComponent(code)}`);
}

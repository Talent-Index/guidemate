import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ApplyRedirectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") q.set(key, value);
    else if (Array.isArray(value)) value.forEach((v) => q.append(key, v));
  }
  const suffix = q.toString() ? `?${q.toString()}` : "";
  redirect(`/become-a-guide${suffix}`);
}

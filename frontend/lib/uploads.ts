import { createClient } from "@/lib/supabase/client";

export async function uploadExperiencePhoto(file: File, userId: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("experience-photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("experience-photos").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadGuideAvatar(file: File, userId: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/avatar-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("experience-photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("experience-photos").getPublicUrl(path);
  return data.publicUrl;
}

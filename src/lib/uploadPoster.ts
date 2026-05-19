import { supabase } from "@/lib/supabase";
import { getSupabaseErrorMessage } from "@/lib/db";

const BUCKET = "event-posters";

/**
 * Uploads image to Storage and returns a public URL.
 * Create a public bucket (or policies) named `event-posters` in Supabase.
 */
export async function uploadEventPoster(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const fileId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).substring(2);
  const path = `${userId}/${fileId}.${safeExt}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });

  if (upErr) throw new Error(getSupabaseErrorMessage(upErr));

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not get poster URL");
  return data.publicUrl;
}

import { supabase } from "@/lib/supabase";
import { getSupabaseErrorMessage } from "@/lib/db";

const BUCKET = "certificate-templates";

/**
 * Uploads certificate template image to Storage and returns a public URL.
 * Ensure a public bucket named `certificate-templates` exists in Supabase.
 */
export async function uploadCertificateTemplate(file: File, userId: string): Promise<{ publicUrl: string; path: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "png";
  const fileId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).substring(2);
  const path = `${userId}/${fileId}.${safeExt}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/png",
  });

  if (upErr) throw new Error(getSupabaseErrorMessage(upErr));

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not get certificate template URL");
  return { publicUrl: data.publicUrl, path };
}
